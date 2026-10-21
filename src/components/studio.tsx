"use client";
import { useEffect, useState, useRef } from "react";
import {
  UploadCloud,
  Sparkles,
  Download,
  ShieldCheck,
  ImagePlus,
  Check,
  Monitor,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { resolutions } from "@/lib/constants";
import { Button } from "./ui/button";
type Upload = { id: string; width: number; height: number };
type Job = {
  id: string;
  status: string;
  progress: number;
  error?: string;
  aiStatus?: string;
  options?: { width: number; height: number; x: number; y: number };
};
export function Studio() {
  const [caps, setCaps] = useState({
    uploadMb: 20,
    outputMegapixels: 16,
    retentionHours: 24,
  });
  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((d) => {
        if (d.limits) setCaps(d.limits);
      })
      .catch(() => {});
  }, []);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [rights, setRights] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [index, setIndex] = useState(2);
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [format, setFormat] = useState("jpg");
  const [ai, setAi] = useState(false);
  const [sharpen, setSharpen] = useState(false);
  const [denoise, setDenoise] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [brightness, setBrightness] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [compare, setCompare] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = custom ? { width, height } : resolutions[index];
  async function choose(file?: File) {
    if (!file) return;
    if (!rights) {
      setError("Confirm that you have the rights to process this image first.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > caps.uploadMb * 1024 * 1024
    ) {
      setError(`Choose a JPG, PNG or WebP under ${caps.uploadMb} MB.`);
      return;
    }
    setError("");
    setBusy(true);
    setJob(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("rights", "true");
      const r = await fetch("/api/uploads", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUpload(d);
      setX(0.5);
      setY(0.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function processImage() {
    if (!upload) return;
    setError("");
    setBusy(true);
    setJob(null);
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: upload.id,
          options: {
            ...target,
            format,
            ai,
            x,
            y,
            brightness,
            saturation,
            contrast,
            sharpen,
            denoise,
            cinematic,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setJob({ id: d.id, status: "queued", progress: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.status)) return;
    let active = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${job.id}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) setJob(d);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to check progress");
      }
    }, 1800);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [job?.id, job?.status]);
  const resultOptions = job?.options || { ...target, x, y };
  const processing = job && ["queued", "processing"].includes(job.status);
  return (
    <div className="shell pt-14">
      <div className="text-center mb-12">
        <p className="eyebrow">A LITTLE CREATIVITY. A WHOLE NEW VIEW.</p>
        <h1 className="page-title">
          AI Wallpaper{" "}
          <span className="text-teal-200 italic font-serif">Studio.</span>
        </h1>
        <p className="muted text-sm max-w-xl mx-auto leading-7">
          Your photo, made for your screen. Compose, adjust, and convert. AI
          super-resolution is available when a processing provider is connected.
        </p>
      </div>
      <div className="studio-grid">
        <div>
          <div className="panel">
            <div className="flex justify-between text-xs text-slate-400 mb-5">
              <span>01 / YOUR CANVAS</span>
              {upload && (
                <span>
                  {upload.width} × {upload.height} original
                </span>
              )}
            </div>
            <label className="flex items-start gap-3 text-xs leading-5 mb-5">
              <input
                type="checkbox"
                checked={rights}
                onChange={(e) => setRights(e.target.checked)}
              />
              I own this image or have permission to upload, modify, and process
              it.
            </label>
            <input
              className="hidden"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => choose(e.target.files?.[0])}
              aria-label="Upload image"
            />
            {!upload ? (
              <button
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  choose(e.dataTransfer.files[0]);
                }}
                className="w-full min-h-80 rounded-xl border border-dashed border-teal-200/25 bg-teal-900/5 flex flex-col justify-center items-center gap-4"
              >
                <span className="p-4 rounded-2xl bg-teal-300/10 text-teal-200">
                  <UploadCloud size={30} />
                </span>
                <span className="text-lg">
                  {busy
                    ? "Uploading your image…"
                    : "Drop a little inspiration here"}
                </span>
                <span className="text-xs muted">
                  or click to choose · JPG, PNG, WebP · up to {caps.uploadMb} MB
                </span>
              </button>
            ) : (
              <>
                <div
                  className="bg-black/40 rounded-xl overflow-hidden mx-auto"
                  style={{
                    aspectRatio: target.width / target.height,
                    maxHeight: 520,
                    maxWidth: "100%",
                  }}
                >
                  <img
                    src={`/api/uploads/${upload.id}/image`}
                    alt="Your original with selected crop"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${x * 100}% ${y * 100}%`,
                      filter: `brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-5 mt-5">
                  <label className="field">
                    Horizontal crop position
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".01"
                      value={x}
                      onChange={(e) => setX(+e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Vertical crop position
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".01"
                      value={y}
                      onChange={(e) => setY(+e.target.value)}
                    />
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-5"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || !!processing}
                >
                  <ImagePlus size={14} />
                  Choose another image
                </Button>
              </>
            )}
            <p className="text-xs muted flex items-center gap-2 mt-6 mb-0">
              <ShieldCheck size={15} className="text-teal-300" /> Private by
              default. Uploads and results expire after {caps.retentionHours}{" "}
              hours.
            </p>
          </div>
          {job && (
            <div className="panel mt-5" aria-live="polite">
              <div className="flex justify-between mb-3">
                <h2 className="text-base mb-0">
                  {job.status === "completed"
                    ? "Your new perspective is ready."
                    : job.status === "failed"
                      ? "Processing failed"
                      : job.status === "queued"
                        ? "Waiting for the background worker…"
                        : "Crafting your wallpaper…"}
                </h2>
                <span className="text-xs text-teal-300">{job.progress}%</span>
              </div>
              <progress
                className="w-full accent-teal-300 h-1"
                max={100}
                value={job.progress}
              />
              {job.status === "failed" && (
                <p className="error mt-4">{job.error}</p>
              )}
              {job.status === "completed" && (
                <>
                  <p className="notice text-xs mt-4">
                    {job.aiStatus}. Cropped and encoded to your selected
                    dimensions.
                  </p>
                  <div
                    className="relative overflow-hidden rounded-xl"
                    style={{
                      aspectRatio: resultOptions.width / resultOptions.height,
                    }}
                  >
                    <img
                      src={`/api/jobs/${job.id}/result`}
                      className="w-full h-full object-cover"
                      alt="Finished wallpaper"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}
                    >
                      <img
                        src={`/api/uploads/${upload?.id}/image`}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${resultOptions.x * 100}% ${resultOptions.y * 100}%`,
                        }}
                        alt="Original image for comparison"
                      />
                    </div>
                    <div className="absolute top-3 left-3 bg-black/60 rounded px-2 py-1 text-[10px]">
                      ORIGINAL
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 rounded px-2 py-1 text-[10px]">
                      RESULT
                    </div>
                  </div>
                  <label className="field mt-4">
                    Before / after comparison
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compare}
                      onChange={(e) => setCompare(+e.target.value)}
                    />
                  </label>
                  <Button asChild className="w-full mt-5">
                    <a href={`/api/jobs/${job.id}/result?download=1`}>
                      <Download size={16} />
                      Download finished wallpaper
                    </a>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="panel h-fit">
          <p className="text-xs text-slate-400 mb-6">02 / MAKE IT YOURS</p>
          <label className="field mb-4">
            Target screen
            <select
              value={custom ? "custom" : index}
              onChange={(e) => {
                if (e.target.value === "custom") setCustom(true);
                else {
                  setCustom(false);
                  setIndex(+e.target.value);
                }
              }}
            >
              {resolutions.map((r, i) => (
                <option value={i} key={i}>
                  {r.label} · {r.width} × {r.height}
                </option>
              ))}
              <option value="custom">Custom dimensions</option>
            </select>
          </label>
          {custom && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="field">
                Width
                <input
                  type="number"
                  min="320"
                  max="5120"
                  value={width}
                  onChange={(e) => setWidth(+e.target.value)}
                />
              </label>
              <label className="field">
                Height
                <input
                  type="number"
                  min="320"
                  max="5120"
                  value={height}
                  onChange={(e) => setHeight(+e.target.value)}
                />
              </label>
            </div>
          )}
          <label className="field mb-6">
            Download format
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
          <div className="border-y border-white/10 py-5 mb-6">
            <label className="flex gap-3 items-center">
              <input
                type="checkbox"
                checked={ai}
                onChange={(e) => setAi(e.target.checked)}
              />
              <Sparkles size={16} className="text-teal-200" /> AI
              super-resolution
            </label>
            <p className="text-xs muted leading-5 mt-3 mb-0">
              Uses Real-ESRGAN when configured. If unavailable, the result is
              clearly labeled as resized. AI cannot guarantee recovery of
              missing detail.
            </p>
          </div>
          <div className="space-y-5">
            {[
              ["Brightness", brightness, setBrightness, 0.5, 1.5],
              ["Color intensity", saturation, setSaturation, 0, 2],
              ["Contrast", contrast, setContrast, 0.5, 1.5],
            ].map(([label, value, set, min, max]) => (
              <label className="field" key={String(label)}>
                <span className="flex justify-between">
                  {String(label)}
                  <span className="muted">{Number(value).toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={Number(min)}
                  max={Number(max)}
                  step=".01"
                  value={Number(value)}
                  onChange={(e) =>
                    (set as (v: number) => void)(+e.target.value)
                  }
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 my-6">
            {[
              ["Sharpen", sharpen, setSharpen],
              ["Reduce noise", denoise, setDenoise],
              ["Cinematic tint", cinematic, setCinematic],
            ].map(([label, v, set]) => (
              <label
                key={String(label)}
                className="flex items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={Boolean(v)}
                  onChange={(e) =>
                    (set as (v: boolean) => void)(e.target.checked)
                  }
                />
                {String(label)}
              </label>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={processImage}
            disabled={!upload || busy || !!processing}
          >
            <Sparkles size={16} />
            {processing
              ? "Processing…"
              : busy
                ? "Please wait…"
                : "Create my wallpaper"}
          </Button>
          <p className="text-center text-[10px] muted mt-4 mb-0">
            Up to {caps.outputMegapixels} megapixels · No stretching · EXIF
            location removed
          </p>
          {error && (
            <p role="alert" className="error mt-5 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>
      <p className="muted text-xs text-center mt-8">
        Your session identifies your private uploads. Clearing browser cookies
        removes access.{" "}
        <Link href="/uploads" className="text-teal-200">
          View my uploads →
        </Link>
      </p>
    </div>
  );
}
