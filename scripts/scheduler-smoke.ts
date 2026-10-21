import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { database, mongo } from "../src/lib/db";
import { runScheduledDiscovery } from "../src/lib/discovery-scheduler";
const id = "test-schedule-" + randomUUID(),
  failedId = id + "-failure";
const sources = database.collection("sources");
const now = new Date();
try {
  await sources.insertOne({
    id,
    enabled: true,
    schedule: "weekly",
    intervalHours: 168,
    query: "test",
    nextRunAt: new Date(now.getTime() - 1000),
  });
  let calls = 0;
  const discovery = async (source: string) => {
    assert.equal(source, id);
    calls++;
    await new Promise((r) => setTimeout(r, 80));
    return 0;
  };
  // Other live sources have future schedules; only the dedicated test source is due.
  await Promise.all([
    runScheduledDiscovery(now, discovery),
    runScheduledDiscovery(now, discovery),
  ]);
  assert.equal(
    calls,
    1,
    "concurrent workers must not duplicate scheduled discovery",
  );
  const after = await sources.findOne({ id });
  assert.ok(after?.nextRunAt > now);
  assert.equal(after?.nextRunAt.getUTCDay(), 1);
  assert.equal(after?.nextRunAt.getUTCHours(), 8);
  assert.equal(after?.discoveryLease, undefined);
  await runScheduledDiscovery(now, discovery);
  assert.equal(
    calls,
    1,
    "a completed source must not be fetched again immediately",
  );
  await sources.insertOne({
    id: failedId,
    enabled: true,
    schedule: "weekly",
    intervalHours: 168,
    query: "test",
    nextRunAt: new Date(now.getTime() - 1000),
  });
  await runScheduledDiscovery(now, async (source) => {
    assert.equal(source, failedId);
    throw new Error("Simulated provider outage");
  });
  const failure = await sources.findOne({ id: failedId });
  assert.match(failure?.lastError, /Simulated provider outage/);
  assert.ok(failure?.nextRunAt.getTime() >= now.getTime() + 6 * 3600000);
  assert.equal(failure?.discoveryLease, undefined);
  console.log(
    "PASS: weekly schedule claim, duplicate-worker exclusion, next-run persistence and six-hour provider-failure retry.",
  );
} finally {
  await sources.deleteMany({ id: { $in: [id, failedId] } });
  await mongo.close();
}
