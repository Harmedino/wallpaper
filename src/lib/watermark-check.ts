import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
export async function watermarkCheck(bytes: Buffer) {
  if (process.env.VERCEL)
    return {
      status: "not-run",
      flagged: false,
      note: "OCR requires the persistent ingestion worker; unclear images need administrator review.",
    };
  const folder = await mkdtemp(path.join(tmpdir(), "wallspace-ocr-"));
  try {
    const input = path.join(folder, "image.png");
    await writeFile(
      input,
      await sharp(bytes)
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer(),
    );
    const { stdout } = await promisify(execFile)(
      process.env.WATERMARK_OCR_COMMAND || "tesseract",
      [input, "stdout", "--psm", "11"],
      { timeout: 20000, maxBuffer: 100000 },
    );
    return {
      status: "ocr-checked",
      flagged:
        /watermark|copyright|all rights reserved|getty|shutterstock|alamy|www\.[a-z]|©/i.test(
          stdout,
        ),
      note: "OCR watermark screening is heuristic; uncertain rights or quality require manual review.",
    };
  } catch {
    return {
      status: "unavailable",
      flagged: false,
      note: "OCR not installed; metadata screening only, manual quality review available.",
    };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
