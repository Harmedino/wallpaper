import "dotenv/config";
import { database, ensureIndexes, mongo } from "../src/lib/db";
// MongoDB migration 001. Idempotent and additive: validates new writes and indexes
// existing collections without resetting data. Run before deploying app changes.
const schemas: Record<string, Record<string, unknown>> = {
  wallpapers: {
    bsonType: "object",
    required: [
      "id",
      "title",
      "category",
      "hash",
      "originalKey",
      "thumbKey",
      "creator",
      "license",
      "published",
      "width",
      "height",
    ],
    properties: {
      id: { bsonType: "string" },
      hash: { bsonType: "string" },
      width: { bsonType: "int", minimum: 1 },
      height: { bsonType: "int", minimum: 1 },
      published: { bsonType: "bool" },
      tags: { bsonType: "array", items: { bsonType: "string" } },
    },
  },
  uploads: {
    bsonType: "object",
    required: ["id", "ownerId", "key", "expiresAt"],
    properties: {
      expiresAt: { bsonType: "date" },
      ownerId: { bsonType: "string" },
    },
  },
  jobs: {
    bsonType: "object",
    required: ["id", "ownerId", "uploadId", "status", "options", "availableAt"],
    properties: {
      status: { enum: ["queued", "processing", "completed", "failed"] },
      progress: { bsonType: "int", minimum: 0, maximum: 100 },
      attempts: { bsonType: "int", minimum: 0 },
    },
  },
  candidates: {
    bsonType: "object",
    required: ["id", "externalId", "sourceId", "status", "imageUrl", "license"],
    properties: { status: { enum: ["pending", "approved", "rejected"] } },
  },
};
for (const [name, schema] of Object.entries(schemas)) {
  const exists = await database.listCollections({ name }).hasNext();
  if (!exists) await database.createCollection(name);
  await database.command({
    collMod: name,
    validator: { $jsonSchema: schema },
    validationLevel: "moderate",
  });
}
await ensureIndexes();
await database
  .collection("migrations")
  .updateOne(
    { version: "001" },
    { $setOnInsert: { version: "001", appliedAt: new Date() } },
    { upsert: true },
  );
console.log(
  "Migration 001: MongoDB collection validation and indexes applied.",
);
await mongo.close();
