import { createHash } from "node:crypto";
import { imageQuality } from "./quality";
import { database } from "./db";
import { perceptualHash } from "./image-fingerprint";
import sharp from "sharp";
import { get, put } from "./storage";
import { remote, permittedUrl } from "./network";
import { validateImage } from "./images";
/** Reference photographs are fetched from Commons and cached on first use. */
const inFlight = new Map<string, Promise<Buffer>>();
export async function wallpaperMedia(
  w: Record<string, any>,
  thumbnail = false,
) {
  const key = w.id + ":" + thumbnail;
  if (inFlight.has(key)) return inFlight.get(key)!;
  const pending = loadMedia(w, thumbnail).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}
async function loadMedia(w: Record<string, any>, thumbnail = false) {
  if (!w.remoteUrl) {
    const bytes = await get(thumbnail ? w.thumbKey : w.originalKey);
    if (!thumbnail && !w.verifiedAt) await verifyRecord(w, bytes);
    return bytes;
  }
  const key = thumbnail ? w.thumbKey : w.originalKey;
  try {
    const cached = await get(key);
    if (!thumbnail && !w.verifiedAt) await verifyRecord(w, cached);
    return cached;
  } catch (e) {
    if (
      !["ENOENT", "NoSuchKey", "NotFound"].includes(
        (e as any).code || (e as any).name,
      ) &&
      (e as any).$metadata?.httpStatusCode !== 404
    )
      throw e;
  }
  const url = thumbnail ? w.remoteThumbnailUrl : w.remoteUrl;
  if (
    !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(
      permittedUrl(url).hostname,
    )
  )
    throw new Error("Invalid catalog image host");
  let source: Buffer;
  let fullSource = !thumbnail;
  if (thumbnail) {
    const thumb = new URL(w.remoteUrl);
    const filename = thumb.pathname.split("/").at(-1)!;
    thumb.pathname =
      thumb.pathname.replace("/commons/", "/commons/thumb/") +
      "/960px-" +
      filename;
    thumb.search = "";
    try {
      source = await remote(thumb.href);
    } catch {
      source = await remote(url);
      fullSource = url === w.remoteUrl;
    }
  } else source = await remote(url);
  const clean = await validateImage(source);
  if (thumbnail && fullSource) {
    await put(w.originalKey, clean.bytes);
    await verifyRecord(w, clean.bytes);
  }
  const bytes = thumbnail
    ? await sharp(clean.bytes)
        .resize(1200, 1000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
    : clean.bytes;
  await put(key, bytes);
  if (!thumbnail) await verifyRecord(w, bytes);
  return bytes;
}

async function verifyRecord(w: Record<string, any>, bytes: Buffer) {
  const meta = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  const image = {
    bytes,
    width: meta.width!,
    height: meta.height!,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
  const quality = await imageQuality(image.bytes);
  await database.collection("wallpapers").updateOne(
    { id: w.id },
    {
      $set: {
        verifiedAt: new Date(),
        verificationStatus: "file-verified",
        actualHash: image.hash,
        perceptualHash: await perceptualHash(image.bytes),
        fileSize: bytes.length,
        width: image.width,
        height: image.height,
        originalFormat: meta.format,
        color: quality.color,
        quality,
      },
    },
  );
}
