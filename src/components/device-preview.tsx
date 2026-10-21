"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Wifi,
  BatteryFull,
  Signal,
  Camera,
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
export const devices = [
  {
    id: "iphone",
    group: "phone",
    name: "iPhone 16 Pro",
    width: 1206,
    height: 2622,
    os: "ios",
  },
  {
    id: "iphone-max",
    group: "phone",
    name: "iPhone 16 Pro Max",
    width: 1320,
    height: 2868,
    os: "ios",
  },
  {
    id: "android",
    group: "phone",
    name: "Galaxy S25 Ultra",
    width: 1440,
    height: 3120,
    os: "android",
  },
  {
    id: "pixel",
    group: "phone",
    name: "Pixel 9 Pro",
    width: 1280,
    height: 2856,
    os: "android",
  },
  {
    id: "windows",
    group: "desktop",
    name: "Windows · 4K monitor",
    width: 3840,
    height: 2160,
    os: "windows",
  },
  {
    id: "mac",
    group: "desktop",
    name: "MacBook Pro 14",
    width: 3024,
    height: 1964,
    os: "mac",
  },
  {
    id: "ultrawide",
    group: "desktop",
    name: "Windows · Ultrawide",
    width: 3440,
    height: 1440,
    os: "windows",
  },
  {
    id: "ipad",
    group: "ipad",
    name: "iPad Pro 12.9",
    width: 2732,
    height: 2048,
    os: "ios",
  },
];
type Props = {
  wallpaper: { id: string; title: string; imageSrc?: string };
  onCropChange?: (x: number, y: number) => void;
  onDeviceChange?: (width: number, height: number) => void;
  showDownload?: boolean;
  initialDevice?: string;
};
export function DevicePreview({
  wallpaper,
  onCropChange,
  onDeviceChange,
  showDownload = true,
  initialDevice = "iphone",
}: Props) {
  const [deviceId, setDeviceId] = useState(initialDevice),
    [mode, setMode] = useState("lock"),
    [loading, setLoading] = useState(true),
    [x, setX] = useState(0.5),
    [y, setY] = useState(0.5),
    [widgets, setWidgets] = useState(true),
    [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState("9:41"),
    [date, setDate] = useState("Wednesday, October 21");
  const frame = useRef<HTMLDivElement>(null);
  const d = devices.find((v) => v.id === deviceId)!;
  useEffect(() => {
    const now = new Date();
    setClock(
      now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
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
    ["Calendar", Calendar, "#e7e5e0"],
    ["Camera", Camera, "#606b79"],
    ["Photos", Images, "#b8b873"],
    ["Messages", MessageCircle, "#57a978"],
    ["Mail", Mail, "#559fc7"],
    ["Music", Music, "#ce6c8c"],
    ["Maps", Map, "#7cba9b"],
    ["Settings", Settings, "#798897"],
  ] as const;
  function choose(id: string) {
    setDeviceId(id);
    const next = devices.find((v) => v.id === id)!;
    onDeviceChange?.(next.width, next.height);
  }
  function crop(nextX: number, nextY: number) {
    setX(nextX);
    setY(nextY);
    onCropChange?.(nextX, nextY);
  }
  return (
    <div
      className={"device-preview " + (fullscreen ? "device-fullscreen" : "")}
    >
      <h2 className="text-lg">Preview on your screen</h2>
      <div className="flex flex-wrap gap-2 justify-center my-4">
        {[
          ["phone", "Phone"],
          ["desktop", "Desktop"],
          ["ipad", "iPad"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={"chip " + (d.group === id ? "active" : "")}
            onClick={() => choose(devices.find((v) => v.group === id)!.id)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="field mb-3">
        Device preset
        <select value={deviceId} onChange={(e) => choose(e.target.value)}>
          {devices
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
        ].map(([id, label]) => (
          <button
            key={id}
            className={"chip " + (mode === id ? "active" : "")}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={frame}
        className={"phone-mockup device-" + d.group + " os-" + d.os}
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
            objectPosition: onCropChange ? "center" : `${x * 100}% ${y * 100}%`,
          }}
        />
        {loading && (
          <div role="status" className="studio-preview-loading">
            <span className="studio-spinner" />
            Loading wallpaper…
          </div>
        )}
        {mode !== "wallpaper" && (
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
            {d.group === "desktop" && mode === "home" ? (
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
            ) : mode === "lock" ? (
              <div className="phone-lock">
                <p>{date}</p>
                <strong>{clock}</strong>
                {widgets && (
                  <span className="lock-widgets">
                    ☀ 24° &nbsp; ◉ Activity &nbsp; ♡ Focus
                  </span>
                )}
              </div>
            ) : (
              <div className="phone-home">
                <div className="phone-widget">
                  {date}
                  <br />
                  <strong>Make today yours.</strong>
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
                  <MessageCircle />
                  <Globe />
                  <Mail />
                  <Music />
                </div>
              </div>
            )}
            {d.group !== "desktop" && <div className="phone-home-bar" />}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <label className="field">
          Preview horizontal crop
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={x}
            onChange={(e) => crop(+e.target.value, y)}
          />
        </label>
        <label className="field">
          Preview vertical crop
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={y}
            onChange={(e) => crop(x, +e.target.value)}
          />
        </label>
      </div>
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
          href={`/wallpaper/${wallpaper.id}?device=${d.group}&width=${d.width}&height=${d.height}&x=${x}&y=${y}&orientation=${d.group === "phone" ? "portrait" : "landscape"}`}
        >
          Choose resolution & download →
        </Link>
      )}
    </div>
  );
}
