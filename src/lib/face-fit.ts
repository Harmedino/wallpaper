export type Face = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};
export async function detectFaces(blob: Blob): Promise<Face[]> {
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = "/models/";
  const model = await ort.InferenceSession.create("/models/face-rfb-320.onnx", {
    executionProviders: ["wasm"],
  });
  const bitmap = await createImageBitmap(blob);
  try {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 240;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, 320, 240);
    const pixels = ctx.getImageData(0, 0, 320, 240).data,
      data = new Float32Array(3 * 320 * 240);
    for (let i = 0; i < 320 * 240; i++)
      for (let channel = 0; channel < 3; channel++)
        data[channel * 320 * 240 + i] = (pixels[i * 4 + channel] - 127) / 128;
    const output = await model.run({
      [model.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, 240, 320]),
    });
    const scores = output.scores?.data as Float32Array,
      boxes = output.boxes?.data as Float32Array;
    if (!scores || !boxes) throw new Error("Unsupported face-model output");
    const faces: Face[] = [];
    for (let i = 0; i < scores.length / 2; i++)
      if (scores[i * 2 + 1] > 0.75) {
        const x = Math.max(0, boxes[i * 4]),
          y = Math.max(0, boxes[i * 4 + 1]);
        faces.push({
          x,
          y,
          width: Math.min(1, boxes[i * 4 + 2]) - x,
          height: Math.min(1, boxes[i * 4 + 3]) - y,
          confidence: scores[i * 2 + 1],
        });
      }
    const selected: Face[] = [];
    const iou = (a: Face, b: Face) => {
      const intersection =
        Math.max(
          0,
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
        ) *
        Math.max(
          0,
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
        );
      return (
        intersection / (a.width * a.height + b.width * b.height - intersection)
      );
    };
    for (const face of faces.sort((a, b) => b.confidence - a.confidence))
      if (!selected.some((f) => iou(f, face) > 0.3)) selected.push(face);
    return selected
      .sort((a, b) => b.width * b.height - a.width * a.height)
      .slice(0, 10);
  } finally {
    bitmap.close();
    await model.release();
  }
}
export function fitFace(
  source: { width: number; height: number },
  target: { width: number; height: number },
  face: Face,
) {
  const ratio = target.width / target.height;
  let cropWidth = source.width,
    cropHeight = source.height;
  if (cropWidth / cropHeight > ratio) cropWidth = cropHeight * ratio;
  else cropHeight = cropWidth / ratio;
  const cx = (face.x + face.width / 2) * source.width,
    cy = (face.y + face.height / 2) * source.height;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const x =
    source.width > cropWidth
      ? clamp((cx - cropWidth * 0.5) / (source.width - cropWidth))
      : 0.5;
  const y =
    source.height > cropHeight
      ? clamp((cy - cropHeight * 0.48) / (source.height - cropHeight))
      : 0.5;
  const projectedY = (cy - (source.height - cropHeight) * y) / cropHeight;
  return {
    x,
    y,
    protectWithFrame: projectedY < 0.37,
    mode: projectedY < 0.37 ? "blur" : "crop",
    padding: projectedY < 0.37 ? 0.2 : 0,
    subjectY: projectedY < 0.37 ? 0.95 : y,
  };
}
