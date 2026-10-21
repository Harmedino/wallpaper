import "dotenv/config";
import sharp from "sharp";
import assert from "node:assert/strict";
import { upscale } from "../src/lib/ai";
import { render } from "../src/lib/images";
process.env.AI_PROVIDER = "local";
const source = await sharp("tests/fixtures/tiger.jpg")
  .resize(1000, 1500, { fit: "cover" })
  .png()
  .toBuffer();
const started = Date.now();
const enhanced = await upscale(source);
const intermediate = await sharp(enhanced.bytes).metadata();
assert.equal(intermediate.width, 4000);
assert.equal(intermediate.height, 6000);
for (const [width, height] of [
  [2160, 3840],
  [3840, 2160],
]) {
  const bytes = await render(enhanced.bytes, {
    width,
    height,
    format: "png",
    x: 0.7,
    y: 0.3,
  });
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  assert.equal(metadata.format, "png");
}
console.log(
  JSON.stringify({
    status: "PASS",
    provider: enhanced.status,
    input: "1000 × 1500",
    aiOutput: `${intermediate.width} × ${intermediate.height}`,
    verifiedExports: ["2160 × 3840", "3840 × 2160"],
    seconds: Math.round((Date.now() - started) / 1000),
  }),
);
