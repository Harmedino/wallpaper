import sharp from "sharp";
import { createHash } from "node:crypto";
import { database } from "./db";
import { get, put } from "./storage";
import { wallpaperMedia } from "./wallpaper-media";
import { render } from "./images";
import { fitImageOptions, fitScale, type WallpaperFit } from "./wallpaper-fit";
export async function fittedWallpaper(
  w: any,
  o: WallpaperFit,
  preview = false,
) {
  const source = await wallpaperMedia(w);
  const sm = await sharp(source, { limitInputPixels: 40_000_000 }).metadata();
  const sourceHash = createHash("sha256").update(source).digest("hex");
  const scale = preview
    ? Math.max(
        Math.min(1, 1100 / Math.max(o.width, o.height)),
        320 / Math.min(o.width, o.height),
      )
    : 1;
  const target = {
    ...o,
    width: Math.max(1, Math.round(o.width * scale)),
    height: Math.max(1, Math.round(o.height * scale)),
  };
  const options = fitImageOptions(target);
  const optionsHash = createHash("sha256")
    .update(JSON.stringify({ version: 2, ...options }))
    .digest("hex");
  const identity = { wallpaperId: w.id, sourceHash, optionsHash };
  const cached = await database.collection("fittedVariants").findOne(identity);
  let bytes: Buffer | undefined;
  if (cached) {
    try {
      bytes = await get(cached.key);
    } catch (e) {
      if (!["ENOENT", "NoSuchKey"].includes((e as any).code)) throw e;
    }
  }
  if (!bytes) {
    bytes = await render(source, options);
    const key = `fitted/${w.id}/${sourceHash.slice(0, 16)}-${optionsHash}.${o.format}`;
    await put(key, bytes, `image/${o.format === "jpg" ? "jpeg" : o.format}`);
    await database.collection("fittedVariants").updateOne(
      identity,
      {
        $set: {
          ...identity,
          key,
          width: target.width,
          height: target.height,
          format: o.format,
          fit: o.fit,
          verifiedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
  const meta = await sharp(bytes, { limitInputPixels: 16_000_000 }).metadata();
  if (
    meta.width !== target.width ||
    meta.height !== target.height ||
    meta.format !== (o.format === "jpg" ? "jpeg" : o.format)
  )
    throw Error("Generated image failed resolution or format verification.");
  await sharp(bytes, { limitInputPixels: 16_000_000 }).stats();
  return {
    bytes,
    width: meta.width,
    height: meta.height,
    sourceWidth: sm.width!,
    sourceHeight: sm.height!,
    format: o.format,
    processing:
      fitScale({ width: sm.width!, height: sm.height! }, o) > 1.001
        ? "Standard resize · no AI enhancement"
        : "Native source pixels · fitted to screen",
  };
}
