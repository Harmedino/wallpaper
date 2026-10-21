import { z } from "zod";
export const fitRequestSchema = z
  .object({
    width: z.number().int().min(320).max(7680),
    height: z.number().int().min(320).max(7680),
    format: z.enum(["jpg", "png", "webp"]).default("jpg"),
    fit: z.enum(["fit", "fill"]).default("fill"),
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
    zoom: z.number().min(1).max(4).default(1),
  })
  .refine(
    (o) => o.width * o.height <= 16_000_000,
    "Choose a resolution within the 16 megapixel output limit.",
  );
export type WallpaperFit = z.infer<typeof fitRequestSchema>;
export function fitImageOptions(o: WallpaperFit) {
  return {
    width: o.width,
    height: o.height,
    format: o.format,
    backgroundMode: o.fit === "fit" ? ("blur" as const) : ("crop" as const),
    padding: 0,
    x: o.fit === "fit" ? 0.5 : o.x,
    y: o.fit === "fit" ? 0.5 : o.y,
    zoom: o.fit === "fit" ? 1 : o.zoom,
    smartCrop: false,
  };
}
export function fitScale(
  source: { width: number; height: number },
  o: WallpaperFit,
) {
  return o.fit === "fit"
    ? Math.min(o.width / source.width, o.height / source.height)
    : Math.max(o.width / source.width, o.height / source.height) * o.zoom;
}
export function qualityLabel(w: {
  width: number;
  height: number;
  aiStatus?: string;
  verifiedAt?: unknown;
}) {
  const is4k =
    Math.min(w.width, w.height) >= 2160 && Math.max(w.width, w.height) >= 3840;
  return !w.verifiedAt
    ? "Source dimensions listed"
    : is4k
      ? /^AI-enhanced/i.test(w.aiStatus || "")
        ? "AI-upscaled 4K"
        : "Native 4K"
      : Math.min(w.width, w.height) >= 1080
        ? "HD source"
        : "Lower-resolution source";
}
export function imageFilename(
  title: string,
  width: number,
  height: number,
  format: string,
) {
  const safe = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45)
    .toLowerCase();
  return `wallspace-${safe || "wallpaper"}-${width}x${height}.${format}`;
}
