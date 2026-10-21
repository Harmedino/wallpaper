/** U²-NetP foreground segmentation, entirely on-device with locally served model files. */
export async function cutout(blob: Blob, progress: (message: string) => void) {
  progress("Loading background-removal model…");
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.wasmPaths = "/models/";
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create("/models/u2netp.onnx", {
    executionProviders: ["wasm"],
  });
  const image = await createImageBitmap(blob);
  try {
    progress("Finding the subject…");
    const small = document.createElement("canvas");
    small.width = 320;
    small.height = 320;
    const ctx = small.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 320, 320);
    const pixels = ctx.getImageData(0, 0, 320, 320).data;
    const input = new Float32Array(3 * 320 * 320);
    const mean = [0.485, 0.456, 0.406],
      std = [0.229, 0.224, 0.225];
    let max = 1;
    for (let i = 0; i < pixels.length; i += 4)
      max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2]);
    for (let i = 0; i < 320 * 320; i++)
      for (let c = 0; c < 3; c++)
        input[c * 320 * 320 + i] = (pixels[i * 4 + c] / max - mean[c]) / std[c];
    const result = await session.run({
      [session.inputNames[0]]: new ort.Tensor(
        "float32",
        input,
        [1, 3, 320, 320],
      ),
    });
    progress("Refining the edges…");
    const values = result[session.outputNames[0]].data as Float32Array;
    let lo = Infinity,
      hi = -Infinity;
    for (const v of values) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const mask = ctx.createImageData(320, 320);
    for (let i = 0; i < 320 * 320; i++) {
      mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = 255;
      mask.data[i * 4 + 3] = Math.round(
        ((values[i] - lo) / Math.max(0.000001, hi - lo)) * 255,
      );
    }
    ctx.putImageData(mask, 0, 0);
    const output = document.createElement("canvas");
    output.width = image.width;
    output.height = image.height;
    const context = output.getContext("2d")!;
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(small, 0, 0, image.width, image.height);
    return await new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not save cutout"))),
        "image/webp",
        0.94,
      ),
    );
  } finally {
    image.close();
    await session.release();
  }
}
