"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { FontPicker } from "./font-picker";
import { Studio } from "./studio";
import { PhonePreview } from "./phone-preview";
import { compatibleDevices } from "@/lib/device-fit";
import { quickTemplateSvg } from "@/lib/quick-template";
const styles = [
  {
    name: "Blue & black",
    primary: "#1039c3",
    secondary: "#05080e",
    accent: "#f4c576",
    style: "stripes",
  },
  {
    name: "Red & black",
    primary: "#b71c36",
    secondary: "#100c11",
    accent: "#fff0d5",
    style: "stripes",
  },
  {
    name: "Golden nights",
    primary: "#9b7332",
    secondary: "#111214",
    accent: "#f1d69b",
    style: "rays",
  },
  {
    name: "Emerald club",
    primary: "#146747",
    secondary: "#f1ead9",
    accent: "#d4ad59",
    style: "stripes",
  },
  {
    name: "Violet energy",
    primary: "#6b3abe",
    secondary: "#140f24",
    accent: "#e8cfff",
    style: "rays",
  },
  {
    name: "Quiet confidence",
    primary: "#243b4d",
    secondary: "#0e1720",
    accent: "#c6d9e5",
    style: "minimal",
  },
];
type Mode = "studio" | "smart-fit" | "football";
export function QuickCreator({ mode = "studio" }: { mode?: Mode }) {
  const [advanced, setAdvanced] = useState(false),
    [selected, setSelected] = useState(0),
    [name, setName] = useState("YOUR CLUB"),
    [badge, setBadge] = useState("FC"),
    [number, setNumber] = useState(""),
    [primary, setPrimary] = useState(styles[0].primary),
    [accent, setAccent] = useState(styles[0].accent),
    [screen, setScreen] = useState("samsung"),
    [photo, setPhoto] = useState<{
      id: string;
      width: number;
      height: number;
      url: string;
      originalId?: string;
      originalUrl?: string;
      cutout?: boolean;
    } | null>(null),
    [usePhoto, setUsePhoto] = useState(mode !== "football"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState(""),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has("advanced") || q.has("uploadId")) setAdvanced(true);
  }, []);
  const target =
    screen === "desktop"
      ? { width: 3840, height: 2160 }
      : screen === "4k"
        ? { width: 2160, height: 3840 }
        : { width: 1440, height: 3120 };
  const [font, setFont] = useState("sans"),
    [textScale, setTextScale] = useState(1),
    [spacing, setSpacing] = useState(0.008),
    [opacity, setOpacity] = useState(1),
    [templatePreview, setTemplatePreview] = useState("");
  const [fontStyle, setFontStyle] = useState("regular"),
    [align, setAlign] = useState("center"),
    [textBlur, setTextBlur] = useState(0);
  const design = {
    font,
    fontStyle,
    align,
    textBlur,
    textScale,
    spacing,
    opacity,
    ...styles[selected],
    primary,
    accent,
    name,
    badge,
    number,
    ...target,
  };
  const [photoStyle, setPhotoStyle] = useState(1),
    [photoPreview, setPhotoPreview] = useState(""),
    [previewBusy, setPreviewBusy] = useState(false);
  const photoStyles = [
    { name: "Original", primary: "#ffffff", secondary: "#222222" },
    { name: "Fire & ice", primary: "#ff693b", secondary: "#24bde3" },
    { name: "Stadium night", primary: "#77afff", secondary: "#122f78" },
    { name: "Golden glow", primary: "#ffd17a", secondary: "#8c4d12" },
  ];
  const [intensity, setIntensity] = useState(0.8),
    [keepOriginal, setKeepOriginal] = useState(false),
    [before, setBefore] = useState(false);
  const hasSubject = !!photo?.cutout && !keepOriginal;
  const photoId =
    keepOriginal && photo?.originalId ? photo.originalId : photo?.id;
  const photoOptions = {
    ...target,
    format: "png",
    ai: false,
    backgroundMode: hasSubject ? "art" : "blur",
    backgroundTemplate: "stadium",
    y: hasSubject ? 0.8 : 0.5,
    brightness: photoStyle ? 1 + 0.04 * intensity : 1,
    contrast: photoStyle ? 1 + 0.08 * intensity : 1,
    saturation: photoStyle ? 1 + 0.1 * intensity : 1,
    sharpen: !!photoStyle,
    vignette: !!photoStyle,
    padding: photoStyle ? 0.06 : 0,
    smartCrop: false,
    footballEffects: photoStyle
      ? {
          lighting: 0.5 * intensity,
          smoke: 0.55 * intensity,
          glow: 0.75 * intensity,
          primary: photoStyles[photoStyle].primary,
          secondary: photoStyles[photoStyle].secondary,
          pitch: false,
        }
      : undefined,
  };
  const serializedOptions = JSON.stringify(photoOptions);
  useEffect(() => {
    if (!usePhoto || !photo || advanced) return;
    const controller = new AbortController();
    let objectUrl = "";
    setPreviewBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/studio/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: photoId,
            options: JSON.parse(serializedOptions),
          }),
          signal: controller.signal,
        });
        if (!r.ok) throw Error((await r.json()).error);
        objectUrl = URL.createObjectURL(await r.blob());
        if (!controller.signal.aborted) setPhotoPreview(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        if (!controller.signal.aborted) setPreviewBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [photoId, usePhoto, serializedOptions, advanced]);
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );
  const serializedDesign = JSON.stringify(design);
  useEffect(() => {
    if (usePhoto || advanced) return;
    const controller = new AbortController();
    setPreviewBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/studio/template-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serializedDesign,
          signal: controller.signal,
        });
        if (!r.ok) throw Error((await r.json()).error);
        const url = URL.createObjectURL(await r.blob());
        if (!controller.signal.aborted) setTemplatePreview(url);
        else URL.revokeObjectURL(url);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Preview unavailable");
      } finally {
        if (!controller.signal.aborted) setPreviewBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [serializedDesign, usePhoto, advanced]);
  useEffect(
    () => () => {
      if (templatePreview) URL.revokeObjectURL(templatePreview);
    },
    [templatePreview],
  );
  const image = usePhoto
    ? before
      ? photo?.originalUrl || photo?.url
      : photoPreview || photo?.url
    : templatePreview ||
      "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(quickTemplateSvg(design));
  async function upload(file?: File) {
    if (!file) return;
    setBusy("Uploading your photo…");
    setError("");
    setResult("");
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setPhotoPreview("");
      const originalUrl = `/api/uploads/${d.id}/image`;
      setPhoto({ ...d, url: originalUrl, originalId: d.id, originalUrl });
      setBefore(false);
      setKeepOriginal(false);
      try {
        setBusy("Finding the best composition…");
        const { detectFaces } = await import("@/lib/face-fit");
        const faces = await detectFaces(file);
        if (faces.length) {
          const { cutout } = await import("@/lib/cutout");
          const subject = await cutout(file, setBusy);
          setBusy("Building your cinematic wallpaper…");
          const form = new FormData();
          form.set("file", subject, "subject.webp");
          const saved = await fetch("/api/uploads", {
            method: "POST",
            body: form,
          });
          const cut = await saved.json();
          if (!saved.ok) throw Error(cut.error);
          setPhoto({
            ...cut,
            url: `/api/uploads/${cut.id}/image`,
            originalId: d.id,
            originalUrl,
            cutout: true,
          });
        }
      } catch {
        setKeepOriginal(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
    }
  }
  async function create() {
    setError("");
    setResult("");
    setBusy("Preparing your wallpaper…");
    try {
      let id = photoId;
      if (!usePhoto) {
        const r = await fetch("/api/studio/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(design),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        id = d.id;
      }
      if (!id) throw Error("Choose a photo first.");
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: id,
          options: {
            ...(usePhoto ? photoOptions : target),
            format: "png",
            ai: false,
            backgroundMode: usePhoto ? photoOptions.backgroundMode : "crop",
            padding: usePhoto ? photoOptions.padding : 0,
            smartCrop: false,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const check = await fetch(`/api/jobs/${d.id}`);
        const job = await check.json();
        if (!check.ok || job.status === "failed")
          throw Error(job.error || "Export failed");
        if (job.status === "completed") {
          setResult(`/api/jobs/${d.id}/result?download=1`);
          return;
        }
        setBusy(`Creating wallpaper · ${job.progress || 0}%`);
      }
      throw Error(
        "Still processing. Your result will be available in My uploads.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create wallpaper");
    } finally {
      setBusy("");
    }
  }
  if (advanced)
    return (
      <>
        <div className="shell pt-5">
          <button
            className="chip"
            onClick={() => {
              history.replaceState(null, "", location.pathname);
              setAdvanced(false);
            }}
          >
            ← Back to simple creator
          </button>
        </div>
        <Studio mode={mode} />
      </>
    );
  return (
    <div className="shell quick-create">
      <div className="quick-heading">
        <p className="eyebrow">YOUR WALLPAPER. THREE SIMPLE STEPS.</p>
        <h1>
          {mode === "football"
            ? "Your club. Your screen."
            : mode === "smart-fit"
              ? "Make your photo fit."
              : "A wallpaper that feels like you."}
        </h1>
        <p className="muted">
          Upload a photo. We style it for you. Add a little touch, then
          download.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <Link className="chip" href="/studio">
            Create
          </Link>
          <Link className="chip" href="/football-creator">
            Football styles
          </Link>
          <Link className="chip" href="/smart-fit">
            Fit my photo
          </Link>
        </div>
      </div>
      <div className="quick-layout">
        <section className="quick-live">
          <div
            className="quick-image"
            style={
              {
                aspectRatio: target.width / target.height,
                "--quick-ratio": target.width / target.height,
              } as React.CSSProperties
            }
          >
            {image ? (
              <>
                <img
                  src={image}
                  alt="Your wallpaper design"
                  style={{ objectFit: "contain" }}
                />
                {usePhoto && photo && !photoPreview && (
                  <img className="quick-blur" src={photo.url} alt="" />
                )}
              </>
            ) : (
              <div className="muted p-8 text-center">
                Your photo will appear here
              </div>
            )}
            {previewBusy && (
              <div role="status" className="studio-preview-loading">
                <span className="studio-spinner" />
                Updating preview…
              </div>
            )}
          </div>
          <p className="muted text-xs mt-4 text-center">
            {target.width} × {target.height} ·{" "}
            {usePhoto
              ? hasSubject
                ? "Subject fitted automatically · cinematic background"
                : "Automatically styled · full photo preserved"
              : "Original customizable design"}
          </p>
          {image && compatibleDevices(target).length > 0 && !usePhoto && (
            <button className="chip mt-3" onClick={() => setPreview(true)}>
              Preview on {screen === "desktop" ? "desktop" : "Samsung"}
            </button>
          )}
        </section>
        <section className="quick-settings">
          <h2>1. Choose your starting point</h2>
          <div className="flex gap-2 my-4">
            <button
              className={"chip " + (!usePhoto ? "active" : "")}
              onClick={() => {
                setUsePhoto(false);
                setResult("");
              }}
            >
              Ready-made styles
            </button>
            <button
              className={"chip " + (usePhoto ? "active" : "")}
              onClick={() => {
                setUsePhoto(true);
                setResult("");
              }}
            >
              My photo
            </button>
          </div>
          {usePhoto ? (
            <>
              <div className="flex flex-wrap gap-2 my-4">
                {photoStyles.map((style, i) => (
                  <button
                    key={style.name}
                    className={"chip " + (photoStyle === i ? "active" : "")}
                    onClick={() => {
                      setPhotoStyle(i);
                      setResult("");
                    }}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
              <label className="quick-upload">
                Choose a photo
                <input
                  aria-label="Choose your photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!!busy}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
                <small>
                  Your photo stays private. The whole image is kept visible.
                </small>
              </label>
            </>
          ) : (
            <div className="quick-template-grid">
              {styles.map((style, i) => (
                <button
                  key={style.name}
                  aria-pressed={selected === i}
                  className={
                    "quick-template " + (selected === i ? "selected" : "")
                  }
                  onClick={() => {
                    setSelected(i);
                    setPrimary(style.primary);
                    setAccent(style.accent);
                    setResult("");
                  }}
                >
                  <img
                    alt=""
                    src={
                      "data:image/svg+xml;charset=utf-8," +
                      encodeURIComponent(
                        quickTemplateSvg({
                          ...style,
                          name: "YOUR CLUB",
                          badge: "FC",
                          number: "",
                          width: 240,
                          height: 520,
                        }),
                      )
                    }
                  />
                  <span>{style.name}</span>
                </button>
              ))}
            </div>
          )}
          <h2 className="mt-8">2. A little touch</h2>
          {usePhoto && photo && (
            <div className="quick-touches">
              <p className="text-sm text-teal-200 mb-4">
                Your look is applied automatically. Tweak it only if you want.
              </p>
              <label className="field">
                Effect strength
                <input
                  aria-label="Effect strength"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={intensity}
                  onChange={(e) => {
                    setIntensity(+e.target.value);
                    setResult("");
                  }}
                />
              </label>
              <button
                className="chip mt-3"
                aria-pressed={before}
                onClick={() => setBefore(!before)}
              >
                {before ? "Show styled wallpaper" : "Compare original"}
              </button>
              {photo.cutout && (
                <label className="flex gap-2 text-xs mt-4">
                  <input
                    type="checkbox"
                    checked={keepOriginal}
                    onChange={(e) => {
                      setKeepOriginal(e.target.checked);
                      setResult("");
                    }}
                  />
                  Keep original background
                </label>
              )}
            </div>
          )}
          {!usePhoto && (
            <>
              <label className="field mt-4">
                Club or custom name
                <input
                  maxLength={24}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setResult("");
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="field">
                  Badge initials
                  <input
                    maxLength={3}
                    value={badge}
                    onChange={(e) => {
                      setBadge(e.target.value.toUpperCase());
                      setResult("");
                    }}
                  />
                </label>
                <label className="field">
                  Number (optional)
                  <input
                    maxLength={3}
                    value={number}
                    onChange={(e) => {
                      setNumber(e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <label className="field">
                  Stripe color
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => {
                      setPrimary(e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <label className="field">
                  Badge & text color
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => {
                      setAccent(e.target.value);
                      setResult("");
                    }}
                  />
                </label>
              </div>
              <p className="text-xs muted mt-3">
                An original monogram badge inspired by classic football crests.
              </p>
            </>
          )}
          {!usePhoto && (
            <details className="quick-style">
              <summary>Style</summary>
              <div className="quick-style-body">
                <label className="field">
                  Type
                  <select
                    aria-label="Font type"
                    value={fontStyle}
                    onChange={(e) => {
                      setFontStyle(e.target.value);
                      setResult("");
                    }}
                  >
                    <option value="regular">Regular</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="bold-italic">Bold Italic</option>
                  </select>
                </label>
                <div className="field">
                  <FontPicker
                    value={font}
                    onChange={(v) => {
                      setFont(v);
                      setResult("");
                    }}
                  />
                </div>
                <label className="field mt-4">
                  Name size
                  <input
                    type="range"
                    min=".6"
                    max="1.5"
                    step=".01"
                    value={textScale}
                    onChange={(e) => {
                      setTextScale(+e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <div
                  className="quick-alignment"
                  role="group"
                  aria-label="Text alignment"
                >
                  {["left", "center", "right"].map((v) => (
                    <button
                      key={v}
                      aria-label={`Align ${v}`}
                      aria-pressed={align === v}
                      onClick={() => {
                        setAlign(v);
                        setResult("");
                      }}
                    >
                      {v === "left" ? (
                        <AlignLeft size={20} />
                      ) : v === "center" ? (
                        <AlignCenter size={20} />
                      ) : (
                        <AlignRight size={20} />
                      )}
                      <small>{v}</small>
                    </button>
                  ))}
                </div>
                <p className="quick-style-caption">Advanced typography</p>
                <label className="field mt-4">
                  Letter spacing
                  <input
                    type="range"
                    min="0"
                    max=".03"
                    step=".001"
                    value={spacing}
                    onChange={(e) => {
                      setSpacing(+e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <label className="field mt-4">
                  Fill
                  <input
                    aria-label="Style fill"
                    style={{ background: accent, width: "100%", height: 42 }}
                    type="color"
                    value={accent}
                    onChange={(e) => {
                      setAccent(e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <label className="field mt-4">
                  Text opacity · {Math.round(opacity * 100)}%
                  <input
                    aria-label="Text opacity"
                    type="range"
                    min=".2"
                    max="1"
                    step=".01"
                    value={opacity}
                    onChange={(e) => {
                      setOpacity(+e.target.value);
                      setResult("");
                    }}
                  />
                </label>
                <label className="field mt-4">
                  Blur
                  <input
                    aria-label="Text blur"
                    type="range"
                    min="0"
                    max="8"
                    step=".1"
                    value={textBlur}
                    onChange={(e) => {
                      setTextBlur(+e.target.value);
                      setResult("");
                    }}
                  />
                </label>
              </div>
            </details>
          )}
          <label className="field mt-4">
            Your screen
            <select
              aria-label="Your screen"
              value={screen}
              onChange={(e) => {
                setScreen(e.target.value);
                setResult("");
              }}
            >
              <option value="samsung">Samsung Galaxy · 1440 × 3120</option>
              <option value="4k">Portrait 4K · 2160 × 3840</option>
              <option value="desktop">Desktop 4K · 3840 × 2160</option>
            </select>
          </label>
          <h2 className="mt-8">3. Save your wallpaper</h2>
          <button
            className="quick-download"
            disabled={!!busy || (usePhoto && !photo)}
            onClick={create}
          >
            {busy || "Create wallpaper"}
          </button>
          {busy && (
            <p role="status" className="text-sm text-teal-200 mt-3">
              <span className="studio-spinner inline-block mr-2" />
              {busy}
            </p>
          )}
          {result && (
            <a
              className="quick-download inline-block text-center"
              href={result}
              download
            >
              Download wallpaper ↓
            </a>
          )}
          {error && (
            <p role="alert" className="error mt-4">
              {error}
            </p>
          )}
          <p className="muted text-xs mt-3">
            PNG download. Phone clocks and app icons are never included.
          </p>
          <button className="quick-advanced" onClick={() => setAdvanced(true)}>
            Need more control? Open advanced editor →
          </button>
        </section>
      </div>
      {preview && image && (
        <PhonePreview
          wallpaper={{
            id: "template",
            title: name || "Your design",
            imageSrc: image,
            ...target,
          }}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
