import "dotenv/config";
import {
  createImportRun,
  processImportStep,
  importStatistics,
} from "../src/lib/ingestion";
import { mongo, ensureIndexes } from "../src/lib/db";
await ensureIndexes();
const run = await createImportRun(
  process.argv.includes("--weekly") ? "weekly" : "manual",
  Number(process.env.IMPORT_TARGET || 1000),
);
const deadline =
  Date.now() + Number(process.env.IMPORT_MAX_MINUTES || 120) * 60000;
console.log("Import run", run.id, "target", run.target);
while (Date.now() < deadline) {
  await processImportStep();
  const stats = await importStatistics();
  const current = stats.runs.find((x) => x.id === run.id);
  if (!current || ["completed", "shortfall"].includes(current.status)) break;
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(JSON.stringify(await importStatistics(), null, 2));
await mongo.close();
