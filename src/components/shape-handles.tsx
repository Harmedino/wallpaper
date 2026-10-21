"use client";
import { useRef } from "react";
export type EditorShape = {
  id: string;
  kind: "rectangle" | "ellipse" | "star" | "heart";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  rotation: number;
};
export function ShapeHandles({
  shapes,
  selected,
  onSelect,
  onChange,
}: {
  shapes: EditorShape[];
  selected: string;
  onSelect: (id: string) => void;
  onChange: (shape: EditorShape) => void;
}) {
  const drag = useRef<{
    shape: EditorShape;
    x: number;
    y: number;
    width: number;
    height: number;
    resize: boolean;
  } | null>(null);
  return (
    <>
      {shapes.map((s) => (
        <div
          key={s.id}
          className={
            "studio-shape-handle " + (selected === s.id ? "selected" : "")
          }
          role="button"
          tabIndex={0}
          aria-label={`Move ${s.kind} layer`}
          style={{
            left: `${s.x * (1 - s.width) * 100}%`,
            top: `${s.y * (1 - s.height) * 100}%`,
            width: `${s.width * 100}%`,
            height: `${s.height * 100}%`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            onSelect(s.id);
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.parentElement!.getBoundingClientRect();
            drag.current = {
              shape: s,
              x: e.clientX,
              y: e.clientY,
              width: r.width,
              height: r.height,
              resize: !!(e.target as HTMLElement).dataset.resize,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const clamp = (v: number, min = 0) => Math.max(min, Math.min(1, v));
            const dx = (e.clientX - d.x) / d.width,
              dy = (e.clientY - d.y) / d.height;
            onChange(
              d.resize
                ? {
                    ...d.shape,
                    width: clamp(d.shape.width + dx, 0.01),
                    height: clamp(d.shape.height + dy, 0.01),
                  }
                : {
                    ...d.shape,
                    x: clamp(
                      d.shape.x + dx / Math.max(0.01, 1 - d.shape.width),
                    ),
                    y: clamp(
                      d.shape.y + dy / Math.max(0.01, 1 - d.shape.height),
                    ),
                  },
            );
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            if (e.key.startsWith("Arrow")) {
              e.preventDefault();
              onChange({
                ...s,
                x: Math.max(
                  0,
                  Math.min(
                    1,
                    s.x +
                      (e.key === "ArrowRight"
                        ? 0.01
                        : e.key === "ArrowLeft"
                          ? -0.01
                          : 0),
                  ),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    1,
                    s.y +
                      (e.key === "ArrowDown"
                        ? 0.01
                        : e.key === "ArrowUp"
                          ? -0.01
                          : 0),
                  ),
                ),
              });
            }
          }}
        >
          {selected === s.id && (
            <span data-resize="true" className="studio-text-resize" />
          )}
        </div>
      ))}
    </>
  );
}
