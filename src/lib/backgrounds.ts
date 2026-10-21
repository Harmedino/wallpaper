import sharp from "sharp";
import { backgroundSvg } from "./backgrounds-svg";
export async function createBackground(
  id: string,
  width = 1600,
  height = 1000,
) {
  return sharp(Buffer.from(backgroundSvg(id, width, height)))
    .webp()
    .toBuffer();
}
