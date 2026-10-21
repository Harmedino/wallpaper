import sharp from "sharp";
import { db } from "./db";
import { remote } from "./network";
import { validateImage } from "./images";
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
  if (!canAutoPublish(c)) return false;
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
      category: /mountain|peak|forest/i.test(c.title)
        ? "Mountains and forests"
        : /ocean|beach|sea|coast/i.test(c.title)
          ? "Ocean and beaches"
          : "Nature and landscapes",
      tags: [
        "photography",
        ...c.title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean)
          .slice(0, 15),
      ],
      color: "green",
      width: clean.width,
      height: clean.height,
      originalKey,
      thumbKey,
      hash: clean.hash,
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
