"use client";
import { useState, useEffect } from "react";
import { PhonePreview } from "./phone-preview";
export function WallpaperActions({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [previewDevice, setPreviewDevice] = useState("iphone"),
    [favorite, setFavorite] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    try {
      setFavorite(
        JSON.parse(
          localStorage.getItem("wallspace-favorites") || "[]",
        ).includes(id),
      );
    } catch {}
  }, [id]);
  async function edit(intent: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/wallpapers/${id}/edit`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      location.href = `${intent === "smart-fit" ? "/smart-fit" : intent === "football" ? "/football-creator" : "/studio"}?uploadId=${encodeURIComponent(d.id)}&intent=${intent}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open image");
      setBusy(false);
    }
  }
  return (
    <div className="panel mt-5">
      <h2 className="text-lg mb-4">Make it yours</h2>
      <div className="flex flex-wrap gap-2">
        <button
          className="chip"
          disabled={busy}
          onClick={() => edit("smart-fit")}
        >
          Smart Fit
        </button>
        <button
          className="chip"
          disabled={busy}
          onClick={() => edit("football")}
        >
          Football Creator
        </button>
        <button className="chip" disabled={busy} onClick={() => edit("edit")}>
          Customize wallpaper
        </button>
        <button className="chip" disabled={busy} onClick={() => edit("text")}>
          Add text
        </button>
        <button
          className="chip"
          disabled={busy}
          onClick={() => edit("enhance")}
        >
          Enhance to 4K
        </button>
        <button
          className="chip"
          onClick={() => {
            setPreviewDevice("iphone");
            setPreview(true);
          }}
        >
          Preview on My Phone
        </button>
        <button
          className="chip"
          onClick={() => {
            setPreviewDevice("windows");
            setPreview(true);
          }}
        >
          Preview on Desktop
        </button>
        <button
          className={"chip " + (favorite ? "active" : "")}
          onClick={() => {
            const saved: string[] = JSON.parse(
              localStorage.getItem("wallspace-favorites") || "[]",
            );
            localStorage.setItem(
              "wallspace-favorites",
              JSON.stringify(
                favorite ? saved.filter((x) => x !== id) : [...saved, id],
              ),
            );
            setFavorite(!favorite);
          }}
        >
          {favorite ? "Saved to favorites" : "Save to favorites"}
        </button>
        <button
          className="chip"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({ title, url: location.href });
              else {
                await navigator.clipboard.writeText(location.href);
                setMessage("Link copied.");
              }
            } catch {
              setMessage("Share canceled.");
            }
          }}
        >
          Share
        </button>
      </div>
      {busy && (
        <p role="status" className="text-xs muted mt-3">
          Preparing your editable original…
        </p>
      )}
      {error && <p className="error mt-3">{error}</p>}
      {message && (
        <p role="status" className="text-xs mt-3">
          {message}
        </p>
      )}
      {preview && (
        <PhonePreview
          wallpaper={{ id, title }}
          initialDevice={previewDevice}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
