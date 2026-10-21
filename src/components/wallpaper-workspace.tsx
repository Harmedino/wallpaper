"use client";
import { useEffect, useState, useRef } from "react";
import { DevicePreview } from "./device-preview";
import { ImageSaveActions } from "./image-save-actions";
import { devices } from "@/lib/device-fit";
import {
  fitImageOptions,
  fitScale,
  imageFilename,
  type WallpaperFit,
} from "@/lib/wallpaper-fit";
import { resolutions } from "@/lib/constants";
import {
  Monitor,
  Smartphone,
  SlidersHorizontal,
  Check,
  Sparkles,
} from "lucide-react";
type Props = {
  wallpaper: {
    id: string;
    title: string;
    width: number;
    height: number;
    verifiedAt?: string | null;
    aiStatus?: string;
  };
};
export function WallpaperWorkspace({ wallpaper: w }: Props) {
  const [preset, setPreset] = useState(
      w.height > w.width ? "android" : "windows",
    ),
    [width, setWidth] = useState(w.height > w.width ? 1440 : 3840),
    [height, setHeight] = useState(w.height > w.width ? 3120 : 2160),
    [fit, setFit] = useState<"fit" | "fill" | "expand">("fill"),
    [format, setFormat] = useState<"jpg" | "png" | "webp">("jpg"),
    [x, setX] = useState(0.5),
    [y, setY] = useState(0.5),
    [zoom, setZoom] = useState(1),
    [deviceView, setDeviceView] = useState(false),
    [ai, setAi] = useState(false),
    [caps, setCaps] = useState({
      aiAvailable: false,
      outpaintAvailable: false,
      outputMegapixels: 16,
    });
  const [preview, setPreview] = useState(""),
    [previewBusy, setPreviewBusy] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [source, setSource] = useState({ width: w.width, height: w.height }),
    [sourceVerified, setSourceVerified] = useState(!!w.verifiedAt),
    [jobResult, setJobResult] = useState(""),
    [jobBusy, setJobBusy] = useState(""),
    [processing, setProcessing] = useState("");
  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((d) =>
        setCaps({ ...d, outputMegapixels: d.limits?.outputMegapixels || 16 }),
      )
      .catch(() => {});
    const q = new URLSearchParams(location.search);
    let next = devices.find(
      (d) =>
        d.width === Number(q.get("width")) &&
        d.height === Number(q.get("height")),
    );
    if (!next && matchMedia("(max-width:700px)").matches)
      next = devices.find((d) => d.id === "android");
    if (next) {
      setPreset(next.id);
      setWidth(next.width);
      setHeight(next.height);
    }
    if (q.get("fit") === "fit") setFit("fit");
  }, []);
  const valid =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 320 &&
    height >= 320 &&
    width <= 7680 &&
    height <= 7680 &&
    width * height <= caps.outputMegapixels * 1000000;
  const options: WallpaperFit = {
    width,
    height,
    format,
    fit: fit === "fill" ? "fill" : "fit",
    x,
    y,
    zoom,
  };
  const params = new URLSearchParams(
    Object.entries(options).map(([k, v]) => [k, String(v)]),
  );
  const query = params.toString(),
    base = `/api/wallpapers/${w.id}`;
  const previewUrl = `${base}/preview?${query}`;
  useEffect(() => {
    setJobResult("");
    setProcessing("");
    if (!valid) {
      setPreviewBusy(false);
      return;
    }
    const controller = new AbortController();
    setPreviewBusy(true);
    setError("");
    let objectUrl = "";
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(previewUrl, { signal: controller.signal });
        if (!r.ok) throw Error((await r.json()).error);
        const sw = Number(r.headers.get("X-Source-Width")),
          sh = Number(r.headers.get("X-Source-Height"));
        if (sw && sh) {
          setSource({ width: sw, height: sh });
          setSourceVerified(true);
        }
        objectUrl = URL.createObjectURL(await r.blob());
        if (controller.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreview(objectUrl);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Preview unavailable");
      } finally {
        if (!controller.signal.aborted) setPreviewBusy(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [previewUrl, retry, valid, ai, fit]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function choose(value: string) {
    setPreset(value);
    const device = devices.find((d) => d.id === value);
    const generic = value.startsWith("resolution-")
      ? resolutions[Number(value.slice(11))]
      : null;
    const next = device || generic;
    if (next) {
      setWidth(next.width);
      setHeight(next.height);
    }
    setX(0.5);
    setY(0.5);
    setZoom(1);
  }
  const scale = valid ? fitScale(source, options) : 1;
  const native = devices.find(
    (d) => d.width === width && d.height === height,
  ) ||
    devices.find(
      (d) => Math.abs(d.width / d.height - width / height) < 0.003,
    ) || { id: "custom", group: width < height ? "phone" : "desktop" };
  const settingsRef = useRef("");
  settingsRef.current = query + ai + fit;
  async function prepareAI() {
    setError("");
    setJobBusy("Preparing original image…");
    setJobResult("");
    const requested = query + ai + fit;
    try {
      const r = await fetch(`${base}/edit`, { method: "POST" });
      const upload = await r.json();
      if (!r.ok) throw Error(upload.error);
      const start = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: upload.id,
          options: {
            ...fitImageOptions(options),
            ai,
            outpaint: fit === "expand",
          },
        }),
      });
      const d = await start.json();
      if (!start.ok) throw Error(d.error);
      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const response = await fetch(`/api/jobs/${d.id}`);
        const job = await response.json();
        if (!response.ok || job.status === "failed")
          throw Error(job.error || "Processing failed");
        if (job.status === "completed") {
          if (settingsRef.current !== requested)
            throw Error(
              "Your settings changed. Prepare the updated wallpaper.",
            );
          setJobResult(`/api/jobs/${d.id}/result`);
          setProcessing(job.aiStatus);
          return;
        }
        setJobBusy(
          `${job.stage || "Processing image"} · ${job.progress || 0}%`,
        );
      }
      throw Error(
        "Processing is taking longer than expected. Your job remains available in My uploads.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process image");
    } finally {
      setJobBusy("");
    }
  }
  const src = jobResult || `${base}/download?${query}`;
  return (
    <div className="wallpaper-workspace">
      <div className="detail-preview-column">
        <div className="detail-preview-heading">
          <span className="eyebrow">YOUR WALLPAPER</span>
          <div className="segmented">
            <button
              aria-pressed={!deviceView}
              onClick={() => setDeviceView(false)}
            >
              Image
            </button>
            <button
              aria-pressed={deviceView}
              disabled={!native || !preview || previewBusy}
              onClick={() => setDeviceView(true)}
            >
              {native?.group === "desktop" ? (
                <Monitor size={15} />
              ) : (
                <Smartphone size={15} />
              )}
              Device preview
            </button>
          </div>
        </div>
        <div
          className="detail-canvas"
          style={{ "--target-ratio": width / height } as React.CSSProperties}
        >
          {deviceView && native && preview ? (
            <DevicePreview
              key={native.id}
              embedded
              initialDevice={native.id}
              showDownload={false}
              wallpaper={{
                id: w.id,
                title: w.title,
                width,
                height,
                imageSrc: jobResult || preview,
              }}
            />
          ) : (
            <img
              src={jobResult || preview || `${base}/thumbnail`}
              alt={`${w.title} fitted wallpaper preview`}
              style={{
                aspectRatio: valid
                  ? width / height
                  : source.width / source.height,
                objectFit: "contain",
              }}
            />
          )}
          {previewBusy && (
            <div className="detail-loading" role="status">
              <span className="studio-spinner" />
              Fitting your preview…
            </div>
          )}
        </div>
        <p className="detail-preview-caption">
          {fit === "fill"
            ? "Fill crops the edges. Adjust the position to protect your subject."
            : fit === "expand" && !jobResult
              ? "Framing preview only. AI expansion appears after processing."
              : "Fit preserves the entire image without stretching."}{" "}
          Clocks and icons appear only in device previews.
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
            <button
              className="chip ml-3"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry preview
            </button>
          </div>
        )}
      </div>
      <section
        id="wallpaper-options"
        className="detail-controls"
        aria-label="Wallpaper fitting and saving"
      >
        <div className="detail-control-title">
          <span className="eyebrow">MAKE IT FIT</span>
          <h2>Your screen, your choice.</h2>
          <p className="muted">
            Choose your device, then adjust the crop. What you see is what
            downloads.
          </p>
        </div>
        <label className="field">
          Your device
          <select
            aria-label="Your device"
            value={preset}
            disabled={!!jobBusy}
            onChange={(e) => choose(e.target.value)}
          >
            <optgroup label="Phones">
              {devices
                .filter((d) => d.group === "phone")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.width} × {d.height}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Desktop & tablet">
              {devices
                .filter((d) => d.group !== "phone")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.width} × {d.height}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Resolutions">
              {resolutions
                .filter((r) => r.width * r.height <= 16_000_000)
                .map((r) => (
                  <option
                    key={r.label}
                    value={`resolution-${resolutions.indexOf(r)}`}
                  >
                    {r.label} · {r.width} × {r.height}
                  </option>
                ))}
            </optgroup>
            <option value="custom">Other Android / custom screen</option>
          </select>
        </label>
        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <label className="field">
              Width
              <input
                aria-label="Custom width"
                type="number"
                min={320}
                max={7680}
                value={width}
                onChange={(e) => setWidth(+e.target.value)}
              />
            </label>
            <label className="field">
              Height
              <input
                aria-label="Custom height"
                type="number"
                min={320}
                max={7680}
                value={height}
                onChange={(e) => setHeight(+e.target.value)}
              />
            </label>
          </div>
        )}
        {!valid && (
          <p className="error mt-3">
            Use dimensions from 320 to 7680 pixels, up to{" "}
            {caps.outputMegapixels} megapixels total.
          </p>
        )}
        <fieldset className="fit-modes" disabled={!!jobBusy}>
          <legend>How should it fit?</legend>
          {[
            ["fit", "Fit", "Keep entire image"],
            ["fill", "Fill", "Crop to screen"],
            ["expand", "Expand", "AI background extension"],
          ].map(([value, label, help]) => (
            <button
              key={value}
              aria-pressed={fit === value}
              disabled={value === "expand" && !caps.outpaintAvailable}
              onClick={() => setFit(value as typeof fit)}
            >
              <span>
                {label}
                {fit === value && <Check size={15} />}
              </span>
              <small>{help}</small>
            </button>
          ))}
        </fieldset>
        {fit === "fill" && (
          <div className="crop-controls">
            <label className="field">
              Horizontal position
              <input
                aria-label="Horizontal crop position"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={x}
                onChange={(e) => setX(+e.target.value)}
              />
            </label>
            <label className="field">
              Vertical position
              <input
                aria-label="Vertical crop position"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={y}
                onChange={(e) => setY(+e.target.value)}
              />
            </label>
            <label className="field">
              Crop zoom
              <input
                type="range"
                min="1"
                max="4"
                step=".01"
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
          </div>
        )}
        {!caps.outpaintAvailable && (
          <p className="muted text-xs mt-3">
            AI expansion is not connected. Fit and Fill work without it.
          </p>
        )}
        <label className="field mt-5">
          Image format
          <select
            aria-label="Image format"
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            disabled={!!jobBusy}
          >
            <option value="jpg">JPG · recommended for Photos</option>
            <option value="png">PNG · lossless</option>
            <option value="webp">WebP · smaller file</option>
          </select>
        </label>
        <div className="detail-quality">
          <strong>
            {source.width} × {source.height} original
          </strong>
          <span>
            {sourceVerified
              ? "Original file verified"
              : "Source dimensions awaiting verification"}
          </span>
          <span>
            {width} × {height} download · {fit === "fill" ? "Fill" : "Fit"}
          </span>
          {scale > 1.001 && (
            <p className={scale > 3 ? "quality-caution" : ""}>
              {scale > 3
                ? "Large enlargement: expect softness. A lower output resolution is recommended."
                : "This output enlarges the source."}{" "}
              Standard resizing adds pixels, not recovered detail.
            </p>
          )}
        </div>
        {caps.aiAvailable && scale > 1.001 && (
          <label className="ai-choice">
            <input
              type="checkbox"
              checked={ai}
              disabled={!!jobBusy}
              onChange={(e) => setAi(e.target.checked)}
            />
            <span>
              Use AI super-resolution
              <small>
                Runs the configured paid provider. Failed AI does not fall back
                to ordinary resizing.
              </small>
            </span>
          </label>
        )}
        {(ai || fit === "expand") && !jobResult ? (
          <button
            className="save-primary mt-5"
            disabled={!valid || !!jobBusy}
            onClick={prepareAI}
          >
            {jobBusy ? (
              <>
                <span className="studio-spinner" />
                {jobBusy}
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Prepare with AI
              </>
            )}
          </button>
        ) : (
          valid && (
            <ImageSaveActions
              key={src}
              src={src}
              viewUrl={jobResult || `${base}/view?${query}`}
              filename={imageFilename(w.title, width, height, format)}
              width={width}
              height={height}
              autoPrepare={!!jobResult}
            />
          )
        )}
        {processing && <p className="text-xs muted mt-3">{processing}</p>}
        <button
          className="detail-edit-link"
          onClick={async () => {
            setJobBusy("Opening editor…");
            try {
              const r = await fetch(`${base}/edit`, { method: "POST" });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              location.href = `/studio?uploadId=${d.id}&advanced=1&width=${width}&height=${height}&fit=${options.fit}&x=${x}&y=${y}`;
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not open editor",
              );
              setJobBusy("");
            }
          }}
        >
          <SlidersHorizontal size={16} />
          Edit wallpaper · text, filters and more
        </button>
      </section>
      <div className="detail-mobile-actions">
        <span>
          <strong>
            {width} × {height}
          </strong>
          {fit === "fill" ? "Fill · adjustable crop" : "Fit · entire image"}
        </span>
        <a className="save-primary" href="#wallpaper-options">
          Save options ↓
        </a>
      </div>
    </div>
  );
}
