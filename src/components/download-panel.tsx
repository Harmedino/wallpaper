"use client";
import { useEffect, useState } from "react";
import { Download, Check, Info } from "lucide-react";
import { resolutions } from "@/lib/constants";
import { Button } from "./ui/button";
export function DownloadPanel({ id }: { id: string }) {
  const [index, setIndex] = useState(2);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const exact = resolutions.findIndex(
      (r) =>
        r.width === Number(q.get("width")) &&
        r.height === Number(q.get("height")),
    );
    if (exact >= 0) {
      setIndex(exact);
      return;
    }
    if (new URLSearchParams(window.location.search).get("device") === "ipad") {
      setIndex(8);
      return;
    }
    if (
      new URLSearchParams(window.location.search).get("orientation") ===
      "portrait"
    )
      setIndex(5);
  }, []);
  const [format, setFormat] = useState("jpg");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/wallpapers/${id}/download?width=${resolutions[index].width}&height=${resolutions[index].height}&format=${format}&x=${new URLSearchParams(location.search).get("x") || 0.5}&y=${new URLSearchParams(location.search).get("y") || 0.5}`,
      );
      if (!r.ok) throw new Error((await r.json()).error);
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = `wallspace-${resolutions[index].width}x${resolutions[index].height}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 30000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <h2 className="text-xl mb-6">A perfect fit for your screen.</h2>
      <div className="field mb-4">
        <label htmlFor="resolution">Choose your resolution</label>
        <select
          id="resolution"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {resolutions.map((r, i) => (
            <option key={i} value={i}>
              {r.label} · {r.width} × {r.height}
            </option>
          ))}
        </select>
      </div>
      <div className="field mb-6">
        <label htmlFor="format">File format</label>
        <select
          id="format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="jpg">JPG — best compatibility</option>
          <option value="png">PNG — lossless</option>
          <option value="webp">WebP — smaller file</option>
        </select>
      </div>
      <Button className="w-full" onClick={download} disabled={busy}>
        <Download size={17} />
        {busy ? "Preparing your wallpaper…" : "Download wallpaper"}
      </Button>
      {error && (
        <p role="alert" className="error mt-4">
          {error}
        </p>
      )}
      <p className="text-xs muted leading-6 mt-5 mb-0 flex gap-2">
        <Info size={20} />
        Downloads are cropped to fit. For a custom composition, use your own
        image in the Studio. Resizing adds pixels, not original detail.
      </p>
    </div>
  );
}
