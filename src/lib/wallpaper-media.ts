import sharp from "sharp";
import { get, put } from "./storage";
import { remote, permittedUrl } from "./network";
import { validateImage } from "./images";
/** Reference photographs are fetched from Commons and cached on first use. */
export async function wallpaperMedia(
  w: Record<string, any>,
  thumbnail = false,
) {
  if (!w.remoteUrl) return get(thumbnail ? w.thumbKey : w.originalKey);
  const key = thumbnail ? w.thumbKey : w.originalKey;
  try {
    return await get(key);
  } catch {}
  const url = thumbnail ? w.remoteThumbnailUrl : w.remoteUrl;
  if (
    !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(
      permittedUrl(url).hostname,
    )
  )
    throw new Error("Invalid catalog image host");
  let source: Buffer;
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
    }
  } else source = await remote(url);
  const clean = await validateImage(source);
  const bytes = thumbnail
    ? await sharp(clean.bytes)
        .resize(1200, 1000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
    : clean.bytes;
  await put(key, bytes);
  return bytes;
}
