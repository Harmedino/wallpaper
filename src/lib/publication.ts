import { watermarkCheck } from "./watermark-check";
import { perceptualHash, hamming } from "./image-fingerprint";
import { imageQuality } from "./quality";
import { database } from "./db";
import sharp from "sharp";
import { db } from "./db";
import { remote } from "./network";
import { render, validateImage } from "./images";
import { put } from "./storage";
import { allowedLicense, licenseUrl } from "./licenses";
export function canAutoPublish(c: any) {
  try {
    return (
      c.sourceId === "commons" &&
      new URL(c.imageUrl).hostname === "upload.wikimedia.org" &&
      new URL(c.sourceUrl).hostname === "commons.wikimedia.org" &&
      allowedLicense(c.license) &&
      !!licenseUrl(c.license) &&
      !!c.creator &&
      c.creator !== "Unknown" &&
      !c.metadata?.restrictions &&
      c.metadata?.credit?.toLowerCase().includes("own work") &&
      c.width * c.height <= 40_000_000
    );
  } catch {
    return false;
  }
}
export async function publishCandidate(c: any) {
  if (
    !canAutoPublish(c) ||
    c.metadata?.requiresRightsReview ||
    /watermark|copyright notice/i.test(
      c.title + " " + (c.metadata?.credit || ""),
    )
  )
    return false;
  if (await db.wallpaper.findUnique({ where: { sourceUrl: c.sourceUrl } })) {
    await db.candidate.update({
      where: { id: c.id },
      data: { status: "duplicate" },
    });
    return false;
  }
  const clean = await validateImage(await remote(c.imageUrl));
  if (await db.wallpaper.findUnique({ where: { hash: clean.hash } })) {
    await db.candidate.update({
      where: { id: c.id },
      data: { status: "duplicate" },
    });
    return false;
  }
  if (
    Math.max(clean.width, clean.height) < 1920 ||
    Math.min(clean.width, clean.height) < 1080
  ) {
    await db.candidate.update({
      where: { id: c.id },
      data: { status: "rejected", reason: "Below HD dimensions" },
    });
    return false;
  }
  const perceptual = await perceptualHash(clean.bytes);
  const comparable = await database
    .collection("wallpapers")
    .find(
      { published: true, perceptualHash: { $exists: true } },
      { projection: { id: 1, perceptualHash: 1, width: 1, height: 1 } },
    )
    .limit(20000)
    .toArray();
  const similar = comparable.find(
    (w) =>
      Math.abs(w.width / w.height - clean.width / clean.height) < 0.08 &&
      hamming(w.perceptualHash, perceptual) <= 3,
  );
  if (similar) {
    await db.candidate.update({
      where: { id: c.id },
      data: {
        status: "duplicate",
        reason: "Perceptually similar",
        duplicateOf: similar.id,
      },
    });
    return false;
  }
  const quality = await imageQuality(clean.bytes);
  const watermark = await watermarkCheck(clean.bytes);
  if (watermark.flagged) {
    await db.candidate.update({
      where: { id: c.id },
      data: {
        status: "pending",
        reason: "Possible watermark; manual review required",
        watermark,
      },
    });
    return false;
  }
  if (quality.detailScore < 1) {
    await db.candidate.update({
      where: { id: c.id },
      data: {
        status: "pending",
        reason: "Very low measured detail; manual quality review required",
        quality,
      },
    });
    return false;
  }

  const originalKey = `originals/${clean.hash}.webp`,
    thumbKey = `thumbs/${clean.hash}.webp`;
  await put(originalKey, clean.bytes);
  await put(
    thumbKey,
    await sharp(clean.bytes)
      .resize(1200, 900, { fit: "inside" })
      .webp()
      .toBuffer(),
  );
  await db.wallpaper.create({
    data: {
      title: c.title.replace(/\.[a-z0-9]{2,5}$/i, ""),
      category:
        c.category ||
        (/mountain|peak|forest/i.test(c.title)
          ? "Mountains and forests"
          : /ocean|beach|sea|coast/i.test(c.title)
            ? "Ocean and beaches"
            : "Nature and landscapes"),
      tags: [
        "photography",
        ...c.title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean)
          .slice(0, 15),
      ],
      color: quality.color,
      approvalRunId: c.importRunId,
      width: clean.width,
      height: clean.height,
      originalKey,
      thumbKey,
      hash: clean.hash,
      perceptualHash: perceptual,
      quality,
      watermark,
      verifiedAt: new Date(),
      verificationStatus: "file-verified",
      fileSize: clean.bytes.length,
      originalFormat: "webp",
      creator: c.creator,
      license: c.license,
      licenseUrl: licenseUrl(c.license),
      sourceUrl: c.sourceUrl,
      source: c.sourceId,
      aiStatus: "original",
      featured: false,
      published: true,
      downloads: 0,
    },
  });
  const published = await db.wallpaper.findUniqueOrThrow({
    where: { hash: clean.hash },
  });
  const target =
    clean.width >= clean.height
      ? { width: 1920, height: 1080 }
      : { width: 1080, height: 1920 };
  if (clean.width >= target.width && clean.height >= target.height) {
    const bytes = await render(clean.bytes, { ...target, format: "jpg" }),
      key = `variants/${published.id}/${target.width}x${target.height}.jpg`;
    await put(key, bytes, "image/jpeg");
    await db.variant.upsert({
      where: { wallpaperId: published.id, ...target, format: "jpg" },
      create: {
        wallpaperId: published.id,
        ...target,
        format: "jpg",
        key,
        qualityKind: "native-crop",
      },
      update: { key },
    });
  }
  await db.candidate.update({
    where: { id: c.id },
    data: { status: "approved" },
  });
  await db.review.create({
    data: {
      candidateId: c.id,
      reviewerId: "automatic-license-policy",
      decision: "approve",
      note: "Automatic Commons import: explicit reusable license, original creator, own-work credit and no stated restrictions.",
    },
  });
  return true;
}
