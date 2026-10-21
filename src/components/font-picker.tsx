"use client";
import { useState, useRef, useEffect } from "react";
import { textFonts } from "@/lib/studio-presets";
export function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const selected = textFonts[value as keyof typeof textFonts];
  return (
    <div ref={root} className="font-picker">
      <span className="text-xs muted">Font</span>
      <button
        type="button"
        role="combobox"
        aria-label="Font"
        aria-expanded={open}
        aria-controls="font-options"
        aria-haspopup="listbox"
        className="font-picker-trigger"
        style={{ fontFamily: `'${selected?.family}'` }}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setTimeout(
              () =>
                root.current
                  ?.querySelector<HTMLButtonElement>("[role=option]")
                  ?.focus(),
              0,
            );
          }
        }}
      >
        {selected?.label} <span>⌄</span>
      </button>
      {open && (
        <div className="font-picker-popup">
          <input
            aria-label="Search fonts"
            placeholder="Search fonts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div
            id="font-options"
            role="listbox"
            aria-label="Font previews"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                const options = Array.from(
                  root.current!.querySelectorAll<HTMLButtonElement>(
                    "[role=option]",
                  ),
                );
                const i = options.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                options[
                  (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) %
                    options.length
                ]?.focus();
              }
            }}
          >
            {Object.entries(textFonts)
              .filter(([, f]) =>
                f.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map(([id, f]) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={id === value}
                  key={id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setQuery("");
                    root.current
                      ?.querySelector<HTMLButtonElement>("[role=combobox]")
                      ?.focus();
                  }}
                  style={{ fontFamily: `'${f.family}'` }}
                >
                  <span>{f.label}</span>
                  <span className="font-picker-sample">
                    Make it yours · Aa 123
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
