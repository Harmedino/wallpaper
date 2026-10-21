import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { render, validateImage, optionsSchema } from "../src/lib/images";
import { allowedLicense, attribution } from "../src/lib/licenses";
import { permittedUrl } from "../src/lib/network";
import { sign, verify } from "../src/lib/auth";
process.env.SESSION_SECRET =
  "test-only-secret-with-more-than-thirty-two-characters";
test("all output formats have exact 4K portrait and landscape dimensions", async () => {
  const source = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#48aa99" },
  })
    .png()
    .toBuffer();
  for (const format of ["jpg", "png", "webp"])
    for (const [width, height] of [
      [3840, 2160],
      [2160, 3840],
    ]) {
      const result = await render(source, { width, height, format });
      const m = await sharp(result).metadata();
      assert.equal(m.width, width);
      assert.equal(m.height, height);
      assert.equal(m.format, format === "jpg" ? "jpeg" : format);
    }
});
test("manual crop uses selected side without stretching", async () => {
  const a = await sharp({
    create: { width: 400, height: 400, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const b = await sharp({
    create: { width: 400, height: 400, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  const input = await sharp({
    create: { width: 800, height: 400, channels: 3, background: "white" },
  })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: 400, top: 0 },
    ])
    .png()
    .toBuffer();
  for (const [x, expected] of [
    [0, 0],
    [1, 2],
  ]) {
    const output = await render(input, {
      width: 400,
      height: 400,
      format: "png",
      x,
    });
    const pixel = await sharp(output)
      .extract({ left: 200, top: 200, width: 1, height: 1 })
      .raw()
      .toBuffer();
    assert.ok(pixel[expected] > 240);
  }
});
test("validation rejects bogus content, SVG and tiny images", async () => {
  await assert.rejects(validateImage(Buffer.from("not an image")));
  await assert.rejects(
    validateImage(
      Buffer.from(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"/>',
      ),
    ),
  );
  await assert.rejects(
    validateImage(
      await sharp({
        create: { width: 10, height: 10, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
    ),
  );
});
test("normalization strips EXIF and produces a stable duplicate fingerprint", async () => {
  const input = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "red" },
  })
    .withMetadata()
    .jpeg()
    .toBuffer();
  const a = await validateImage(input),
    b = await validateImage(input);
  assert.equal(a.hash, b.hash);
  assert.equal((await sharp(a.bytes).metadata()).exif, undefined);
});
test("output bounds prevent processing bombs", () => {
  for (const input of [
    { width: 0, height: 1080 },
    { width: 5120, height: 5120 },
    { width: 3840, height: 2160, x: 4 },
    { width: 3840, height: 2160, format: "svg" },
  ])
    assert.equal(optionsSchema.safeParse(input).success, false);
});
test("license policy admits commercial adaptation and rejects restrictions or ambiguous names", () => {
  for (const l of ["cc0", "pdm", "public-domain", "cc-by-4.0", "cc-by-sa-3.0"])
    assert.equal(allowedLicense(l), true, l);
  for (const l of [
    "cc-by-nc-4.0",
    "cc-by-nd-4.0",
    "unknown",
    "NASA",
    "copyright",
    "CC BY 4.0",
    "cc-by-4.0 garbage",
    "cc-by",
    "cc-by-9.9",
  ])
    assert.equal(allowedLicense(l), false, l);
  assert.match(
    attribution({
      title: "A",
      creator: "B",
      license: "cc-by-sa-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://example.com",
    }),
    /same ShareAlike license/,
  );
});
test("remote fetch allowlist rejects SSRF and credentials", () => {
  for (const u of [
    "http://upload.wikimedia.org/a.jpg",
    "https://127.0.0.1/a",
    "https://localhost/a",
    "https://evil.example/a",
    "https://user:pass@upload.wikimedia.org/a",
    "https://upload.wikimedia.org:8080/a",
  ])
    assert.throws(() => permittedUrl(u));
  assert.equal(
    permittedUrl("https://upload.wikimedia.org/a.jpg").hostname,
    "upload.wikimedia.org",
  );
});
test("signed sessions cannot be forged or changed to admin", () => {
  const token = sign("visitor-one", "visitor");
  assert.deepEqual(verify(token), { id: "visitor-one", role: "visitor" });
  const [data, sig] = token.split(".");
  const changed = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(data, "base64url").toString()),
      role: "admin",
    }),
  ).toString("base64url");
  assert.equal(verify(changed + "." + sig), null);
  assert.equal(verify("malformed"), null);
});
