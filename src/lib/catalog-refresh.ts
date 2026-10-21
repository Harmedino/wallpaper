import { database, db } from "./db";
import { discover } from "./sources";
import { nextWeeklyRun } from "./scheduling";

export const collectionQueries = [
  "ocean coast",
  "forest landscape",
  "city skyline",
  "mountain landscape",
  "waterfall landscape",
  "desert landscape",
  "night sky landscape",
  "lake landscape",
];
const key = "photo-collection-v2";
export async function photoCollectionStatus() {
  const [count, state] = await Promise.all([
    database
      .collection("wallpapers")
      .countDocuments({ published: true, source: "commons" }),
    database.collection("settings").findOne({ _id: key as any }),
  ]);
  return {
    count,
    refreshing: count < 500 && (state?.cursor || 0) < collectionQueries.length,
  };
}
/** A bounded, leased batch continues on gallery visits, including after failed deployments. */
export async function replenishPhotoCollection() {
  await database
    .collection("settings")
    .updateOne(
      { _id: key as any },
      { $setOnInsert: { cursor: 0 } },
      { upsert: true },
    );
  const state = await database
    .collection("settings")
    .findOneAndUpdate(
      {
        _id: key as any,
        cursor: { $lt: collectionQueries.length },
        $or: [
          { lockedUntil: { $exists: false } },
          { lockedUntil: { $lt: new Date() } },
        ],
      },
      { $set: { lockedUntil: new Date(Date.now() + 180000) } },
      { returnDocument: "after" },
    );
  if (!state) return;
  try {
    if ((await photoCollectionStatus()).count >= 500) return;
    await db.source.upsert({
      where: { id: "commons" },
      create: {
        id: "commons",
        enabled: true,
        schedule: "weekly",
        intervalHours: 168,
        nextRunAt: nextWeeklyRun(),
        query: "landscape",
      },
      update: {},
    });
    await discover("commons", collectionQueries[state.cursor]);
    await database
      .collection("settings")
      .updateOne(
        { _id: key as any },
        { $inc: { cursor: 1 }, $unset: { lastError: "" } },
      );
  } catch (e) {
    console.error(
      "Collection refresh:",
      e instanceof Error ? e.message : "Import failed",
    );
    // Move to the next subject rather than leaving the gallery stuck on one failed query.
    await database
      .collection("settings")
      .updateOne(
        { _id: key as any },
        {
          $inc: { cursor: 1 },
          $set: { lastError: e instanceof Error ? e.message : "Import failed" },
        },
      );
  } finally {
    await database
      .collection("settings")
      .updateOne({ _id: key as any }, { $unset: { lockedUntil: "" } });
  }
}
