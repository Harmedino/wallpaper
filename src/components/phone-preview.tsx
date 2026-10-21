"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
export function PhonePreview({
  wallpaper,
  onClose,
}: {
  wallpaper: { id: string; title: string };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("lock");
  const [device, setDevice] = useState("phone");
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="phone-preview-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Preview wallpaper on your devices"
    >
      <div className="phone-preview-content">
        <button
          className="phone-preview-close"
          onClick={onClose}
          aria-label="Close phone preview"
        >
          ✕
        </button>
        <h2>{wallpaper.title}</h2>
        <p className="muted text-sm">See how it feels on your screen.</p>
        <div className="flex gap-2 justify-center my-4">
          {[
            ["phone", "Phone"],
            ["desktop", "Desktop"],
            ["ipad", "iPad"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={"chip " + (device === id ? "active" : "")}
              onClick={() => setDevice(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center my-4">
          <button
            className={"chip " + (screen === "lock" ? "active" : "")}
            onClick={() => setScreen("lock")}
          >
            Lock screen
          </button>
          <button
            className={"chip " + (screen === "home" ? "active" : "")}
            onClick={() => setScreen("home")}
          >
            Home screen
          </button>
        </div>
        <div className={"phone-mockup device-" + device}>
          <img
            src={`/api/wallpapers/${wallpaper.id}/thumbnail`}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            alt={`${wallpaper.title} ${device} preview`}
          />
          {loading && (
            <div role="status" className="studio-preview-loading">
              <span className="studio-spinner" />
              Loading wallpaper…
            </div>
          )}
          <div className="phone-island" />
          {screen === "lock" ? (
            <div className="phone-lock">
              <p>Wednesday, October 21</p>
              <strong>9:41</strong>
              <span>☀ 24° &nbsp; A little inspiration.</span>
            </div>
          ) : (
            <div className="phone-home">
              <div className="phone-widget">
                Wednesday
                <br />
                <strong>Make today yours.</strong>
              </div>
              <div className="phone-apps">
                {["☀", "♫", "✉", "◉", "▦", "◷", "♡", "✦"].map((icon, i) => (
                  <span key={i}>{icon}</span>
                ))}
              </div>
              <div className="phone-dock">☎ &nbsp; ◉ &nbsp; ✉ &nbsp; ♫</div>
            </div>
          )}
          <div className="phone-home-bar" />
        </div>
        <p className="text-xs muted my-4">
          Centered crop preview. The fit can vary by device.
        </p>
        <Link
          className="chip active inline-block"
          href={`/wallpaper/${wallpaper.id}?device=${device}&orientation=${device === "phone" ? "portrait" : "landscape"}`}
        >
          Choose resolution & download →
        </Link>
      </div>
    </dialog>
  );
}
