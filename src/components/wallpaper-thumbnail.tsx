"use client";
import { useEffect, useState } from "react";
export function WallpaperThumbnail({
  id,
  title,
  eager,
  height,
  width = 1100,
}: {
  id: string;
  title: string;
  eager: boolean;
  height: number;
  width?: number;
}) {
  const [attempt, setAttempt] = useState(0),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!failed || attempt >= 3) return;
    const timer = setTimeout(
      () => {
        setFailed(false);
        setAttempt((n) => n + 1);
      },
      1500 * (attempt + 1),
    );
    return () => clearTimeout(timer);
  }, [failed, attempt]);
  return (
    <>
      <img
        src={`/api/wallpapers/${id}/thumbnail${attempt ? "?retry=" + attempt : ""}`}
        alt={title}
        loading={eager ? "eager" : "lazy"}
        width={width}
        height={height}
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
        onError={() => setFailed(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
      {!loaded && (
        <span className="wall-thumbnail-status" aria-live="polite">
          {failed && attempt >= 3 ? (
            "Preview unavailable · open for details"
          ) : (
            <>
              <span className="studio-spinner" />
              Loading preview…
            </>
          )}
        </span>
      )}
    </>
  );
}
