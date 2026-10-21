import { test } from "node:test";
import assert from "node:assert/strict";
import { nextWeeklyRun, nextDiscoveryRun } from "../src/lib/scheduling";
test("weekly discovery is Monday 09:00 Lagos / 08:00 UTC", () => {
  assert.equal(
    nextWeeklyRun(new Date("2026-10-21T12:00:00Z")).toISOString(),
    "2026-10-26T08:00:00.000Z",
  );
  assert.equal(
    nextWeeklyRun(new Date("2026-10-26T07:59:59Z")).toISOString(),
    "2026-10-26T08:00:00.000Z",
  );
  assert.equal(
    nextWeeklyRun(new Date("2026-10-26T08:00:00Z")).toISOString(),
    "2026-11-02T08:00:00.000Z",
  );
});
test("weekly rollover handles month, year and leap-year boundaries", () => {
  assert.equal(
    nextWeeklyRun(new Date("2026-12-31T23:59:59Z")).toISOString(),
    "2027-01-04T08:00:00.000Z",
  );
  assert.equal(
    nextWeeklyRun(new Date("2028-02-28T08:01:00Z")).toISOString(),
    "2028-03-06T08:00:00.000Z",
  );
});
test("custom intervals remain available without drifting the weekly calendar", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  assert.equal(
    nextDiscoveryRun(
      { schedule: "weekly", intervalHours: 168 },
      now,
    ).toISOString(),
    "2026-10-26T08:00:00.000Z",
  );
  assert.equal(
    nextDiscoveryRun(
      { schedule: "interval", intervalHours: 24 },
      now,
    ).toISOString(),
    "2026-10-26T12:00:00.000Z",
  );
});
