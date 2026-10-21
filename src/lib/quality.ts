import sharp from "sharp";
export { resolutionAssessment } from "./quality-client";
export async function imageQuality(bytes: Buffer) {
  const m = await sharp(bytes).metadata();
  const small = await sharp(bytes)
    .resize(256, 256, { fit: "inside" })
    .grayscale()
    .raw()
    .toBuffer();
  const mean = small.reduce((a, b) => a + b, 0) / small.length;
  const edges = await sharp(bytes)
    .resize(256, 256, { fit: "inside" })
    .grayscale()
    .convolve({ width: 3, height: 3, kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] })
    .stats();
  const rgb = await sharp(bytes).resize(1, 1).removeAlpha().raw().toBuffer();
  const [r, g, b] = rgb;
  const color =
    Math.max(r, g, b) < 45
      ? "black"
      : Math.min(r, g, b) > 220
        ? "white"
        : r > g * 1.15 && b > g * 1.15
          ? "purple"
          : b > r * 1.1 && b > g * 0.95
            ? "blue"
            : r > g * 1.2 && r > b * 1.2
              ? "red"
              : r > g * 1.1 && g > b * 1.2
                ? "orange"
                : g > r * 0.95 && g > b * 1.05
                  ? "green"
                  : "gray";
  return {
    color,
    width: m.width!,
    height: m.height!,
    megapixels: Math.round((m.width! * m.height!) / 10000) / 100,
    exposure: mean < 35 ? "dark" : mean > 225 ? "bright" : "balanced",
    detailScore: Math.round(edges.channels[0].stdev),
    assessment:
      "Heuristic assessment; detail and sharpness are not guarantees of source quality.",
  };
}
