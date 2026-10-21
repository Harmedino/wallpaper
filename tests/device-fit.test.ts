import { test } from "node:test";
import assert from "node:assert/strict";
import { compatibleDevices } from "../src/lib/device-fit";
test("only devices with matching aspect ratio can preview a wallpaper", () => {
  assert.deepEqual(
    compatibleDevices({ width: 3840, height: 2160 }).map((d) => d.id),
    ["windows"],
  );
  assert.deepEqual(
    compatibleDevices({ width: 1440, height: 3120 }).map((d) => d.id),
    ["iphone-max", "android"],
  );
  assert.deepEqual(
    compatibleDevices({ width: 2732, height: 2048 }).map((d) => d.id),
    ["ipad"],
  );
  assert.equal(compatibleDevices({ width: 1000, height: 1000 }).length, 0);
  assert.equal(
    compatibleDevices({ width: 2160, height: 3840 }).some(
      (d) => d.group === "phone",
    ),
    false,
  );
  assert.equal(compatibleDevices({ width: 0, height: 100 }).length, 0);
});
test("matching is based on shape rather than source resolution", () => {
  assert.equal(
    compatibleDevices({ width: 1080, height: 2340 }).some(
      (d) => d.id === "android",
    ),
    true,
  );
  assert.equal(
    compatibleDevices({ width: 1920, height: 1080 })[0]?.id,
    "windows",
  );
});

test("quick templates safely render custom typography at portrait 4K", async () => {
  await import("../src/lib/images");
  const { quickTemplateSvg } = await import("../src/lib/quick-template");
  const sharp = (await import("sharp")).default;
  const svg = quickTemplateSvg({
    style: "stripes",
    primary: "#1144cc",
    secondary: "#060910",
    accent: "#f8cc75",
    name: "<NORTH & SOUTH>",
    badge: "NFC",
    number: "10",
    font: "anton",
    textScale: 1.2,
    spacing: 0.01,
    opacity: 0.75,
    width: 2160,
    height: 3840,
  });
  assert.ok(svg.includes("&lt;NORTH &amp; SOUTH&gt;"));
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
  const m = await sharp(image).metadata();
  assert.equal(m.width, 2160);
  assert.equal(m.height, 3840);
});
