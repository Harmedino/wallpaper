import sharp from "sharp";
import { createHash } from "node:crypto";
import { z } from "zod";
export const optionsSchema = z
  .object({
    width: z.number().int().min(320).max(5120),
    height: z.number().int().min(320).max(5120),
    format: z.enum(["jpg", "png", "webp"]).default("jpg"),
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
    brightness: z.number().min(0.5).max(1.5).default(1),
    saturation: z.number().min(0).max(2).default(1),
    contrast: z.number().min(0.5).max(1.5).default(1),
    sharpen: z.boolean().default(false),
    denoise: z.boolean().default(false),
    cinematic: z.boolean().default(false),
    ai: z.boolean().default(false),
  })
  .refine(
    (v) => v.width * v.height <= 16_000_000,
    "Maximum output is 16 megapixels",
  );
export type ImageOptions = z.infer<typeof optionsSchema>;
export async function validateImage(bytes: Buffer) {
  if (bytes.length > 20 * 1024 * 1024)
    throw new Error("Maximum upload is 20 MB");
  const meta = await sharp(bytes, {
    limitInputPixels: 40_000_000,
    animated: false,
  }).metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    !meta.width ||
    !meta.height ||
    (meta.pages || 1) > 1
  )
    throw new Error("Use a non-animated JPG, PNG or WebP image");
  if (meta.width < 128 || meta.height < 128)
    throw new Error("Image must be at least 128 × 128");
  const clean = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .webp({ quality: 95 })
    .toBuffer();
  const normalized = await sharp(clean).metadata();
  return {
    bytes: clean,
    width: normalized.width!,
    height: normalized.height!,
    hash: createHash("sha256").update(clean).digest("hex"),
  };
}
export async function render(bytes: Buffer, input: unknown) {
  const o = optionsSchema.parse(input);
  const m = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  const ratio = o.width / o.height;
  let w = m.width!,
    h = m.height!;
  if (w / h > ratio) w = Math.round(h * ratio);
  else h = Math.round(w / ratio);
  const left = Math.round((m.width! - w) * o.x),
    top = Math.round((m.height! - h) * o.y);
  let image = sharp(bytes, { limitInputPixels: 40_000_000 })
    .extract({ left, top, width: w, height: h })
    .resize(o.width, o.height, { kernel: "lanczos3" })
    .modulate({ brightness: o.brightness, saturation: o.saturation });
  if (o.denoise) image = image.median(3);
  if (o.sharpen) image = image.sharpen();
  if (o.contrast !== 1)
    image = image.linear(o.contrast, 128 * (1 - o.contrast));
  if (o.cinematic) image = image.tint({ r: 190, g: 205, b: 225 });
  return image
    .toFormat(o.format === "jpg" ? "jpeg" : o.format, { quality: 92 })
    .toBuffer();
}
