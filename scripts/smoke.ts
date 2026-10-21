import "dotenv/config";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
async function request(path: string, options: RequestInit = {}) {
  return fetch(base + path, options);
}
async function visitor() {
  const r = await request("/api/session");
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie")!.split(";")[0];
}
const owner = await visitor(),
  other = await visitor();
const source = await sharp({
  create: { width: 800, height: 600, channels: 3, background: "#13ab99" },
})
  .png()
  .toBuffer();
const form = new FormData();
form.set("rights", "true");
form.set(
  "file",
  new Blob([new Uint8Array(source)], { type: "image/png" }),
  "test.png",
);
const up = await request("/api/uploads", {
  method: "POST",
  headers: { Cookie: owner },
  body: form,
});
assert.equal(up.status, 201, await up.clone().text());
const upload = await up.json();
assert.equal(
  (
    await request(`/api/uploads/${upload.id}/image`, {
      headers: { Cookie: other },
    })
  ).status,
  404,
  "other session must not access upload",
);
assert.equal(
  (await request("/api/admin")).status,
  401,
  "dashboard must require admin",
);
assert.equal(
  (
    await request("/api/admin/sources", {
      method: "POST",
      headers: { Cookie: owner, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "nasa",
        query: "earth",
        enabled: true,
        intervalHours: 24,
      }),
    })
  ).status,
  401,
);
assert.equal(
  (
    await request("/api/jobs", {
      method: "POST",
      headers: { Cookie: other, "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: upload.id,
        options: { width: 1920, height: 1080 },
      }),
    })
  ).status,
  404,
);
assert.equal(
  (
    await request("/api/jobs", {
      method: "POST",
      headers: {
        Cookie: owner,
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    })
  ).status,
  403,
);
const created = await request("/api/jobs", {
  method: "POST",
  headers: { Cookie: owner, "Content-Type": "application/json" },
  body: JSON.stringify({
    uploadId: upload.id,
    options: {
      width: 2160,
      height: 3840,
      format: "webp",
      x: 0,
      y: 1,
      ai: true,
    },
  }),
});
assert.equal(created.status, 201, await created.clone().text());
const job = await created.json();
assert.equal(
  (await request(`/api/jobs/${job.id}`, { headers: { Cookie: other } })).status,
  404,
);
let done: any;
for (let i = 0; i < 80; i++) {
  done = await (
    await request(`/api/jobs/${job.id}`, { headers: { Cookie: owner } })
  ).json();
  if (["completed", "failed"].includes(done.status)) break;
  await new Promise((r) => setTimeout(r, 500));
}
assert.equal(done.status, "completed", JSON.stringify(done));
assert.equal(done.progress, 100);
assert.match(done.aiStatus, /resized/);
const result = await request(`/api/jobs/${job.id}/result?download=1`, {
  headers: { Cookie: owner },
});
assert.equal(result.status, 200);
assert.match(result.headers.get("content-disposition")!, /attachment/);
assert.match(result.headers.get("cache-control")!, /private/);
const dimensions = await sharp(
  Buffer.from(await result.arrayBuffer()),
).metadata();
assert.equal(dimensions.width, 2160);
assert.equal(dimensions.height, 3840);
const gallery = await (await request("/api/wallpapers")).json();
assert.ok(gallery.total >= 9);
const w = gallery.items[0];
const dl = await request(
  `/api/wallpapers/${w.id}/download?width=1920&height=1080&format=png`,
  { headers: { Cookie: owner } },
);
assert.equal(dl.status, 200);
assert.match(dl.headers.get("content-disposition")!, /attachment/);
const dm = await sharp(Buffer.from(await dl.arrayBuffer())).metadata();
assert.equal(dm.width, 1920);
assert.equal(dm.height, 1080);
assert.equal(dm.format, "png");
assert.equal(dl.headers.get("x-wallpaper-license"), "cc0");
const attr = await request(`/api/wallpapers/${w.id}/attribution`);
assert.match(await attr.text(), /License: cc0/);
const d = await request("/api/uploads/" + upload.id, {
  method: "DELETE",
  headers: { Cookie: owner },
});
assert.equal(d.status, 200);
assert.equal(
  (await request(`/api/jobs/${job.id}/result`, { headers: { Cookie: owner } }))
    .status,
  404,
);
for (const p of [
  "/",
  "/explore",
  "/categories",
  "/trending",
  "/latest",
  `/wallpaper/${w.id}`,
  "/studio",
  "/uploads",
  "/admin",
  "/privacy",
  "/terms",
  "/copyright",
  "/sitemap.xml",
])
  assert.equal((await request(p)).status, 200, p);
console.log(
  "PASS: private upload isolation, admin authorization, CSRF, durable worker progress, honest AI fallback, exact portrait 4K result, PNG public download, attribution, deletion, and all 12 pages.",
);
