# Wallpaper platform upgrade

## What is implemented

The shared Studio now powers `/studio`, `/smart-fit`, and `/football-creator`. It supports multiple editable text layers, 24 bundled fonts with visual previews, outlines, gradients, rotation, opacity, letter spacing, shapes, undo/redo, private saved drafts, before/after, device-safe overlays, direct text/shape placement and full-resolution exports. Football Creator has eight configurable presets with original procedural lighting, smoke, glow and pitch graphics; names, jersey numbers, team colors and motivational text remain editable. Background removal and replacement reuse the existing private image pipeline.

Smart Fit offers local ONNX face detection, largest-face framing with clock protection, attention-based subject crop and manual positioning. Face detection can miss faces; the UI reports this and permits manual adjustment. The bundled Ultra-Light face model and license are under `public/models`. Device mockups cover iPhone, Android, Windows, macOS, ultrawide and iPad; system overlays are preview-only and never exported.

Exports validate the actual encoded dimensions and format. Native fitting and standard interpolation are labeled separately from genuine AI enhancement. Missing or failed AI never silently becomes a successful standard resize. 8K is disabled by default and requires an explicitly raised pixel budget.

## Hosted API setup

In Vercel → project → Settings → Environment Variables, add to Production:

- `AI_PROVIDER=replicate`
- `REPLICATE_API_TOKEN`: your private Replicate token; enable billing at Replicate.

Redeploy after saving. The Real-ESRGAN model version resolves automatically; `REPLICATE_MODEL_VERSION` is an optional pin. Do not expose tokens through `NEXT_PUBLIC_` or browser code.

Optional AI scene expansion uses `OUTPAINT_PROVIDER=replicate` with the same token and the official `black-forest-labs/flux-fill-pro` model. It is paid, runs on export, and is not included in the interactive framing preview. This hosted integration requires account access and has not been tested with a live paid token in this environment.

MongoDB is required; GridFS works on Vercel without writable application directories. Commons discovery requires no API key. R2 is optional. For predictable long AI jobs and library ingestion, run `npm run worker` on an always-on Node host with the same MongoDB and storage configuration. Vercel request execution limits still apply.

## Optional self-hosted real AI

For a persistent Linux CPU host, create `.data/ai-runtime` with official CPU PyTorch, Pillow and NumPy, and place the official Real-ESRGAN `realesr-general-x4v3.pth` weights in `.data/models/`. Set `AI_PROVIDER=local`, `REALESRGAN_PYTHON` and `REALESRGAN_MODEL` if overriding defaults. See `scripts/realesrgan-local.py` and the included upstream license. Local Python execution is deliberately unavailable on Vercel.

## Real library growth and limits

The durable importer verifies downloaded files, dimensions, hashes, license metadata, perceptual similarity and heuristic quality. Optional Tesseract screens obvious watermark text. These heuristics cannot establish perfect visual quality or rights clearance; uncertain assets are held for review. Celebrity/player/club assets require rights review. No unlicensed player-image service or AI-generated player likenesses are supplied.

`npm run import:library` targets 1,000 actual new verified publications; `IMPORT_TARGET` and `IMPORT_MAX_MINUTES` control runs. Jobs persist candidates, offsets, counts, retry backoff and leases in MongoDB. The admin Library Growth panel distinguishes legacy published metadata from file-verified assets and reports actual shortfalls. The weekly target is 1,000 unique approved files, never a fabricated counter.

The existing Vercel weekly cron performs bounded work. A persistent worker must drain the queue to attempt the full target; source availability and review rejects can cause shortfalls. An optional Monday GitHub Actions workflow requires repository variable `ENABLE_SCHEDULED_IMPORT=true` and secret `MONGODB_URI`; it is disabled until configured. It uses GridFS shared with production. No recurring-job success is claimed before an actual scheduled run completes.

Validation before this commit: an actual 1,000×1,500 source passed Real-ESRGAN and produced verified 2,160×3,840 and 3,840×2,160 outputs. A bounded local import published 10 file-verified football stadium photos; local published count was 521, with a 990-file verified-target shortfall. These local records do not populate production automatically. Legacy production had 510 published records at the previous revision. The admin panel is the authority for current production counts.

Site motion includes page-entry fades, staggered gallery reveals, animated navigation underlines, button feedback, dialog entrances and an indeterminate route-loading indicator. All transitions and animations respect `prefers-reduced-motion`. The route wrapper deliberately avoids transforms to preserve the editor's viewport-fixed mobile preview.

Final local validation: production build and TypeScript pass; 27 unit/rendering tests pass; all 12 browser tests pass, covering mobile positioning, direct text manipulation, football presets, actual ONNX inference, drafts and undo/redo. HTTP smoke and admin checks pass. The Vercel simulation passes private GridFS uploads against a read-only app directory, workerless post-response export, favicon assets and authenticated cron. A separate browser check confirms animations respect reduced motion. Hosted Replicate is configured in the previous production health response; its paid inference and optional Flux expansion were not exercised here. Local CPU Real-ESRGAN passed again in 60 seconds.
