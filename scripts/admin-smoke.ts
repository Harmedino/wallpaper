import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sign } from "../src/lib/auth";
import { db, database, mongo } from "../src/lib/db";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const admin = await db.user.create({ data: { role: "admin" } });
const cookie = `wallpaper-session=${sign(admin.id, "admin")}`;
async function api(path: string, body?: unknown) {
  const r = await fetch(base + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
let uploadId: string | undefined, wallpaperId: string | undefined;
const externalId = "smoke:" + randomUUID();
try {
  const dashboard = await api("admin");
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.data.storageUsage.bytes > 0);
  assert.ok(dashboard.data.workerHeartbeat.at);
  assert.equal(
    (
      await api("admin/limits", {
        uploadMb: 100,
        outputMegapixels: 16,
        uploadsPerHour: 20,
        jobsPerHour: 20,
        retentionHours: 24,
      })
    ).status,
    400,
    "limits must enforce safe ceilings",
  );
  const candidate = await db.candidate.create({
    data: {
      externalId,
      sourceId: "commons",
      status: "pending",
      title: "Test-only incompatible rights",
      imageUrl: "https://upload.wikimedia.org/not-fetched",
      sourceUrl: "https://commons.wikimedia.org",
      creator: "Test",
      license: "cc-by-nc-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
      width: 3840,
      height: 2160,
      metadata: {},
    },
  });
  assert.equal(
    (
      await api("admin/review", {
        id: candidate.id,
        decision: "approve",
        note: "Test confirms noncommercial license is excluded.",
        rightsConfirmed: true,
        category: "Abstract",
      })
    ).status,
    400,
  );
  assert.equal(
    (await db.candidate.findUnique({ where: { id: candidate.id } }))?.status,
    "pending",
  );
  assert.equal(
    (
      await api("admin/review", {
        id: candidate.id,
        decision: "reject",
        note: "Noncommercial license is incompatible with redistribution policy.",
        rightsConfirmed: false,
        category: "Abstract",
      })
    ).status,
    200,
  );
  const form = new FormData();
  form.set("rights", "true");
  form.set(
    "file",
    new Blob(
      [
        new Uint8Array(
          await sharp({
            create: {
              width: 500,
              height: 400,
              channels: 3,
              background: "#" + randomUUID().replace(/-/g, "").slice(0, 6),
            },
          })
            .png()
            .toBuffer(),
        ),
      ],
      { type: "image/png" },
    ),
    "original.png",
  );
  const uploadResponse = await fetch(base + "/api/uploads", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  uploadId = (await uploadResponse.json()).id;
  const publish = {
    uploadId,
    title: "Smoke-test original (temporary)",
    category: "Abstract",
    creator: "Integration test",
    license: "cc0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    rightsConfirmed: true,
  };
  assert.equal((await api("admin/publish-upload", publish)).status, 200);
  assert.equal(
    (await api("admin/publish-upload", publish)).status,
    409,
    "duplicates must be rejected",
  );
  const w = await db.wallpaper.findUniqueOrThrow({
    where: { title: publish.title, creator: publish.creator },
  });
  wallpaperId = w.id;
  assert.equal(
    (
      await api("admin/wallpapers", {
        id: w.id,
        title: w.title,
        category: w.category,
        tags: ["test"],
        featured: false,
        published: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/wallpapers/${w.id}/download`)).status,
    404,
    "unpublished originals must be inaccessible",
  );
  const missing = await (await fetch(`${base}/wallpaper/${w.id}`)).text();
  assert.match(missing, /A different view awaits/);
  assert.doesNotMatch(missing, /Smoke-test original/);
  console.log(
    "PASS: authenticated dashboard, actual storage usage and heartbeat, safe configurable limits, incompatible-license rejection, review audit, original publication, duplicate prevention, and removal from public access.",
  );
} finally {
  if (wallpaperId) {
    const w = await db.wallpaper.findUnique({ where: { id: wallpaperId } });
    if (w) {
      const { remove } = await import("../src/lib/storage");
      await remove(w.originalKey);
      await remove(w.thumbKey);
    }
    await db.wallpaper.delete({ where: { id: wallpaperId } });
  }
  if (uploadId)
    await fetch(base + "/api/uploads/" + uploadId, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  const c = await db.candidate.findUnique({ where: { externalId } });
  if (c) await db.review.deleteMany({ where: { candidateId: c.id } });
  await db.candidate.deleteMany({ where: { externalId } });
  await db.user.delete({ where: { id: admin.id } });
  await mongo.close();
}
