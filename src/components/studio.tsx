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
import { looks, backgrounds, textFonts } from "@/lib/studio-presets";
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
  const [backgroundMode, setBackgroundMode] = useState("crop");
  const [backgroundColor, setBackgroundColor] = useState("#101a20");
  const [padding, setPadding] = useState(0.06);
  const [radius, setRadius] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [flop, setFlop] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [look, setLook] = useState("original");
  const [text, setText] = useState({
    content: "",
    font: "sans",
    size: 0.06,
    color: "#ffffff",
    x: 0.5,
    y: 0.5,
    align: "center",
    shadow: true,
  });
  const [preview, setPreview] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewRef = useRef<string | null>(null);
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
      const r = await fetch("/api/uploads", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreview("");
      setUpload(d);
      setX(0.5);
      setY(0.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function useBackground(template: string) {
    setBusy(true);
    setError("");
    setJob(null);
    try {
      const r = await fetch("/api/studio/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreview("");
      setUpload(d);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Background could not be created",
      );
    } finally {
      setBusy(false);
    }
  }
  function resetEdits() {
    setBrightness(1);
    setSaturation(1);
    setContrast(1);
    setCinematic(false);
    setSharpen(false);
    setDenoise(false);
    setVignette(false);
    setLook("original");
    setBackgroundMode("crop");
    setRotation(0);
    setFlip(false);
    setFlop(false);
    setText({
      content: "",
      font: "sans",
      size: 0.06,
      color: "#ffffff",
      x: 0.5,
      y: 0.5,
      align: "center",
      shadow: true,
    });
    setPadding(0.06);
    setRadius(0);
    setBackgroundColor("#101a20");
    setAi(false);
    setX(0.5);
    setY(0.5);
  }
  const previewOptions = JSON.stringify({
    ...target,
    x,
    y,
    brightness,
    saturation,
    contrast,
    sharpen,
    denoise,
    cinematic,
    backgroundMode,
    backgroundColor,
    padding,
    radius,
    rotation,
    flip,
    flop,
    vignette,
    text,
    format: "webp",
  });
  useEffect(() => {
    if (!upload) return;
    const c = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      setPreviewError("");
      try {
        const r = await fetch("/api/studio/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: upload.id,
            options: JSON.parse(previewOptions),
          }),
          signal: c.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error);
        const next = URL.createObjectURL(await r.blob());
        if (c.signal.aborted) {
          URL.revokeObjectURL(next);
          return;
        }
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = next;
        setPreview(next);
      } catch (e) {
        if (!c.signal.aborted)
          setPreviewError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        if (!c.signal.aborted) setPreviewBusy(false);
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [upload?.id, previewOptions]);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
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
            backgroundMode,
            backgroundColor,
            padding,
            radius,
            rotation,
            flip,
            flop,
            vignette,
            text,
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
        <div className={"studio-canvas-column " + (job ? "has-result" : "")}>
          <div className="panel">
            <div className="flex justify-between text-xs text-slate-400 mb-5">
              <span>01 / YOUR CANVAS</span>
              {upload && (
                <span>
                  {upload.width} × {upload.height} original
                </span>
              )}
            </div>
            <div className="studio-template-strip">
              <p className="text-xs muted mb-3">
                Start from a background — or upload your own photo
              </p>
              <div className="grid grid-cols-4 gap-2">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    disabled={busy || !!processing}
                    onClick={() => useBackground(b.id)}
                    className="studio-template"
                    style={{
                      background: `linear-gradient(135deg,${b.a},${b.b})`,
                    }}
                  >
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
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
                    src={preview || `/api/uploads/${upload.id}/image`}
                    alt="Edited wallpaper preview"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: preview
                        ? "center"
                        : `${x * 100}% ${y * 100}%`,
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
            {previewError && (
              <p className="error text-xs mt-3">{previewError}</p>
            )}
            {upload && (
              <p className="text-xs muted mt-4" aria-live="polite">
                {previewBusy
                  ? "Updating your preview…"
                  : "Live preview · changes are included in your download"}
              </p>
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
          <div className="studio-edit-section">
            <h2>Try a look</h2>
            <div className="grid grid-cols-3 gap-2">
              {looks.map((p) => (
                <button
                  key={p.id}
                  className={"studio-look " + (look === p.id ? "active" : "")}
                  onClick={() => {
                    setLook(p.id);
                    setBrightness(p.brightness);
                    setSaturation(p.saturation);
                    setContrast(p.contrast);
                    setCinematic(p.cinematic);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="chip"
                onClick={() => {
                  setText({
                    ...text,
                    content: "MAKE SPACE\nFOR WHAT MATTERS",
                    font: "serif",
                    size: 0.07,
                  });
                  setVignette(true);
                }}
              >
                Try quote layout
              </button>
              <button
                className="chip"
                onClick={() => {
                  setText({
                    ...text,
                    content: "FOCUS.",
                    font: "mono",
                    size: 0.1,
                  });
                  setBackgroundMode("blur");
                  setPadding(0.12);
                  setRadius(0.08);
                }}
              >
                Try focus layout
              </button>
              <button className="chip" onClick={resetEdits}>
                Reset edits
              </button>
            </div>
          </div>
          <div className="studio-edit-section">
            <h2>Background & framing</h2>
            <label className="field mb-4">
              Photo layout
              <select
                value={backgroundMode}
                onChange={(e) => setBackgroundMode(e.target.value)}
              >
                <option value="crop">Fill screen · crop to fit</option>
                <option value="blur">Full photo · blurred backdrop</option>
                <option value="solid">Full photo · solid backdrop</option>
              </select>
            </label>
            {backgroundMode === "solid" && (
              <label className="field mb-4">
                Backdrop color
                <input
                  aria-label="Backdrop color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                />
              </label>
            )}
            {backgroundMode !== "crop" && (
              <>
                <label className="field mb-4">
                  Frame spacing
                  <input
                    type="range"
                    min="0"
                    max=".2"
                    step=".01"
                    value={padding}
                    onChange={(e) => setPadding(+e.target.value)}
                  />
                </label>
                <label className="field mb-4">
                  Rounded photo corners
                  <input
                    type="range"
                    min="0"
                    max=".25"
                    step=".01"
                    value={radius}
                    onChange={(e) => setRadius(+e.target.value)}
                  />
                </label>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                className="chip"
                onClick={() => setRotation((rotation + 90) % 360)}
              >
                Rotate 90°
              </button>
              <button
                className={"chip " + (flop ? "active" : "")}
                onClick={() => setFlop(!flop)}
              >
                Flip horizontal
              </button>
              <button
                className={"chip " + (flip ? "active" : "")}
                onClick={() => setFlip(!flip)}
              >
                Flip vertical
              </button>
            </div>
            <label className="flex gap-2 mt-4 items-center">
              <input
                type="checkbox"
                checked={vignette}
                onChange={(e) => setVignette(e.target.checked)}
              />
              Soft vignette
            </label>
          </div>
          <div className="studio-edit-section">
            <h2>Make a statement</h2>
            <label className="field mb-4">
              Wallpaper text
              <textarea
                rows={3}
                maxLength={400}
                value={text.content}
                placeholder="Your words, your wallpaper…"
                onChange={(e) => setText({ ...text, content: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="field">
                Font
                <select
                  value={text.font}
                  onChange={(e) => setText({ ...text, font: e.target.value })}
                >
                  {Object.entries(textFonts).map(([id, f]) => (
                    <option key={id} value={id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Text color
                <input
                  type="color"
                  value={text.color}
                  onChange={(e) => setText({ ...text, color: e.target.value })}
                />
              </label>
            </div>
            <label className="field mb-4">
              Text size
              <input
                type="range"
                min=".02"
                max=".2"
                step=".005"
                value={text.size}
                onChange={(e) => setText({ ...text, size: +e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="field">
                Text horizontal position
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={text.x}
                  onChange={(e) => setText({ ...text, x: +e.target.value })}
                />
              </label>
              <label className="field">
                Text vertical position
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={text.y}
                  onChange={(e) => setText({ ...text, y: +e.target.value })}
                />
              </label>
            </div>
            <label className="field mb-4">
              Text alignment
              <select
                value={text.align}
                onChange={(e) => setText({ ...text, align: e.target.value })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={text.shadow}
                onChange={(e) => setText({ ...text, shadow: e.target.checked })}
              />
              Text shadow
            </label>
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
