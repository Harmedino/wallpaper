import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { database, mongo } from "../src/lib/db";
process.env.VERCEL = "1";
process.env.STORAGE_PROVIDER = "local";
process.env.STORAGE_DIR = "/var/task/.data/test-must-not-be-created";
const { storageProvider, put, get, remove, usage } =
  await import("../src/lib/storage");
const { limits } = await import("../src/lib/limits");
const key = `private/storage-test/${randomUUID()}.webp`;
try {
  await mongo.connect();
  assert.equal(storageProvider(), "mongodb");
  assert.ok((await limits()).uploadMb <= 4);
  const original = Buffer.from("GridFS original test bytes");
  await put(key, original);
  assert.deepEqual(await get(key), original);
  assert.equal(
    await database.collection("media.files").countDocuments({ filename: key }),
    1,
  );
  const replacement = Buffer.from("replacement bytes");
  await put(key, replacement);
  assert.deepEqual(await get(key), replacement);
  assert.equal(
    await database.collection("media.files").countDocuments({ filename: key }),
    1,
    "old versions must be removed",
  );
  // A persistent worker uses the same bucket without Vercel-specific environment.
  delete process.env.VERCEL;
  process.env.STORAGE_PROVIDER = "mongodb";
  assert.deepEqual(await get(key), replacement);
  const total = await usage();
  assert.ok(total.bytes >= replacement.length);
  await remove(key);
  await remove(key);
  await assert.rejects(get(key));
  console.log(
    "PASS: Vercel local-storage fallback to persistent GridFS, 4 MB upload cap, round-trip/overwrite/delete, byte usage and access from an external worker.",
  );
} finally {
  await remove(key);
  await mongo.close();
}
