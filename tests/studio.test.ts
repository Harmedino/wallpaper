import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { render, optionsSchema } from "../src/lib/images";
import { canAutoPublish } from "../src/lib/publication";
test("bundled fonts render real text and size controls affect exported pixels", async () => {
  const input = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "black" },
  })
    .png()
    .toBuffer();
  const pixels = [];
  for (const size of [0.04, 0.15]) {
    const output = await render(input, {
      width: 600,
      height: 600,
      format: "png",
      text: { content: "HELLO", font: "sans", size, shadow: false },
    });
    const raw = await sharp(output).removeAlpha().raw().toBuffer();
    pixels.push([...raw].filter((v) => v > 100).length);
  }
  assert.ok(pixels[0] > 0);
  assert.ok(pixels[1] > pixels[0] * 2, JSON.stringify(pixels));
  for (const font of ["serif", "mono"]) {
    const output = await render(input, {
      width: 600,
      height: 600,
      format: "webp",
      text: { content: "Hello <world> & friends", font, size: 0.08 },
    });
    assert.ok((await sharp(output).stats()).channels[0].max > 100);
  }
});
test("solid framing and rounded corners retain exact output size and background color", async () => {
  const input = await sharp({
    create: { width: 640, height: 320, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const output = await render(input, {
    width: 400,
    height: 800,
    format: "png",
    backgroundMode: "solid",
    backgroundColor: "#00ff00",
    padding: 0.1,
    radius: 0.2,
  });
  const meta = await sharp(output).metadata();
  assert.equal(meta.width, 400);
  assert.equal(meta.height, 800);
  const corner = await sharp(output)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.equal(corner[1], 255);
  assert.equal(corner[0], 0);
});
test("blurred backgrounds, transforms, vignette and long text all produce valid wallpapers", async () => {
  const input = await sharp({
    create: { width: 400, height: 600, channels: 3, background: "#345678" },
  })
    .png()
    .toBuffer();
  for (const mode of ["blur", "solid", "crop"]) {
    const output = await render(input, {
      width: 800,
      height: 400,
      format: "webp",
      backgroundMode: mode,
      rotation: 90,
      flip: true,
      flop: true,
      vignette: true,
      text: {
        content: "Create something beautiful. ".repeat(12),
        size: 0.2,
        font: "serif",
      },
    });
    assert.equal((await sharp(output).metadata()).width, 800);
  }
});
test("editing options reject invalid font, color, rotation and oversized text", () => {
  for (const value of [
    { text: { content: "a", font: "../../secret" } },
    { text: { content: "a".repeat(401) } },
    { backgroundColor: "url(http://localhost)" },
    { rotation: 45 },
  ])
    assert.equal(
      optionsSchema.safeParse({ width: 600, height: 600, ...value }).success,
      false,
    );
});
test("automatic photo publication requires unambiguous Commons provenance and reusable license", () => {
  const good = {
    sourceId: "commons",
    imageUrl: "https://upload.wikimedia.org/example.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    creator: "Photographer",
    license: "cc-by-sa-4.0",
    width: 3840,
    height: 2160,
    metadata: { credit: "Own work", restrictions: "" },
  };
  assert.equal(canAutoPublish(good), true);
  for (const delta of [
    { license: "cc-by-nc-4.0" },
    { sourceId: "nasa" },
    { creator: "Unknown" },
    { metadata: { credit: "Third-party work" } },
    { metadata: { credit: "Own work", restrictions: "Personality rights" } },
    { width: 20000, height: 20000 },
    { imageUrl: "https://unknown.example/image.jpg" },
  ])
    assert.ok(!canAutoPublish({ ...good, ...delta }));
});

test("illustrated backdrops keep the source photo and collage uses distinct images", async () => {
  const red = await sharp({
    create: { width: 500, height: 500, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: { width: 500, height: 500, channels: 3, background: "#0000ff" },
  })
    .png()
    .toBuffer();
  const framed = await render(red, {
    width: 800,
    height: 400,
    format: "png",
    backgroundMode: "art",
    backgroundTemplate: "mountains",
    padding: 0.15,
  });
  const pixel = async (bytes: Buffer, left: number, top: number) =>
    sharp(bytes)
      .extract({ left, top, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
  assert.equal((await pixel(framed, 400, 200))[0], 255);
  const backdrop = await pixel(framed, 0, 0);
  assert.notEqual(backdrop[1], 0);
  const collage = await render(
    red,
    { width: 800, height: 400, format: "png", grid: "duo", padding: 0.05 },
    undefined,
    [blue],
  );
  assert.deepEqual([...(await pixel(collage, 200, 200))], [255, 0, 0]);
  assert.deepEqual([...(await pixel(collage, 600, 200))], [0, 0, 255]);
});
test("every bundled font renders and reports bounds for direct canvas manipulation", async () => {
  const { textFonts } = await import("../src/lib/studio-presets");
  const input = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "black" },
  })
    .png()
    .toBuffer();
  for (const font of Object.keys(textFonts)) {
    let bounds:
      { left: number; top: number; width: number; height: number } | undefined;
    const output = await render(
      input,
      {
        width: 640,
        height: 360,
        text: { content: "Design freely", font, x: 0.8, y: 0.2, size: 0.1 },
      },
      (b) => {
        bounds = b;
      },
    );
    assert.ok(bounds && bounds.width > 0 && bounds.left + bounds.width <= 1);
    assert.ok((await sharp(output).stats()).channels[0].max > 100, font);
  }
});

test("bundled collection contains 500 distinct licensed high resolution real photographs", async () => {
  const { default: catalog } = await import("../src/lib/photo-catalog.json");
  assert.equal(catalog.length, 500);
  assert.equal(new Set(catalog.map((p) => p.externalId)).size, 500);
  assert.ok(new Set(catalog.map((p) => p.category)).size >= 7);
  for (const photo of catalog) {
    assert.ok(canAutoPublish(photo), photo.title);
    assert.ok(photo.width >= 1920 || photo.height >= 1920);
    assert.ok(Math.min(photo.width, photo.height) >= 1080);
  }
});
test("custom photographic background replaces transparent areas behind the cutout", async () => {
  const foreground = await sharp({
    create: { width: 400, height: 400, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 100, height: 200, channels: 4, background: "red" },
        })
          .png()
          .toBuffer(),
        left: 150,
        top: 100,
      },
    ])
    .png()
    .toBuffer();
  const replacement = await sharp({
    create: { width: 500, height: 300, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  const result = await render(
    foreground,
    {
      width: 640,
      height: 360,
      format: "png",
      backgroundMode: "art",
      backgroundPhotoId: "owned-background",
      padding: 0,
    },
    undefined,
    [replacement],
  );
  const pixel = async (left: number, top: number) => [
    ...(await sharp(result)
      .extract({ left, top, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer()),
  ];
  assert.deepEqual(await pixel(0, 0), [0, 0, 255]);
  assert.deepEqual(await pixel(320, 180), [255, 0, 0]);
});
