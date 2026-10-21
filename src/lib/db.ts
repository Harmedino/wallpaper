import { MongoClient, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
const globalDb = globalThis as unknown as { mongo?: MongoClient };
export const mongo =
  globalDb.mongo ??
  new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wallpaper",
    { serverSelectionTimeoutMS: 5000 },
  );
globalDb.mongo = mongo;
export const database = mongo.db();
export type Row = Document & { id: string };
function filter(where: any = {}): any {
  const out: any = {};
  for (const [k, v] of Object.entries(where)) {
    if (k === "OR") {
      out.$or = (v as any[]).map(filter);
      continue;
    }
    if (k === "AND") {
      out.$and = (v as any[]).map(filter);
      continue;
    }
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v instanceof Date)
    ) {
      const ops: any = {};
      for (const [op, value] of Object.entries(v)) {
        if (op === "contains")
          ops.$regex = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        else if (op === "mode") ops.$options = "i";
        else if (op === "has") out[k] = value;
        else
          ops[
            {
              lt: "$lt",
              lte: "$lte",
              gt: "$gt",
              gte: "$gte",
              in: "$in",
              not: "$ne",
            }[op] || op
          ] = value;
      }
      if (Object.keys(ops).length) out[k] = ops;
    } else out[k] = v;
  }
  return out;
}
function model(name: string) {
  const c = database.collection<Row>(name);
  return {
    async create({ data }: any) {
      await mongo.connect();
      const now = new Date();
      const row = { id: randomUUID(), createdAt: now, updatedAt: now, ...data };
      await c.insertOne(row);
      return row as Row;
    },
    async findUnique({ where }: any) {
      await mongo.connect();
      return c.findOne(filter(where), { projection: { _id: 0 } });
    },
    async findUniqueOrThrow({ where }: any) {
      await mongo.connect();
      const row = await c.findOne(filter(where), { projection: { _id: 0 } });
      if (!row) throw new Error("Record not found");
      return row;
    },
    async findMany({ where = {}, orderBy, take = 100, skip = 0 }: any = {}) {
      await mongo.connect();
      let cursor = c.find(filter(where), { projection: { _id: 0 } });
      if (orderBy)
        cursor = cursor.sort(
          Object.fromEntries(
            Object.entries(orderBy).map(([k, v]) => [k, v === "desc" ? -1 : 1]),
          ) as any,
        );
      return cursor.skip(skip).limit(take).toArray();
    },
    async count({ where = {} }: any = {}) {
      await mongo.connect();
      return c.countDocuments(filter(where));
    },
    async update({ where, data }: any) {
      await mongo.connect();
      const set: any = { updatedAt: new Date() },
        inc: any = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "increment" in v)
          inc[k] = (v as any).increment;
        else set[k] = v;
      }
      const r = await c.findOneAndUpdate(
        filter(where),
        { $set: set, ...(Object.keys(inc).length ? { $inc: inc } : {}) },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!r) throw new Error("Record not found");
      return r;
    },
    async upsert({ where, create, update }: any) {
      await mongo.connect();
      const inc: any = {},
        set: any = {};
      for (const [k, v] of Object.entries(update)) {
        if (v && typeof v === "object" && "increment" in v)
          inc[k] = (v as any).increment;
        else set[k] = v;
      }
      const insert: any = {
        id: randomUUID(),
        createdAt: new Date(),
        ...create,
      };
      for (const k of [...Object.keys(inc), ...Object.keys(set)])
        delete insert[k];
      return c.findOneAndUpdate(
        filter(where),
        {
          $setOnInsert: insert,
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(inc).length ? { $inc: inc } : {}),
        },
        { upsert: true, returnDocument: "after", projection: { _id: 0 } },
      ) as Promise<Row>;
    },
    async delete({ where }: any) {
      await mongo.connect();
      return c.deleteOne(filter(where));
    },
    async deleteMany({ where }: any) {
      await mongo.connect();
      return c.deleteMany(filter(where));
    },
  };
}
export const db = {
  user: model("users"),
  wallpaper: model("wallpapers"),
  variant: model("variants"),
  cropVariant: model("cropVariants"),
  upload: model("uploads"),
  job: model("jobs"),
  source: model("sources"),
  candidate: model("candidates"),
  review: model("reviews"),
  download: model("downloads"),
  rateLimit: model("rateLimits"),
  report: model("reports"),
};
let indexReady: Promise<void> | undefined;
export function ensureIndexes() {
  if (!indexReady)
    indexReady = createIndexes().catch((e) => {
      indexReady = undefined;
      throw e;
    });
  return indexReady;
}
async function createIndexes() {
  await mongo.connect();
  await Promise.all([
    database
      .collection("wallpapers")
      .createIndex({ hash: 1 }, { unique: true }),
    database.collection("wallpapers").createIndex({ id: 1 }, { unique: true }),
    database
      .collection("wallpapers")
      .createIndex({ published: 1, category: 1, createdAt: -1 }),
    database
      .collection("wallpapers")
      .createIndex({ title: "text", tags: "text", category: "text" }),
    database
      .collection("candidates")
      .createIndex({ externalId: 1 }, { unique: true }),
    database.collection("jobs").createIndex({ status: 1, availableAt: 1 }),
    database.collection("uploads").createIndex({ ownerId: 1 }),
    database.collection("rateLimits").createIndex({ key: 1 }, { unique: true }),
    database
      .collection("rateLimits")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database
      .collection("variants")
      .createIndex(
        { wallpaperId: 1, width: 1, height: 1, format: 1 },
        { unique: true },
      ),
    database.collection("cropVariants").createIndex(
      {
        wallpaperId: 1,
        width: 1,
        height: 1,
        format: 1,
        cropX: 1,
        cropY: 1,
        sourceHash: 1,
      },
      { unique: true },
    ),
    database.collection("projects").createIndex({ id: 1 }, { unique: true }),
    database.collection("projects").createIndex({ ownerId: 1, updatedAt: -1 }),
    database
      .collection("projects")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("importRuns").createIndex({ id: 1 }, { unique: true }),
    database
      .collection("importRuns")
      .createIndex({ status: 1, lockedUntil: 1 }),
    database
      .collection("importItems")
      .createIndex({ runId: 1, candidateId: 1 }, { unique: true }),
    database
      .collection("importItems")
      .createIndex({ runId: 1, status: 1, availableAt: 1 }),
    database.collection("sources").createIndex({ id: 1 }, { unique: true }),
  ]);
}
