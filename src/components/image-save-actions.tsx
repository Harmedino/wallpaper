"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share2, ExternalLink, CheckCircle2 } from "lucide-react";
type Props = {
  src: string;
  viewUrl?: string;
  filename: string;
  width: number;
  height: number;
  autoPrepare?: boolean;
  downloadLabel?: string;
  onVerified?: (file: File) => void;
  compact?: boolean;
};
export async function decodeImageDimensions(blob: Blob) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function ImageSaveActions({
  src,
  viewUrl,
  filename,
  width,
  height,
  autoPrepare = false,
  downloadLabel = "Download wallpaper",
  onVerified,
  compact = false,
}: Props) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [canShare, setCanShare] = useState(false),
    [platform, setPlatform] = useState("desktop");
  const fileRef = useRef<{ src: string; file: File } | null>(null);
  const current = useRef(src),
    pending = useRef<Promise<File> | null>(null),
    urlRef = useRef("");
  current.current = src;
  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(
      /iPhone|iPad|iPod/.test(ua) ||
        (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
        ? "ios"
        : /Android/.test(ua)
          ? "android"
          : "desktop",
    );
  }, []);
  useEffect(() => {
    fileRef.current = null;
    setFile(null);
    setError("");
    setStatus("");
    setCanShare(false);
    pending.current = null;
    setBusy(false);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
  }, [src]);
  useEffect(
    () => () => {
      current.current = "";
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  async function prepare() {
    if (fileRef.current?.src === src) return fileRef.current.file;
    if (pending.current) return pending.current;
    const requested = src;
    setBusy(true);
    setError("");
    setStatus("Preparing wallpaper…");
    const task = (async () => {
      const response = await fetch(requested);
      if (!response.ok) {
        let message = "Unable to prepare wallpaper. Try again.";
        try {
          message = (await response.json()).error || message;
        } catch {}
        throw Error(message);
      }
      const type = (response.headers.get("Content-Type") || "").split(";")[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(type))
        throw Error("The server did not return a supported image file.");
      const blob = await response.blob();
      const dims = await decodeImageDimensions(blob);
      if (dims.width !== width || dims.height !== height)
        throw Error(
          `Image verification failed: expected ${width} × ${height}, received ${dims.width} × ${dims.height}.`,
        );
      const next = new File([blob], filename, {
        type,
        lastModified: Date.now(),
      });
      if (current.current !== requested)
        throw Error("Your settings changed. Prepare the updated wallpaper.");
      fileRef.current = { src: requested, file: next };
      setFile(next);
      let supported = false;
      try {
        supported =
          !!navigator.share && !!navigator.canShare?.({ files: [next] });
      } catch {}
      setCanShare(supported);
      setStatus("Ready to save");
      onVerified?.(next);
      return next;
    })();
    pending.current = task;
    try {
      return await task;
    } catch (e) {
      if (current.current === requested) {
        setError(e instanceof Error ? e.message : "Unable to download.");
        setStatus("Unable to prepare wallpaper");
      }
      throw e;
    } finally {
      if (current.current === requested) {
        setBusy(false);
        pending.current = null;
      }
    }
  }
  useEffect(() => {
    if (autoPrepare) prepare().catch(() => {});
  }, [src, autoPrepare]);
  function objectUrl(next: File) {
    if (!urlRef.current) urlRef.current = URL.createObjectURL(next);
    return urlRef.current;
  }
  async function download() {
    try {
      const next = await prepare();
      if (current.current !== src) return;
      const link = document.createElement("a");
      link.href = objectUrl(next);
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setStatus("Download started — check your Downloads folder.");
    } catch {}
  }
  function share() {
    if (!file) return;
    setError("");
    try {
      if (!navigator.canShare?.({ files: [file] })) {
        setCanShare(false);
        setStatus("Open the image below to save it.");
        return;
      }
      // File is already prepared: invoke native sharing synchronously in the click gesture.
      const result = navigator.share({ files: [file], title: filename });
      setStatus(
        "Choose Save Image or your preferred destination in the share sheet.",
      );
      result
        .then(() =>
          setStatus("Share sheet closed. Check the destination you selected."),
        )
        .catch((e) => {
          if (e?.name === "AbortError")
            setStatus("Sharing canceled. Your image is still ready.");
          else {
            setError(
              "Sharing is unavailable. Use Open full-resolution image or Download File.",
            );
            setCanShare(false);
          }
        });
    } catch (e) {
      if ((e as Error).name === "AbortError")
        setStatus("Sharing canceled. Your image is still ready.");
      else {
        setCanShare(false);
        setError(
          "Sharing is unavailable. Open the image or download the file.",
        );
      }
    }
  }
  return (
    <section
      className={"image-save-actions " + (compact ? "save-compact" : "")}
      aria-label="Save your wallpaper"
    >
      {!file && (
        <button
          className="save-primary"
          onClick={
            platform === "desktop" ? download : () => prepare().catch(() => {})
          }
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="studio-spinner" /> Preparing wallpaper…
            </>
          ) : (
            <>
              <Download size={18} />
              {platform === "desktop" ? downloadLabel : "Prepare wallpaper"}
            </>
          )}
        </button>
      )}
      {file && (
        <>
          <p className="save-verified">
            <CheckCircle2 size={15} />
            Verified {width} × {height} ·{" "}
            {file.type.replace("image/", "").toUpperCase()} ·{" "}
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
          <div className="save-buttons">
            {canShare && (
              <button className="save-primary" onClick={share}>
                <Share2 size={18} />
                Save / Share Image
              </button>
            )}
            <button
              className={canShare ? "save-secondary" : "save-primary"}
              onClick={download}
            >
              <Download size={17} />
              {platform === "desktop" ? downloadLabel : "Download File"}
            </button>
            <a
              className="save-secondary"
              href={viewUrl || objectUrl(file)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} />
              Open full-resolution image
            </a>
          </div>
        </>
      )}
      {status && (
        <p role="status" className="save-status">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="error mt-3">
          {error}
        </p>
      )}
      <div className="save-help">
        {platform === "ios" ? (
          <p>
            <strong>Save to Photos:</strong> choose Save Image in the share
            sheet when available. Otherwise open the full-resolution image,
            touch and hold it, then choose Save to Photos. Download File saves
            to <strong>Files → Downloads</strong>, not directly to Photos.
          </p>
        ) : platform === "android" ? (
          <p>
            <strong>On Android:</strong> use the share sheet or download the
            file. Look in Downloads or your browser’s downloads list; Gallery or
            Google Photos may also show it. Open the file to check it.
          </p>
        ) : (
          <p>
            The download is the verified image file. Choose Fit or Fill in your
            computer’s wallpaper settings to match the composition.
          </p>
        )}
        <details>
          <summary>Help finding your wallpaper</summary>
          <p>
            iPhone/iPad: open Files → Browse → Downloads (or your selected
            Safari download location). Open the image, tap Share, then Save
            Image if offered. A website cannot verify whether an image reached
            Photos.
          </p>
          <p>
            Android: open Files/My Files → Downloads, or your browser’s
            Downloads menu. Open the image, then use your device’s Set as
            wallpaper option. Gallery indexing varies by device.
          </p>
        </details>
      </div>
    </section>
  );
}
