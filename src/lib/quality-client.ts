export function resolutionAssessment(
  source: { width: number; height: number },
  target: {
    width: number;
    height: number;
    rotation?: number;
    zoom?: number;
    smartCrop?: boolean;
    backgroundMode?: string;
  },
) {
  const rotated = (target.rotation || 0) % 180 !== 0;
  const width = rotated ? source.height : source.width,
    height = rotated ? source.width : source.height;
  const scale =
    target.backgroundMode && target.backgroundMode !== "crop"
      ? Math.min(target.width / width, target.height / height) *
        (target.zoom || 1)
      : Math.max(target.width / width, target.height / height) *
        (target.zoom || 1);
  return {
    originalWidth: source.width,
    originalHeight: source.height,
    targetWidth: target.width,
    targetHeight: target.height,
    scale,
    needsUpscale: scale > 1.001,
    veryLow: Math.min(width, height) < 720 || scale > 3,
    native: scale <= 1.001,
  };
}
