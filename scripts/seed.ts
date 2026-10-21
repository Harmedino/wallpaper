import "dotenv/config";
import { nextWeeklyRun } from "../src/lib/scheduling";
import { seedOriginalArt } from "../src/lib/starter-catalog";
import { db, ensureIndexes, mongo } from "../src/lib/db";
import { validateImage } from "../src/lib/images";
import { put } from "../src/lib/storage";
await ensureIndexes();
await seedOriginalArt();
for (const id of ["openverse", "commons", "nasa"])
  await db.source.upsert({
    where: { id },
    create: {
      id,
      enabled: id !== "openverse",
      schedule: "weekly",
      nextRunAt: nextWeeklyRun(),
      query: id === "nasa" ? "nebula" : "landscape",
      intervalHours: 168,
    },
    update: {},
  });
console.log(
  "Seeded 9 original CC0 artworks; Commons/NASA use the weekly schedule; Openverse is opt-in.",
);
await mongo.close();
