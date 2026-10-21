import { randomUUID } from "node:crypto";
import { database, mongo, db } from "./db";
import { remoteJson } from "./network";
import { canAutoPublish, publishCandidate } from "./publication";
import { nextWeeklyRun } from "./scheduling";
const subjects = [
  ["Football", "football stadium"],
  ["Football", "soccer pitch"],
  ["Football", "soccer ball"],
  ["Football", "football stadium night"],
  ["Mountains and forests", "mountain landscape"],
  ["Nature and landscapes", "waterfall landscape"],
  ["Ocean and beaches", "tropical beach"],
  ["Animals", "wildlife"],
  ["Cities and skylines", "city skyline night"],
  ["Architecture", "architecture"],
  ["Cars and motorcycles", "sports car"],
  ["Supercars", "supercar"],
  ["Motorcycles", "motorcycle"],
  ["Space and galaxies", "Milky Way"],
  ["Nature and landscapes", "sunset landscape"],
  ["Nature and landscapes", "autumn forest"],
  ["Ocean and beaches", "ocean coast"],
  ["Sports", "basketball court"],
  ["Motorsport", "racing circuit"],
  ["Nature and landscapes", "snow landscape"],
  ["Architecture", "bridge"],
  ["Space and galaxies", "night sky stars"],
];
export async function createImportRun(kind = "manual", target = 1000) {
  await mongo.connect();
  const active = await database
    .collection("importRuns")
    .findOne({ status: { $in: ["queued", "running"] } });
  if (active) return active;
  const run = {
    id: randomUUID(),
    kind,
    target: Math.max(1, Math.min(1000, target)),
    status: "queued",
    imported: 0,
    rejected: 0,
    duplicates: 0,
    review: 0,
    failed: 0,
    discovered: 0,
    subject: 0,
    offset: 0,
    createdAt: new Date(),
    nextRequestAt: new Date(),
    requests: 0,
  };
  await database.collection("importRuns").insertOne(run);
  return run;
}
export async function ensureWeeklyImport(now = new Date()) {
  const state = await database
    .collection("settings")
    .findOne({ key: "weekly-import-target" });
  if (state?.enabled === false) return;
  if (state?.nextRunAt && state.nextRunAt > now) return;
  const run = await createImportRun("weekly", 1000);
  await database.collection("settings").updateOne(
    { key: "weekly-import-target" },
    {
      $set: {
        enabled: true,
        target: 1000,
        nextRunAt: nextWeeklyRun(now),
        lastRunId: run.id,
      },
    },
    { upsert: true },
  );
}
export async function processImportStep() {
  await mongo.connect();
  const lease = randomUUID(),
    now = new Date();
  const run = await database.collection("importRuns").findOneAndUpdate(
    {
      status: { $in: ["queued", "running"] },
      $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }],
    },
    {
      $set: {
        status: "running",
        lease,
        lockedUntil: new Date(Date.now() + 180000),
      },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  if (!run) return false;
  try {
    if (run.imported >= run.target) {
      await database.collection("importRuns").updateOne(
        { id: run.id, lease },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            shortfall: 0,
          },
        },
      );
      return true;
    }
    const item = await database.collection("importItems").findOneAndUpdate(
      {
        runId: run.id,
        $or: [
          { status: "queued", availableAt: { $lte: now } },
          {
            status: "processing",
            startedAt: { $lt: new Date(Date.now() - 180000) },
          },
        ],
      },
      { $set: { status: "processing", startedAt: now } },
      { returnDocument: "after" },
    );
    if (item) {
      try {
        const candidate = await db.candidate.findUniqueOrThrow({
          where: { id: item.candidateId },
        });
        let result = "review";
        if (candidate.status === "duplicate") result = "duplicates";
        else if (candidate.status === "approved") result = "duplicates";
        else if (
          canAutoPublish(candidate) &&
          !candidate.metadata?.requiresRightsReview
        ) {
          candidate.importRunId = run.id;
          const published = await publishCandidate(candidate);
          const updated = await db.candidate.findUniqueOrThrow({
            where: { id: candidate.id },
          });
          result = published
            ? "imported"
            : updated.status === "duplicate"
              ? "duplicates"
              : updated.status === "rejected"
                ? "rejected"
                : "review";
        }
        await database
          .collection("importItems")
          .updateOne(
            { _id: item._id },
            { $set: { status: result, completedAt: new Date() } },
          );
        await database
          .collection("importRuns")
          .updateOne(
            { id: run.id },
            { $inc: { [result]: 1 }, $set: { lastProgressAt: new Date() } },
          );
      } catch (e) {
        const attempts = (item.attempts || 0) + 1;
        await database.collection("importItems").updateOne(
          { _id: item._id },
          {
            $set: {
              status: attempts >= 3 ? "failed" : "queued",
              attempts,
              error: e instanceof Error ? e.message : "Import failed",
              availableAt: new Date(Date.now() + attempts * 60000),
            },
          },
        );
        if (attempts >= 3)
          await database
            .collection("importRuns")
            .updateOne({ id: run.id }, { $inc: { failed: 1 } });
      }
      return true;
    }
    const pending = await database.collection("importItems").countDocuments({
      runId: run.id,
      status: { $in: ["queued", "processing"] },
    });
    if (pending) return false;
    if (run.subject >= subjects.length) {
      await database.collection("importRuns").updateOne(
        { id: run.id },
        {
          $set: {
            status: "shortfall",
            completedAt: new Date(),
            shortfall: Math.max(0, run.target - run.imported),
          },
        },
      );
      return false;
    }
    if (run.nextRequestAt > now) return false;
    const [category, query] = subjects[run.subject];
    const data = await remoteJson(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=50&gsroffset=${run.offset}&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata`,
    );
    if (data.error) throw new Error(data.error.info || "Source API error");
    let added = 0;
    for (const page of Object.values(data.query?.pages || {}) as any[]) {
      const r = page.imageinfo?.[0];
      if (
        !r ||
        !r.url ||
        r.size > 20 * 1024 * 1024 ||
        !/\.(jpe?g|png|webp)$/i.test(new URL(r.url).pathname)
      )
        continue;
      const e = r.extmetadata || {},
        plain = (v = "") => v.replace(/<[^>]*>/g, "").slice(0, 1000);
      const externalId = `commons:${page.pageid}`;
      const row = {
        externalId,
        sourceId: "commons",
        title: plain(page.title.replace(/^File:/, "")),
        category,
        imageUrl: r.url,
        sourceUrl: r.descriptionurl,
        creator: plain(e.Artist?.value) || "Unknown",
        license: plain(e.LicenseShortName?.value)
          .toLowerCase()
          .replace(/ /g, "-"),
        width: r.width,
        height: r.height,
        metadata: {
          credit: plain(e.Credit?.value),
          restrictions: plain(e.Restrictions?.value),
          requiresRightsReview:
            !!e.PersonalityRights?.value ||
            !!e.Trademarked?.value ||
            /player|crest|logo|portrait/i.test(page.title),
        },
        status: "pending",
      };
      const candidate = await db.candidate.upsert({
        where: { externalId },
        create: row,
        update: {},
      });
      const exists = await db.wallpaper.findUnique({
        where: { sourceUrl: row.sourceUrl },
      });
      if (exists) {
        await database
          .collection("importRuns")
          .updateOne({ id: run.id }, { $inc: { duplicates: 1 } });
        continue;
      }
      if (
        r.width * r.height > 40_000_000 ||
        Math.min(r.width, r.height) < 1080
      ) {
        await db.candidate.update({
          where: { id: candidate.id },
          data: { status: "rejected", reason: "Resolution or pixel limit" },
        });
        await database
          .collection("importRuns")
          .updateOne({ id: run.id }, { $inc: { rejected: 1 } });
        continue;
      }
      await database.collection("importItems").updateOne(
        { runId: run.id, candidateId: candidate.id },
        {
          $setOnInsert: {
            id: randomUUID(),
            runId: run.id,
            candidateId: candidate.id,
            status: "queued",
            availableAt: new Date(),
            attempts: 0,
          },
        },
        { upsert: true },
      );
      added++;
    }
    const nextOffset = data.continue?.gsroffset;
    const advance = nextOffset === undefined || nextOffset >= 150;
    await database.collection("importRuns").updateOne(
      { id: run.id },
      {
        $inc: { discovered: added, requests: 1 },
        $set: {
          subject: advance ? run.subject + 1 : run.subject,
          offset: advance ? 0 : nextOffset,
          nextRequestAt: new Date(Date.now() + 10000),
          lastError: null,
        },
      },
    );
    return true;
  } catch (e) {
    await database.collection("importRuns").updateOne(
      { id: run.id },
      {
        $set: {
          lastError: e instanceof Error ? e.message : "Source failed",
          nextRequestAt: new Date(Date.now() + 60000),
        },
        $inc: { sourceFailures: 1 },
      },
    );
    return false;
  } finally {
    await database
      .collection("importRuns")
      .updateOne(
        { id: run.id, lease },
        { $unset: { lease: "", lockedUntil: "" } },
      );
  }
}
export async function importStatistics() {
  const week = new Date(Date.now() - 7 * 86400000);
  const [
    published,
    verified,
    weekly,
    duplicates,
    rejected,
    review,
    aiQueued,
    failures,
    runs,
  ] = await Promise.all([
    database.collection("wallpapers").countDocuments({ published: true }),
    database
      .collection("wallpapers")
      .countDocuments({ published: true, verifiedAt: { $exists: true } }),
    database
      .collection("wallpapers")
      .countDocuments({
        published: true,
        createdAt: { $gte: week },
        verifiedAt: { $exists: true },
      }),
    database.collection("candidates").countDocuments({ status: "duplicate" }),
    database.collection("candidates").countDocuments({ status: "rejected" }),
    database.collection("candidates").countDocuments({ status: "pending" }),
    database.collection("jobs").countDocuments({
      status: { $in: ["queued", "processing"] },
      "options.ai": true,
    }),
    database.collection("jobs").countDocuments({ status: "failed" }),
    database
      .collection("importRuns")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);
  return {
    published,
    verified,
    initialTarget: 1000,
    initialShortfall: Math.max(0, 1000 - verified),
    weekly,
    weeklyTarget: 1000,
    weeklyShortfall: Math.max(0, 1000 - weekly),
    duplicates,
    rejected,
    review,
    aiQueued,
    failures,
    runs,
    estimatedCost: null,
    costNote:
      "Provider usage billing must be read from your Replicate account; no invented estimate.",
  };
}
