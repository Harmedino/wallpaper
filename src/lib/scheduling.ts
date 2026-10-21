/** Weekly discovery: Monday 09:00 Africa/Lagos (UTC+1, no daylight saving). */
export function nextWeeklyRun(after = new Date()): Date {
  const next = new Date(after);
  next.setUTCHours(8, 0, 0, 0);
  const days = (1 - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + days);
  if (next.getTime() <= after.getTime()) next.setUTCDate(next.getUTCDate() + 7);
  return next;
}
export function nextDiscoveryRun(
  source: { schedule?: string; intervalHours: number },
  after = new Date(),
) {
  return source.schedule === "weekly"
    ? nextWeeklyRun(after)
    : new Date(after.getTime() + source.intervalHours * 3600000);
}
export const weeklyScheduleLabel = "Every Monday · 09:00 Africa/Lagos";
