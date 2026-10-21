"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Wifi,
  BatteryFull,
  Signal,
  Camera,
  Phone,
  CloudSun,
  LockKeyhole,
  Pause,
  Images,
  Mail,
  Music,
  Map,
  Settings,
  Calendar,
  MessageCircle,
  Folder,
  Trash2,
  Globe,
  Search,
  Monitor,
} from "lucide-react";
import { compatibleDevices } from "@/lib/device-fit";
type Props = {
  wallpaper: {
    id: string;
    title: string;
    imageSrc?: string;
    width: number;
    height: number;
  };
  onCropChange?: (x: number, y: number) => void;
  onDeviceChange?: (width: number, height: number) => void;
  showDownload?: boolean;
  initialDevice?: string;
};
export function DevicePreview({
  wallpaper,
  onDeviceChange,
  showDownload = true,
  initialDevice = "android",
}: Props) {
  const [deviceId, setDeviceId] = useState(initialDevice),
    [mode, setMode] = useState("lock"),
    [loading, setLoading] = useState(true),
    [widgets, setWidgets] = useState(true),
    [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState("9:41"),
    [date, setDate] = useState("Wednesday, October 21");
  const frame = useRef<HTMLDivElement>(null);
  const fitting = compatibleDevices(wallpaper);
  const d = fitting.find((v) => v.id === deviceId) || fitting[0];
  useEffect(() => {
    const now = new Date();
    setClock(
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
    setDate(
      now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);
  const apps = [
    ["Calendar", Calendar, "#49ae75"],
    ["Camera", Camera, "#f14c67"],
    ["Gallery", Images, "#fa6686"],
    ["Messages", MessageCircle, "#348bf3"],
    ["Email", Mail, "#ea594a"],
    ["Music", Music, "#8c56de"],
    ["Maps", Map, "#7cba9b"],
    ["Settings", Settings, "#798897"],
  ] as const;
  function choose(id: string) {
    setDeviceId(id);
    const next = fitting.find((v) => v.id === id)!;
    onDeviceChange?.(next.width, next.height);
  }
  if (!d)
    return (
      <div className="notice mt-4">
        <p>
          No device preview matches this image’s aspect ratio without cropping.
        </p>
        <Link className="chip inline-block mt-3" href="/smart-fit">
          Fit it to your screen →
        </Link>
      </div>
    );
  const screenMode = d.group === "desktop" && mode === "lock" ? "home" : mode;
  return (
    <div
      className={"device-preview " + (fullscreen ? "device-fullscreen" : "")}
    >
      <h2 className="text-lg">Preview on your screen</h2>
      {d.os === "android" && (
        <p className="one-ui-label">SAMSUNG GALAXY · ONE UI 7 PREVIEW</p>
      )}
      <div className="flex flex-wrap gap-2 justify-center my-4">
        {[
          ["phone", "Phone"],
          ["desktop", "Desktop"],
          ["ipad", "iPad"],
        ]
          .filter(([id]) => fitting.some((v) => v.group === id))
          .map(([id, label]) => (
            <button
              key={id}
              className={"chip " + (d.group === id ? "active" : "")}
              onClick={() => choose(fitting.find((v) => v.group === id)!.id)}
            >
              {label}
            </button>
          ))}
      </div>
      <label className="field mb-3">
        Device preset
        <select value={d.id} onChange={(e) => choose(e.target.value)}>
          {fitting
            .filter((v) => v.group === d.group)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.width} × {v.height}
              </option>
            ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2 justify-center my-4">
        {[
          ["lock", "Lock screen"],
          ["home", d.group === "desktop" ? "Desktop view" : "Home screen"],
          ["wallpaper", "Wallpaper only"],
        ]
          .filter(([id]) => d.group !== "desktop" || id !== "lock")
          .map(([id, label]) => (
            <button
              key={id}
              className={"chip " + (screenMode === id ? "active" : "")}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
      </div>
      <div
        ref={frame}
        className={
          "phone-mockup device-" +
          d.group +
          " os-" +
          d.os +
          (d.os === "android" ? " one-ui-7" : "")
        }
        style={{ aspectRatio: d.width / d.height }}
      >
        <img
          src={
            wallpaper.imageSrc || `/api/wallpapers/${wallpaper.id}/thumbnail`
          }
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          alt={`${wallpaper.title} ${d.group} preview`}
          style={{
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
        {loading && (
          <div role="status" className="studio-preview-loading">
            <span className="studio-spinner" />
            Loading wallpaper…
          </div>
        )}
        {screenMode !== "wallpaper" && (
          <>
            {d.group !== "desktop" && (
              <>
                <div className="phone-island" />
                <div className="device-status">
                  <span>{clock}</span>
                  <span>
                    <Signal size={11} />
                    <Wifi size={11} />
                    <BatteryFull size={15} />
                  </span>
                </div>
              </>
            )}
            {d.group === "desktop" && screenMode === "home" ? (
              <div className="desktop-interface">
                <div className="desktop-menu">
                  {d.os === "mac"
                    ? "● Finder    File    Edit    View    Go    Window"
                    : "Windows desktop"}
                </div>
                <div className="desktop-icons">
                  {[
                    [Folder, "Documents"],
                    [Globe, "Browser"],
                    [Trash2, "Recycle Bin"],
                  ].map(([Icon, label]) => {
                    const C = Icon as typeof Folder;
                    return (
                      <span key={String(label)}>
                        <C size={28} />
                        {String(label)}
                      </span>
                    );
                  })}
                </div>
                <div className="desktop-taskbar">
                  <Monitor size={20} />
                  <Search size={17} />
                  <Folder size={22} />
                  <Globe size={22} />
                  <Mail size={22} />
                  <span>{clock}</span>
                </div>
              </div>
            ) : screenMode === "lock" ? (
              <div className="phone-lock">
                {d.os === "android" && (
                  <LockKeyhole size={16} className="one-ui-lock-icon" />
                )}
                <strong>{clock}</strong>
                <p>{date}</p>
                {widgets && (
                  <span className="lock-widgets">
                    <CloudSun size={18} /> 24° <span>Sunny</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="phone-home">
                <div className="phone-widget">
                  {date}
                  <br />
                  <strong>
                    <CloudSun size={28} /> 24°
                  </strong>
                  <span>Sunny · Tap for weather</span>
                </div>
                <div className="phone-apps">
                  {apps.map(([name, Icon, color]) => (
                    <div key={name} className="device-app">
                      <span style={{ background: color }}>
                        <Icon size={25} />
                      </span>
                      <small>{name}</small>
                    </div>
                  ))}
                </div>
                <div className="phone-dock">
                  <span className="one-ui-dock-phone">
                    <Phone />
                  </span>
                  <span className="one-ui-dock-message">
                    <MessageCircle />
                  </span>
                  <span className="one-ui-dock-browser">
                    <Globe />
                  </span>
                  <span className="one-ui-dock-camera">
                    <Camera />
                  </span>
                </div>
              </div>
            )}
            {d.os === "android" && screenMode === "lock" && (
              <>
                <div className="one-ui-shortcuts">
                  <span>
                    <Phone size={18} />
                  </span>
                  <span>
                    <Camera size={18} />
                  </span>
                </div>
                <div className="one-ui-now-bar">
                  <Music size={14} />
                  <span>Now playing</span>
                  <span>
                    <Pause size={12} />
                  </span>
                </div>
              </>
            )}
            {d.group !== "desktop" && <div className="phone-home-bar" />}
          </>
        )}
      </div>
      <p className="text-xs text-teal-200 mt-4">
        Full image visible · matching aspect ratio · no preview crop
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        <label className="text-xs flex gap-2">
          <input
            type="checkbox"
            checked={widgets}
            onChange={(e) => setWidgets(e.target.checked)}
          />
          Widgets
        </label>
        <button className="chip" onClick={() => setFullscreen(!fullscreen)}>
          {fullscreen ? "Close fullscreen" : "Fullscreen preview"}
        </button>
      </div>
      <p className="text-xs muted my-4">
        Device frames, clocks and icons are preview overlays. They are never
        included in your wallpaper export.
      </p>
      {showDownload && (
        <Link
          className="chip active inline-block"
          href={`/wallpaper/${wallpaper.id}?device=${d.group}&width=${d.width}&height=${d.height}&x=0.5&y=0.5&orientation=${d.group === "phone" ? "portrait" : "landscape"}`}
        >
          Choose resolution & download →
        </Link>
      )}
    </div>
  );
}
