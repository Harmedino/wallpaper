import { database } from "./db";
import { z } from "zod";
export const limitSchema = z.object({
  uploadMb: z.number().int().min(1).max(20),
  outputMegapixels: z.number().int().min(1).max(16),
  uploadsPerHour: z.number().int().min(1).max(100),
  jobsPerHour: z.number().int().min(1).max(100),
  retentionHours: z.number().int().min(1).max(168),
});
export async function limits() {
  const config = await database
    .collection("settings")
    .findOne({ key: "limits" });
  const configured = limitSchema.parse(
    config?.value || {
      uploadMb: 20,
      outputMegapixels: 16,
      uploadsPerHour: 20,
      jobsPerHour: 20,
      retentionHours: 24,
    },
  );
  return {
    ...configured,
    uploadMb: process.env.VERCEL
      ? Math.min(configured.uploadMb, 4)
      : configured.uploadMb,
  };
}
