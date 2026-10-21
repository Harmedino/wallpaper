import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { render, optionsSchema } from "../src/lib/images";
import { resolutionAssessment } from "../src/lib/quality-client";
import { upscale } from "../src/lib/ai";
import { perceptualHash, hamming } from "../src/lib/image-fingerprint";
import { gallerySearch } from "../src/lib/search";
test("1000 × 1500 to portrait 4K needs 2.56× enlargement, native sources do not", () => {
  const source = { width: 1000, height: 1500 };
  const result = resolutionAssessment(source, { width: 2160, height: 3840 });
  assert.equal(result.needsUpscale, true);
  assert.equal(result.scale, 2.56);
  assert.equal(
    resolutionAssessment(
      { width: 6000, height: 4000 },
      { width: 3840, height: 2160 },
    ).native,
    true,
  );
});
test("unconfigured AI fails explicitly and never returns a resized success", async () => {
  const provider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "none";
  try {
    await assert.rejects(() => upscale(Buffer.from("test")), /not configured/);
  } finally {
    if (provider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = provider;
  }
});
test("multiple text layers, outlines, gradients, rotations and shapes render at export dimensions", async () => {
  const source = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#172338" },
  })
    .png()
    .toBuffer();
  const bounds: any[] = [];
  const image = await render(
    source,
    {
      width: 3840,
      height: 2160,
      format: "png",
      shapes: [
        {
          id: "star",
          kind: "star",
          x: 0.1,
          y: 0.7,
          width: 0.2,
          height: 0.2,
          color: "#ff0000",
          opacity: 0.8,
          rotation: 20,
        },
      ],
      textLayers: [
        {
          content: "NEVER GIVE UP",
          font: "anton",
          size: 0.12,
          x: 0.5,
          y: 0.15,
          outline: 0.003,
          outlineColor: "#000000",
          spacing: 0.002,
        },
        {
          content: "KEEP MOVING",
          font: "caveat",
          size: 0.08,
          x: 0.6,
          y: 0.8,
          opacity: 0.7,
          gradient: "#5eead4",
          rotation: -10,
        },
      ],
    },
    (b) => bounds.push(b),
  );
  const m = await sharp(image).metadata();
  assert.equal(m.width, 3840);
  assert.equal(m.height, 2160);
  assert.equal(bounds.length, 2);
  assert.ok(bounds[0].top < bounds[1].top);
  assert.ok((await sharp(image).stats()).channels[0].max > 240);
});
test("perceptual hash recognizes an image after lossless scaling", async () => {
  const source = await sharp("tests/fixtures/tiger.jpg").png().toBuffer(),
    scaled = await sharp(source).resize(900).png().toBuffer();
  assert.ok(
    hamming(await perceptualHash(source), await perceptualHash(scaled)) <= 3,
  );
});
test("search removes generic wallpaper words and retains meaningful named-player terms", () => {
  assert.deepEqual(gallerySearch("Ronaldo football wallpaper 4K").terms, [
    "ronaldo",
    "football",
  ]);
  assert.equal(gallerySearch("Black sports car wallpaper").color, "black");
  assert.equal(gallerySearch("minimalist iPhone lock screen").portrait, true);
});
test("8K is disabled unless explicitly enabled", () => {
  const previous = process.env.ENABLE_8K;
  process.env.ENABLE_8K = "false";
  try {
    assert.throws(() => optionsSchema.parse({ width: 7680, height: 4320 }));
  } finally {
    if (previous === undefined) delete process.env.ENABLE_8K;
    else process.env.ENABLE_8K = previous;
  }
});

test("football lighting and pitch effects change pixels without changing export dimensions", async () => {
  const input = await sharp({
    create: { width: 600, height: 900, channels: 3, background: "#121212" },
  })
    .png()
    .toBuffer();
  const base = await render(input, {
    width: 1080,
    height: 1920,
    format: "png",
  });
  const poster = await render(input, {
    width: 1080,
    height: 1920,
    format: "png",
    footballEffects: {
      lighting: 0.7,
      smoke: 0.4,
      glow: 0.8,
      primary: "#22ffaa",
      secondary: "#123466",
      pitch: true,
    },
  });
  assert.notDeepEqual(poster, base);
  const m = await sharp(poster).metadata();
  assert.equal(m.width, 1080);
  assert.equal(m.height, 1920);
});
