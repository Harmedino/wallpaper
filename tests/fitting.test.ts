import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { render } from "../src/lib/images";
import {
  fitImageOptions,
  fitRequestSchema,
  fitScale,
  imageFilename,
} from "../src/lib/wallpaper-fit";
const source = () =>
  sharp(
    Buffer.from(
      '<svg width="2000" height="1000"><rect width="1000" height="1000" fill="red"/><rect x="1000" width="1000" height="1000" fill="blue"/><circle cx="1000" cy="500" r="200" fill="white"/></svg>',
    ),
  )
    .png()
    .toBuffer();
test("Fit preserves both landscape edges in a portrait export; Fill manually chooses a side", async () => {
  const bytes = await source();
  const base = {
    width: 1000,
    height: 2000,
    format: "png" as const,
    x: 0.5,
    y: 0.5,
    zoom: 1,
  };
  const fit = await render(bytes, fitImageOptions({ ...base, fit: "fit" }));
  const { data, info } = await sharp(fit)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) =>
    Array.from(
      data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3),
    );
  assert.deepEqual(pixel(50, 1000), [255, 0, 0]);
  assert.deepEqual(pixel(950, 1000), [0, 0, 255]);
  const white = (x: number, y: number) =>
    pixel(x, y).every((channel) => channel > 220);
  const horizontal = Array.from({ length: 400 }, (_, i) =>
    white(300 + i, 1000),
  ).filter(Boolean).length;
  const vertical = Array.from({ length: 400 }, (_, i) =>
    white(500, 800 + i),
  ).filter(Boolean).length;
  assert.ok(horizontal >= 195 && horizontal <= 205);
  assert.ok(
    Math.abs(horizontal - vertical) <= 2,
    "A circle must retain equal horizontal and vertical diameters",
  );
  for (const [x, color] of [
    [0, [255, 0, 0]],
    [1, [0, 0, 255]],
  ] as const) {
    const fill = await render(
      bytes,
      fitImageOptions({ ...base, fit: "fill", x }),
    );
    const raw = await sharp(fill).removeAlpha().raw().toBuffer();
    const center = (1000 * 1000 + 500) * 3;
    assert.deepEqual(Array.from(raw.subarray(center, center + 3)), color);
  }
});
test("every required desktop resolution and modern phone dimensions export valid real files", async () => {
  const bytes = await source();
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
    [5120, 2880],
    [3440, 1440],
    [1206, 2622],
    [1440, 3120],
    [1280, 2856],
  ]) {
    const options = fitRequestSchema.parse({
      width,
      height,
      fit: "fit",
      format: "jpg",
    });
    const out = await render(bytes, fitImageOptions(options));
    const m = await sharp(out).metadata();
    assert.equal(m.width, width);
    assert.equal(m.height, height);
    assert.equal(m.format, "jpeg");
    await sharp(out).stats();
  }
});
test("fitting validation and source assessment distinguish whole-image scaling from crop enlargement", () => {
  assert.equal(
    fitScale(
      { width: 2000, height: 1000 },
      fitRequestSchema.parse({ width: 1000, height: 2000, fit: "fit" }),
    ),
    0.5,
  );
  assert.equal(
    fitScale(
      { width: 2000, height: 1000 },
      fitRequestSchema.parse({ width: 1000, height: 2000, fit: "fill" }),
    ),
    2,
  );
  assert.equal(
    fitRequestSchema.safeParse({ width: 7680, height: 7680 }).success,
    false,
  );
  assert.equal(
    fitRequestSchema.safeParse({ width: 3840, height: 2160, fit: "expand" })
      .success,
    false,
  );
  assert.equal(
    imageFilename("Blue / hour!", 3840, 2160, "jpg"),
    "wallspace-blue-hour-3840x2160.jpg",
  );
});
