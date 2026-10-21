import sharp from "sharp";
import { backgrounds } from "./studio-presets";
export async function createBackground(
  id: string,
  width = 1600,
  height = 1000,
) {
  const palette = backgrounds.find((b) => b.id === id);
  if (!palette) throw new Error("Unknown background");
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${palette.a}"/><stop offset="1" stop-color="${palette.b}"/></linearGradient><radialGradient id="r"><stop stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><ellipse cx="${width * 0.7}" cy="${height * 0.25}" rx="${width * 0.65}" ry="${height * 0.9}" fill="url(#r)"/></svg>`,
    ),
  )
    .webp()
    .toBuffer();
}
