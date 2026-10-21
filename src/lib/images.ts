import { mkdir } from "node:fs/promises";
import path from "node:path";
import { textFonts } from "./studio-presets";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { z } from "zod";
process.env.FONTCONFIG_FILE ||= path.join(
  process.cwd(),
  "public/fonts/fonts.conf",
);
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
    backgroundMode: z.enum(["crop", "blur", "solid"]).default("crop"),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#101a20"),
    padding: z.number().min(0).max(0.2).default(0.06),
    radius: z.number().min(0).max(0.25).default(0),
    rotation: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
      .default(0),
    flip: z.boolean().default(false),
    flop: z.boolean().default(false),
    vignette: z.boolean().default(false),
    text: z
      .object({
        content: z.string().max(400),
        font: z.enum(["sans", "serif", "mono"]).default("sans"),
        size: z.number().min(0.02).max(0.2).default(0.06),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#ffffff"),
        x: z.number().min(0).max(1).default(0.5),
        y: z.number().min(0).max(1).default(0.5),
        align: z.enum(["left", "center", "right"]).default("center"),
        shadow: z.boolean().default(true),
      })
      .optional(),
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
  let original = bytes;
  if (o.rotation || o.flip || o.flop) {
    let rotated = sharp(bytes).rotate(o.rotation);
    if (o.flip) rotated = rotated.flip();
    if (o.flop) rotated = rotated.flop();
    original = await rotated.png().toBuffer();
  }
  const m = await sharp(original).metadata();
  const ratio = o.width / o.height;
  let w = m.width!,
    h = m.height!;
  if (w / h > ratio) w = Math.round(h * ratio);
  else h = Math.round(w / ratio);
  const left = Math.round((m.width! - w) * o.x),
    top = Math.round((m.height! - h) * o.y);
  let image = sharp(original, { limitInputPixels: 40_000_000 })
    .extract({ left, top, width: w, height: h })
    .resize(o.width, o.height);
  if (o.backgroundMode !== "crop") {
    const inset = Math.round(Math.min(o.width, o.height) * o.padding);
    let foreground = await sharp(original)
      .resize(o.width - inset * 2, o.height - inset * 2, { fit: "inside" })
      .ensureAlpha()
      .png()
      .toBuffer();
    const f = await sharp(foreground).metadata();
    if (o.radius > 0) {
      const r = Math.round(Math.min(f.width!, f.height!) * o.radius);
      const mask = Buffer.from(
        `<svg width="${f.width}" height="${f.height}"><rect width="100%" height="100%" rx="${r}" fill="white"/></svg>`,
      );
      foreground = await sharp(foreground)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
    }
    image =
      o.backgroundMode === "blur"
        ? sharp(original).resize(o.width, o.height, { fit: "cover" }).blur(30)
        : sharp({
            create: {
              width: o.width,
              height: o.height,
              channels: 4,
              background: o.backgroundColor,
            },
          });
    image = image.composite([{ input: foreground, gravity: "centre" }]);
    // Composite before applying finishing controls so all layers share the look.
    image = sharp(await image.png().toBuffer());
  }
  image = image.modulate({
    brightness: o.brightness,
    saturation: o.saturation,
  });
  if (o.denoise) image = image.median(3);
  if (o.sharpen) image = image.sharpen();
  if (o.contrast !== 1)
    image = image.linear(o.contrast, 128 * (1 - o.contrast));
  if (o.cinematic) image = image.tint({ r: 190, g: 205, b: 225 });
  const layers: Array<{ input: Buffer; left?: number; top?: number }> = [];
  if (o.vignette)
    layers.push({
      input: Buffer.from(
        `<svg width="${o.width}" height="${o.height}"><defs><radialGradient id="v"><stop offset=".4" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity=".7"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`,
      ),
    });
  if (o.text?.content.trim()) {
    await mkdir("/tmp/wallspace-font-cache", { recursive: true });
    const t = o.text;
    const escape = (v: string) =>
      v
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    const fontsize = Math.max(
      12,
      Math.round(
        Math.min(
          Math.min(o.width, o.height) * t.size,
          Math.sqrt(
            (o.width * o.height * 0.35) / Math.max(t.content.length, 1),
          ),
        ),
      ),
    );
    let lettering = await sharp({
      text: {
        text: `<span foreground="${t.color}">${escape(t.content)}</span>`,
        font: `${t.font === "serif" ? "DejaVu Serif" : t.font === "mono" ? "DejaVu Sans Mono" : "DejaVu Sans"} ${fontsize}`,
        fontfile: path.join(
          process.cwd(),
          "public",
          "fonts",
          textFonts[t.font].file,
        ),
        width: Math.round(o.width * 0.84),
        wrap: "word-char",
        dpi: 72,
        align: t.align === "center" ? "centre" : t.align,
        rgba: true,
      },
    })
      .png()
      .toBuffer();
    lettering = await sharp(lettering)
      .resize({
        width: Math.floor(o.width * 0.9),
        height: Math.floor(o.height * 0.9),
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    const tm = await sharp(lettering).metadata();
    const tx = Math.round((o.width - tm.width!) * t.x),
      ty = Math.round((o.height - tm.height!) * t.y);
    if (t.shadow) {
      const shadow = await sharp(lettering)
        .recomb([
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ])
        .blur(3)
        .png()
        .toBuffer();
      layers.push({
        input: shadow,
        left: Math.min(tx + 3, o.width - tm.width!),
        top: Math.min(ty + 3, o.height - tm.height!),
      });
    }
    layers.push({ input: lettering, left: tx, top: ty });
  }
  if (layers.length) image = image.composite(layers);
  return image
    .toFormat(o.format === "jpg" ? "jpeg" : o.format, { quality: 92 })
    .toBuffer();
}
