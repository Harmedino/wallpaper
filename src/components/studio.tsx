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
import { FontPicker } from "./font-picker";
import { looks, backgrounds } from "@/lib/studio-presets";
import { backgroundSvg } from "@/lib/backgrounds-svg";
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
  const [backgroundPhoto, setBackgroundPhoto] = useState<Upload | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<Upload | null>(null);
  const [cutoutDone, setCutoutDone] = useState(false);
  const [cutoutProgress, setCutoutProgress] = useState("");
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const [backgroundTemplate, setBackgroundTemplate] = useState("aurora");
  const [sourceKind, setSourceKind] = useState("photo");
  const [grid, setGrid] = useState("single");
  const [photos, setPhotos] = useState<Upload[]>([]);
  const collageRef = useRef<HTMLInputElement>(null);
  const [textBounds, setTextBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    size: number;
    mode: string;
    width: number;
    height: number;
    bw: number;
    bh: number;
  } | null>(null);
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
  const [previewExpanded, setPreviewExpanded] = useState(false);
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
      setSourceKind("photo");
      setOriginalPhoto(d);
      setCutoutDone(false);
      setX(0.5);
      setY(0.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      const added: Upload[] = [];
      for (const file of Array.from(files).slice(0, 5 - photos.length)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > caps.uploadMb * 1024 * 1024
        )
          throw new Error(`Choose photos under ${caps.uploadMb} MB`);
        const body = new FormData();
        body.set("file", file);
        const r = await fetch("/api/uploads", { method: "POST", body });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        added.push(d);
      }
      setPhotos((previous) => [...previous, ...added].slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add photos");
    } finally {
      setBusy(false);
      if (collageRef.current) collageRef.current.value = "";
    }
  }
  async function ensureSubject() {
    if (cutoutDone || !upload || sourceKind !== "photo") return;
    const { cutout } = await import("@/lib/cutout");
    const response = await fetch(
      `/api/uploads/${(originalPhoto || upload).id}/image`,
    );
    if (!response.ok) throw new Error("Could not load original photo");
    const subject = await cutout(await response.blob(), setCutoutProgress);
    setCutoutProgress("Saving your cutout…");
    const body = new FormData();
    body.set("file", subject, "subject.webp");
    const r = await fetch("/api/uploads", { method: "POST", body });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setUpload(d);
    setCutoutDone(true);
  }
  async function chooseBackgroundPhoto(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > caps.uploadMb * 1024 * 1024)
        throw new Error(`Choose a background under ${caps.uploadMb} MB`);
      setCutoutProgress("Uploading new background…");
      const body = new FormData();
      body.set("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await ensureSubject();
      setBackgroundPhoto(d);
      setBackgroundMode("art");
      setPadding(0);
      setJob(null);
      if (!upload) {
        setUpload(d);
        setSourceKind("background");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not replace background");
    } finally {
      setBusy(false);
      setCutoutProgress("");
      if (backgroundFileRef.current) backgroundFileRef.current.value = "";
    }
  }
  async function useBackground(template: string) {
    setBackgroundTemplate(template);
    setBackgroundPhoto(null);
    if (upload && sourceKind === "photo") {
      setBusy(true);
      setError("");
      try {
        await ensureSubject();
        setBackgroundMode("art");
        setJob(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Background removal failed");
      } finally {
        setBusy(false);
        setCutoutProgress("");
      }
      return;
    }
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
      setSourceKind("background");
      setBackgroundMode("crop");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Background could not be created",
      );
    } finally {
      setBusy(false);
    }
  }
  function resetEdits() {
    if (originalPhoto && cutoutDone) {
      setUpload(originalPhoto);
      setCutoutDone(false);
    }
    setBackgroundPhoto(null);
    setBrightness(1);
    setSaturation(1);
    setContrast(1);
    setCinematic(false);
    setSharpen(false);
    setDenoise(false);
    setVignette(false);
    setLook("original");
    setBackgroundMode("crop");
    setGrid("single");
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
    backgroundTemplate,
    backgroundPhotoId: backgroundPhoto?.id,
    grid,
    photoIds: photos.map((p) => p.id),
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
    setPreviewBusy(true);
    const timer = setTimeout(async () => {
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
        setTextBounds(JSON.parse(r.headers.get("X-Text-Bounds") || "null"));
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
            backgroundTemplate,
            backgroundPhotoId: backgroundPhoto?.id,
            grid,
            photoIds: photos.map((p) => p.id),
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
      <div
        style={
          {
            "--canvas-ratio": target.width / target.height,
          } as React.CSSProperties
        }
        className={
          "studio-grid " +
          (upload ? "has-upload" : "") +
          (previewExpanded ? " preview-expanded" : "")
        }
      >
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
                Replace your background · AI keeps the subject
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    disabled={busy || !!processing}
                    onClick={() => useBackground(b.id)}
                    className="studio-template"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(backgroundSvg(b.id, 300, 180))}")`,
                      backgroundSize: "cover",
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
                  className="studio-preview-frame bg-black/40 rounded-xl mx-auto"
                  style={{
                    ...({
                      "--canvas-ratio": target.width / target.height,
                    } as React.CSSProperties),
                    aspectRatio: target.width / target.height,
                    maxHeight: 520,
                    maxWidth: "100%",
                  }}
                >
                  {(previewBusy || busy) && (
                    <div className="studio-preview-loading" role="status">
                      <span className="studio-spinner" />
                      {cutoutProgress ||
                        (busy ? "Preparing image…" : "Updating preview…")}
                    </div>
                  )}
                  <button
                    className="studio-expand-preview"
                    aria-label={
                      previewExpanded
                        ? "Close expanded preview"
                        : "Expand preview"
                    }
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                  >
                    {previewExpanded ? "✕ Back to editing" : "⛶ Expand preview"}
                  </button>
                  <img
                    draggable={false}
                    src={preview || `/api/uploads/${upload.id}/image`}
                    alt="Edited wallpaper preview"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: preview
                        ? "center"
                        : `${x * 100}% ${y * 100}%`,
                    }}
                  />
                  {text.content.trim() && textBounds && (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Move text on canvas"
                      className="studio-text-selection"
                      style={{
                        left: `${text.x * (1 - textBounds.width) * 100}%`,
                        top: `${text.y * (1 - textBounds.height) * 100}%`,
                        width: `${textBounds.width * 100}%`,
                        height: `${textBounds.height * 100}%`,
                      }}
                      onKeyDown={(e) => {
                        const delta = e.shiftKey ? 0.05 : 0.01;
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                          setText((t) => ({
                            ...t,
                            x: Math.max(
                              0,
                              Math.min(
                                1,
                                t.x +
                                  (e.key === "ArrowRight"
                                    ? delta
                                    : e.key === "ArrowLeft"
                                      ? -delta
                                      : 0),
                              ),
                            ),
                            y: Math.max(
                              0,
                              Math.min(
                                1,
                                t.y +
                                  (e.key === "ArrowDown"
                                    ? delta
                                    : e.key === "ArrowUp"
                                      ? -delta
                                      : 0),
                              ),
                            ),
                          }));
                        }
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const rect =
                          e.currentTarget.parentElement!.getBoundingClientRect();
                        dragRef.current = {
                          x: e.clientX,
                          y: e.clientY,
                          tx: text.x,
                          ty: text.y,
                          size: text.size,
                          mode: (e.target as HTMLElement).dataset.resize
                            ? "resize"
                            : "move",
                          width: rect.width,
                          height: rect.height,
                          bw: textBounds.width,
                          bh: textBounds.height,
                        };
                      }}
                      onPointerMove={(e) => {
                        const d = dragRef.current;
                        if (!d) return;
                        const dx = e.clientX - d.x,
                          dy = e.clientY - d.y;
                        const clamp = (n: number, min = 0, max = 1) =>
                          Math.max(min, Math.min(max, n));
                        setText((t) =>
                          d.mode === "resize"
                            ? {
                                ...t,
                                size: clamp(
                                  d.size *
                                    (1 +
                                      (dx + dy) /
                                        Math.max(
                                          30,
                                          d.bw * d.width + d.bh * d.height,
                                        )),
                                  0.02,
                                  0.2,
                                ),
                              }
                            : {
                                ...t,
                                x: clamp(
                                  d.tx + dx / Math.max(1, d.width * (1 - d.bw)),
                                ),
                                y: clamp(
                                  d.ty +
                                    dy / Math.max(1, d.height * (1 - d.bh)),
                                ),
                              },
                        );
                      }}
                      onPointerUp={() => {
                        dragRef.current = null;
                      }}
                      onPointerCancel={() => {
                        dragRef.current = null;
                      }}
                    >
                      <span className="studio-text-hint">
                        Drag text · resize corner
                      </span>
                      <span
                        data-resize="true"
                        className="studio-text-resize"
                        aria-label="Resize text"
                      />
                    </div>
                  )}
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
            <h2>Design ideas</h2>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                {
                  name: "Travel postcard",
                  bg: "mountains",
                  font: "serifItalic",
                  words: "Somewhere beautiful",
                  y: 0.86,
                },
                {
                  name: "Retro album",
                  bg: "retro",
                  font: "condensed",
                  words: "GOOD DAYS AHEAD",
                  y: 0.12,
                },
                {
                  name: "Moon journal",
                  bg: "orbit",
                  font: "light",
                  words: "Stay curious",
                  y: 0.8,
                },
                {
                  name: "Botanical notes",
                  bg: "botanical",
                  font: "serif",
                  words: "Room to grow",
                  y: 0.15,
                },
                {
                  name: "Creative desktop",
                  bg: "memphis",
                  font: "bold",
                  words: "MAKE SOMETHING",
                  y: 0.8,
                },
                {
                  name: "Focus mode",
                  bg: "blueprint",
                  font: "monoBold",
                  words: "ONE THING AT A TIME",
                  y: 0.85,
                },
              ].map((idea) => (
                <button
                  key={idea.name}
                  className="chip"
                  onClick={() => {
                    useBackground(idea.bg);
                    setPadding(0.15);
                    setRadius(0.04);
                    setText({
                      ...text,
                      content: idea.words,
                      font: idea.font,
                      size: 0.07,
                      x: 0.5,
                      y: idea.y,
                    });
                  }}
                >
                  {idea.name}
                </button>
              ))}
            </div>
            <button
              className="chip mb-4"
              onClick={() => {
                setIndex(2);
                setCustom(false);
              }}
            >
              Convert to 4K · 3840 × 2160
            </button>
            <h2>Photo grids</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ["single", "Single photo"],
                ["duo", "Side by side"],
                ["triptych", "Three panels"],
                ["quad", "2 × 2 grid"],
                ["mosaic", "Editorial mosaic"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={"chip " + (grid === id ? "active" : "")}
                  onClick={() => {
                    setGrid(id);
                    if (id !== "single" && backgroundMode === "crop")
                      setBackgroundMode("art");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs muted mb-3">
              Add up to five photos. With one photo, the layout repeats it as a
              pattern.
            </p>
            <input
              ref={collageRef}
              className="hidden"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              aria-label="Add collage photos"
              onChange={(e) => addPhotos(e.target.files)}
            />
            <button
              className="chip mb-3"
              disabled={busy || photos.length >= 5}
              onClick={() => collageRef.current?.click()}
            >
              Add photos to grid ({photos.length}/5)
            </button>
            <div className="flex gap-2 flex-wrap mb-5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  className="relative"
                  onClick={() => setPhotos(photos.filter((q) => q.id !== p.id))}
                  aria-label={`Remove grid photo ${i + 1}`}
                >
                  <img
                    src={`/api/uploads/${p.id}/image`}
                    alt={`Grid photo ${i + 1}`}
                    className="w-14 h-14 object-cover rounded"
                  />
                  <span className="absolute right-0 top-0 bg-black rounded px-1">
                    ×
                  </span>
                </button>
              ))}
            </div>
            <h2>Replace image background</h2>
            <p className="text-xs muted mb-3">
              AI separates the subject from its original background. Use your
              own image or choose an illustrated scene. Fine hair and
              transparent objects may need a cleaner source photo.
            </p>
            <input
              type="file"
              className="hidden"
              ref={backgroundFileRef}
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload replacement background"
              onChange={(e) => chooseBackgroundPhoto(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className="chip"
                disabled={busy}
                onClick={() => backgroundFileRef.current?.click()}
              >
                Upload background image
              </button>
              <button
                className="chip"
                disabled={
                  busy || !upload || sourceKind !== "photo" || cutoutDone
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await ensureSubject();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Cutout failed");
                  } finally {
                    setBusy(false);
                    setCutoutProgress("");
                  }
                }}
              >
                Remove original background
              </button>
              {originalPhoto && cutoutDone && (
                <button
                  className="chip"
                  onClick={() => {
                    setUpload(originalPhoto);
                    setCutoutDone(false);
                    setBackgroundMode("crop");
                  }}
                >
                  Restore original photo
                </button>
              )}
            </div>
            {cutoutProgress && (
              <p role="status" className="text-xs text-teal-200 mb-4">
                {cutoutProgress}
              </p>
            )}
            <h2>Framing & layout</h2>
            <label className="field mb-4">
              Photo layout
              <select
                value={backgroundMode}
                onChange={(e) => setBackgroundMode(e.target.value)}
              >
                <option value="crop">Fill screen · crop to fit</option>
                <option value="blur">Full photo · blurred backdrop</option>
                <option value="solid">Full photo · solid backdrop</option>
                <option value="art">Full photo · illustrated backdrop</option>
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
            <p className="text-xs muted mb-4">
              Drag text on the preview to move it. Drag its corner to resize.
              Arrow keys nudge the selected text; Shift moves faster.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className="chip"
                onClick={() => setText({ ...text, x: 0.5, y: 0.5 })}
              >
                Center text
              </button>
              <button
                className="chip"
                onClick={() =>
                  setText({ ...text, content: text.content.toUpperCase() })
                }
              >
                UPPERCASE
              </button>
              <button
                className="chip"
                onClick={() => setText({ ...text, content: "" })}
              >
                Remove text
              </button>
            </div>
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
              <FontPicker
                value={text.font}
                onChange={(font) => setText({ ...text, font })}
              />
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
