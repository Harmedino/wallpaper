"use client";
import { useState } from "react";
import { categories } from "@/lib/constants";
export function LicensedBatch() {
  const [files, setFiles] = useState<File[]>([]),
    [creator, setCreator] = useState(""),
    [license, setLicense] = useState("cc0"),
    [source, setSource] = useState(""),
    [category, setCategory] = useState("Football"),
    [progress, setProgress] = useState(""),
    [busy, setBusy] = useState(false);
  async function publish() {
    setBusy(true);
    let success = 0,
      failed = 0;
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${index + 1}/${files.length}: ${file.name}`);
        try {
          const body = new FormData();
          body.set("file", file);
          const uploaded = await fetch("/api/uploads", {
            method: "POST",
            body,
          });
          const upload = await uploaded.json();
          if (!uploaded.ok) throw new Error(upload.error);
          const licenseUrl =
            license === "cc0"
              ? "https://creativecommons.org/publicdomain/zero/1.0/"
              : license === "cc-by-4.0"
                ? "https://creativecommons.org/licenses/by/4.0/"
                : "https://creativecommons.org/licenses/by-sa/4.0/";
          const r = await fetch("/api/admin/publish-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId: upload.id,
              title: file.name.replace(/\.[^.]+$/, ""),
              creator,
              license,
              licenseUrl,
              sourceUrl: source,
              category,
            }),
          });
          const result = await r.json();
          if (!r.ok) throw new Error(result.error);
          success++;
        } catch (e) {
          failed++;
          setProgress(
            `${file.name}: ${e instanceof Error ? e.message : "Failed"}`,
          );
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setProgress(
        `${success} published, ${failed} failed or duplicate. Refresh dashboard for totals.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel mb-6">
      <h2 className="text-xl mb-3">Licensed image batch</h2>
      <p className="text-xs muted mb-4">
        Choose up to 20 images sharing the same source, creator and license.
        Include the appropriate publication and personality/trademark rights for
        football assets. Unclear rights belong in review.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="field">
          Batch images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files || []).slice(0, 20))
            }
          />
        </label>
        <label className="field">
          Creator
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </label>
        <label className="field">
          Source / rights reference URL
          <input
            type="url"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Shared license
          <select value={license} onChange={(e) => setLicense(e.target.value)}>
            <option value="cc0">CC0</option>
            <option value="cc-by-4.0">CC BY 4.0</option>
            <option value="cc-by-sa-4.0">CC BY-SA 4.0</option>
          </select>
        </label>
      </div>
      <button
        className="chip mt-4"
        disabled={
          busy || !files.length || !creator || !source.startsWith("https://")
        }
        onClick={publish}
      >
        Publish licensed batch ({files.length})
      </button>
      {progress && (
        <p role="status" className="text-xs mt-3">
          {progress}
        </p>
      )}
    </div>
  );
}
