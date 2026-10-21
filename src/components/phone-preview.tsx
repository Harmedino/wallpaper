"use client";
import { useEffect, useRef } from "react";
import { DevicePreview } from "./device-preview";
export function PhonePreview({
  wallpaper,
  onClose,
  onCropChange,
  onDeviceChange,
  initialDevice,
}: {
  wallpaper: {
    id: string;
    title: string;
    imageSrc?: string;
    width: number;
    height: number;
  };
  onClose: () => void;
  initialDevice?: string;
  onCropChange?: (x: number, y: number) => void;
  onDeviceChange?: (w: number, h: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="phone-preview-dialog"
      aria-label="Preview wallpaper on your devices"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
        <DevicePreview
          wallpaper={wallpaper}
          initialDevice={initialDevice}
          onCropChange={onCropChange}
          onDeviceChange={onDeviceChange}
          showDownload={!wallpaper.imageSrc}
        />
      </div>
    </dialog>
  );
}
