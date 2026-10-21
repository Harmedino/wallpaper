import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import net from "node:net";
import sharp from "sharp";
const reservation = net.createServer();
await new Promise<void>((r) => reservation.listen(0, "127.0.0.1", r));
const port = (reservation.address() as net.AddressInfo).port;
await new Promise<void>((r) => reservation.close(() => r()));
const base = `http://127.0.0.1:${port}`,
  secret = randomBytes(32).toString("hex");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      VERCEL: "1",
      STORAGE_PROVIDER: "local",
      STORAGE_DIR: "/var/task/.data/must-not-be-created",
      APP_URL: base,
      CRON_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
for (const stream of [child.stdout, child.stderr])
  stream?.on("data", (chunk) => {
    output = (output + chunk).slice(-3000);
  });
let cookie = "",
  uploadId = "";
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(base + "/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, "Test web server did not become ready: " + output);
  const gallery = await (await fetch(base + "/api/wallpapers")).json();
  assert.ok(gallery.total >= 500);
  const originals = await (
    await fetch(
      base + "/api/wallpapers?q=" + encodeURIComponent('"Aurora silk"'),
    )
  ).json();
  const starter = originals.items.find(
    (w: any) => w.source === "original procedural artwork",
  );
  assert.ok(starter);
  const thumbnail = await fetch(
    `${base}/api/wallpapers/${starter.id}/thumbnail`,
  );
  assert.equal(
    thumbnail.status,
    200,
    "starter image must exist in production storage, not only the database",
  );
  const cap = await (await fetch(base + "/api/capabilities")).json();
  assert.equal(cap.limits.uploadMb, 4);
  const s = await fetch(base + "/api/session");
  cookie = s.headers.get("set-cookie")!.split(";")[0];
  const image = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#5eead4" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(image)], { type: "image/png" }),
    "test.png",
  );
  const up = await fetch(base + "/api/uploads", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  assert.equal(up.status, 201, await up.clone().text());
  uploadId = (await up.json()).id;
  const original = await fetch(`${base}/api/uploads/${uploadId}/image`, {
    headers: { Cookie: cookie },
  });
  assert.equal(original.status, 200);
  assert.match(original.headers.get("cache-control")!, /private/);
  const dimensions = await sharp(
    Buffer.from(await original.arrayBuffer()),
  ).metadata();
  assert.equal(dimensions.width, 400);
  assert.equal(dimensions.height, 300);
  assert.equal(
    (await fetch(`${base}/api/uploads/${uploadId}/image`)).status,
    404,
  );
  const created = await fetch(base + "/api/jobs", {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      options: {
        width: 1080,
        height: 1920,
        format: "webp",
        ai: false,
        backgroundMode: "blur",
        text: { content: "STAY CURIOUS", font: "serif", size: 0.08 },
      },
    }),
  });
  assert.equal(created.status, 201, await created.clone().text());
  const job = await created.json();
  let completed: any;
  for (let i = 0; i < 80; i++) {
    completed = await (
      await fetch(`${base}/api/jobs/${job.id}`, { headers: { Cookie: cookie } })
    ).json();
    if (["completed", "failed"].includes(completed.status)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.equal(completed.status, "completed", JSON.stringify(completed));
  assert.equal(completed.progress, 100);
  assert.match(completed.aiStatus, /resized/);
  const result = await fetch(`${base}/api/jobs/${job.id}/result?download=1`, {
    headers: { Cookie: cookie },
  });
  assert.equal(result.status, 200);
  const resultMeta = await sharp(
    Buffer.from(await result.arrayBuffer()),
  ).metadata();
  assert.equal(resultMeta.width, 1080);
  assert.equal(resultMeta.height, 1920);
  assert.equal((await fetch(`${base}/api/jobs/${job.id}/result`)).status, 404);
  for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"])
    assert.equal((await fetch(base + path)).status, 200, path);
  const ico = Buffer.from(
    await (await fetch(base + "/favicon.ico")).arrayBuffer(),
  );
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  const icon = await (await fetch(base + "/icon.svg")).text();
  assert.match(icon, /#5eead4/);
  assert.equal((await fetch(base + "/api/cron/discovery")).status, 401);
  assert.equal(
    (
      await fetch(base + "/api/cron/discovery", {
        headers: { Authorization: "Bearer wrong" },
      })
    ).status,
    401,
  );
  const cron = await fetch(base + "/api/cron/discovery", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  assert.equal(cron.status, 200, await cron.clone().text());
  assert.equal(
    (await cron.json()).runs,
    0,
    "sources are not due before Monday",
  );
  console.log(
    "PASS: real HTTP upload/private download with Vercel runtime flags and read-only application storage, 4 MB limit, post-response conversion without a worker, all favicon assets, and authenticated cron endpoint.",
  );
} finally {
  if (uploadId)
    await fetch(`${base}/api/uploads/${uploadId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    }).catch(() => {});
  child.kill("SIGTERM");
  await new Promise<void>((r) => {
    if (child.exitCode !== null) return r();
    child.once("exit", () => r());
  });
}
