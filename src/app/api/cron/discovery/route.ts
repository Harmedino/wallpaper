import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database, mongo } from "@/lib/db";
import { runScheduledDiscovery } from "@/lib/discovery-scheduler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Configure CRON_SECRET to enable scheduled discovery." },
      { status: 503 },
    );
  const expected = Buffer.from(`Bearer ${secret}`),
    received = Buffer.from(req.headers.get("authorization") || "");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await mongo.connect();
    // First deployment may not yet have seeded source settings. First cron fills
    // that gap, then each subsequent run follows the Monday calendar schedule.
    const now = new Date();
    for (const id of ["commons", "nasa", "openverse"])
      await database.collection("sources").updateOne(
        { id },
        {
          $setOnInsert: {
            id,
            enabled: id !== "openverse",
            schedule: "weekly",
            intervalHours: 168,
            query: id === "nasa" ? "nebula" : "landscape",
            nextRunAt: now,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    const runs = await runScheduledDiscovery();
    return NextResponse.json({
      ok: true,
      runs,
      message:
        "Discovery completed. Eligible Commons originals publish automatically; unclear rights remain unpublished.",
    });
  } catch (e) {
    console.error(
      "Scheduled discovery:",
      e instanceof Error ? e.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Discovery failed. Check database access and source status." },
      { status: 503 },
    );
  }
}
