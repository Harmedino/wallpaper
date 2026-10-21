# Wallspace

React + TypeScript, Next.js App Router on Node.js, **MongoDB**, Tailwind 4 and a shadcn-style Radix Button. The worker is a separate Node.js process. Sharp handles real file validation, cropping, adjustments and encoding. MongoDB replaces the original brief's PostgreSQL/Prisma requirement, following the subsequent stack instruction.

## Local development

Requires Node.js 24 and npm. Use the existing checkout; cloud tasks are already isolated and need no extra worktree.

```sh
npm ci
npm run setup:local     # preserves existing .env; creates secrets only if absent
npm run db:local        # terminal 1: persistent MongoDB on loopback port 27017
npm run db:setup        # terminal 2: additive MongoDB migration + indexes
npm run seed           # optional: nine original procedural CC0 artworks
npm run worker         # terminal 2: keep running
npm run dev            # terminal 3
```

`db:local` uses mongodb-memory-server as a binary launcher, **with a persistent WiredTiger directory**, not an in-memory mock database. It downloads the official MongoDB 8.0.17 binary with package verification enabled. Development data, files, logs and local secrets live in ignored `.data/` and `.env`. For an existing MongoDB, set `MONGODB_URI` and omit `db:local`. Cloud setup has already installed dependencies, initialized MongoDB and seeded the collection.

The locally generated admin password is in `.data/admin-password.txt` (mode 0600). Read it privately on the machine and sign in at `/admin`. Never commit it. To change it, provide a password of at least 16 characters on stdin to `npm run admin:password`; the script stores a salted scrypt hash, not the password. Restart the server after changing environment settings. Keep SESSION_SECRET at least 32 random characters. The generated password file is only a local bootstrap aid; remove it after setting your own password.

## Functional workflows

- **Browse:** homepage, explore, categories, trending by actual downloads, latest, detail pages, keyword/category/color/orientation/4K filters and pagination. The starter collection is labeled procedural artwork, not sourced photography or AI output. Empty categories show an honest empty state.
- **Download:** real JPG, PNG and WebP encoding at desktop/mobile dimensions. Variants are cached in storage and reused; downloads are counted. License and creator information appear on detail pages and in a separately downloadable attribution file linked from download responses. ShareAlike adaptations retain the original license. Keep attribution with redistributed files.
- **Studio:** byte/content/size/pixel validation, private originals, orientation-aware cropping with horizontal/vertical positioning, brightness, saturation, contrast, median denoising, sharpening, optional tint, bounded custom sizes, before/after slider and a real result download. Outputs are limited to 16 megapixels and uploads to 20 MB/40 megapixels. Re-encoding removes EXIF metadata.
- **Jobs:** MongoDB atomic `findOneAndUpdate` claims, progress stages, durable results, three attempts with backoff, 15-minute stale-lease recovery and 24-hour private-file cleanup. Run the worker continuously. Progress is real workflow stage progress, not fabricated model percentage. Multiple workers can claim different jobs safely.
- **Administration:** password sign-in, counts and popular categories, pending-candidate review, manual original publication, title/category/tag editing, featuring, unpublishing, common-size regeneration, 4K enhancement jobs with explicit result approval, discovery settings/schedules, recent jobs/errors and copyright reports.
- **Security:** HMAC-signed HttpOnly same-site sessions, server-side admin checks, private-file ownership checks, origin checks, MongoDB-backed rate limits, strict remote-host allowlists, redirect validation and bounded responses. Original private objects are never exposed through a public storage path. Basic moderation consists of source-license filtering, optional administrator review and a report queue; no automated image-safety classifier is included.

Private access is tied to the browser session, not a user account. Clearing cookies loses access. Uploads expire after 24 hours by default; administrators can change retention for new uploads. Optional registered accounts are not implemented.

## Image discovery and rights

Commons and NASA are enabled for **every Monday at 09:00 Africa/Lagos (08:00 UTC)** by migration 002. Openverse remains opt-in because this environment receives a provider 403. In Admin → Sources, change the query, pause a source, select weekly or a custom interval, or run discovery manually. Weekly runs follow the calendar, not a drifting 168-hour timer. The worker checks due sources once a minute and uses atomic leases to prevent duplicate runs across replicas. Failed attempts release the lease and become eligible for retry after six hours. Set SOURCE_USER_AGENT to include a real contact email. Requests are capped at 20 search results (10 NASA asset lookups), with timeouts and no uncontrolled pagination. Transient failures are recorded. This is discovery of metadata, not bulk media downloading.

- [Openverse API](https://api.openverse.org/v1/) uses commercial/modification filters. Only recognized CC0, Public Domain, CC BY or CC BY-SA metadata is admitted; actual source rights still need review. Openverse is an index, not a guarantee of rights. Original-image hosts must also be on IMAGE_ALLOWED_HOSTS and your deployment's network allowlist; unapproved hosts are excluded.
- [Wikimedia Commons API](https://www.mediawiki.org/wiki/API:Imageinfo) returns original dimensions and extended creator/license metadata. Images below 1920×1080 or with unrecognized licenses are excluded. See [Commons reusing content](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
- [NASA Image and Video Library API](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf) supplies metadata and original assets. NASA candidates are provisional public-domain candidates requiring individual review of third-party credits, people, insignia and endorsement concerns under [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). They are excluded from automatic publication merely because NASA hosts them.

Inspect the **source page** and rights before approval. Compatible Commons own-work photographs with known reusable licenses and no stated restrictions can publish automatically (up to three per discovery run). Unknown or restricted provenance is excluded from automatic publication. NASA and Openverse candidates remain unpublished unless the operator supplies a separate valid review. Uploads and manual publications no longer require confirmation checkboxes. Approval fetches the file from an allowlisted host, validates content, computes a normalized SHA-256 fingerprint, rejects exact duplicates, writes an optimized preview and publishes. Rejection retains an audit record. Noncommercial, NoDerivatives, unknown and ambiguous licenses are excluded. Exact normalized-file deduplication is included; perceptual near-duplicate detection is not.

## AI providers

`AI_PROVIDER=none` (default) performs normal processing and labels results **resized**. If a configured provider fails, the worker also completes standard processing with an explicit “AI provider unavailable” label. Resizing is not super-resolution.

**Self-hosted Real-ESRGAN:** configure `AI_PROVIDER=realesrgan` and `REALESRGAN_URL` to a trusted service accepting `POST multipart/form-data`, file field `image`, returning JPG/PNG/WebP bytes. Optional bearer token: REALESRGAN_TOKEN. Use a verified installation of [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN), trusted model weights and a GPU-capable service. Remote services require HTTPS; localhost HTTP is supported for development. This repository includes the client integration, not a bundled GPU runtime or model weights.

**Replicate:** obtain a token at [Replicate account tokens](https://replicate.com/account/api-tokens). Set AI_PROVIDER=replicate, REPLICATE_API_TOKEN, and an audited, **pinned** REPLICATE_MODEL_VERSION from [nightmareai/real-esrgan API](https://replicate.com/nightmareai/real-esrgan/api). The adapter creates a prediction, polls its actual status and downloads the result. Add the exact result CDN host (often `replicate.delivery` or a provider-assigned subdomain) to IMAGE_ALLOWED_HOSTS and outbound policy; no wildcard remote fetching is enabled. Hosted processing sends the image to the provider and incurs its fees. Billing data is not inferred or fabricated.

**Neither provider is configured or externally validated in this cloud instance.** R2 and AI secrets must be entered securely in deployment settings, never committed. There are no fake AI-generated results.

## Cloudflare R2

Create a **private** bucket and a scoped object read/write API token in Cloudflare. Set STORAGE_PROVIDER=r2, R2_ENDPOINT (`https://<account-id>.r2.cloudflarestorage.com`), R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY. See [R2 S3 API tokens](https://developers.cloudflare.com/r2/api/s3/tokens/). Keep r2.dev/public bucket access disabled. App and worker must share the same settings.

The SDK uses authenticated S3 requests server-side. Uploads and downloads are proxied through the application and authorized with the signed session, so public object URLs or browser S3 credentials are unnecessary. Local storage is the development default. On Vercel, local storage automatically uses persistent MongoDB GridFS; set STORAGE_PROVIDER=mongodb explicitly on every external worker. R2 remains optional. Do not put the storage directory under `public/`.

## Deployment

For a persistent Node.js 24 deployment, run the web app and a separate worker. On Vercel, basic Studio jobs also run using Next.js post-response processing (`after`) with the same atomic claims, real progress and private storage. A persistent worker remains recommended for long AI jobs, unattended retries and regular expired-file cleanup. Set a production MONGODB_URI (MongoDB Atlas or a secured private MongoDB), APP_URL to your public HTTPS origin, a new SESSION_SECRET, ADMIN_PASSWORD_HASH and storage/provider variables from `.env.example`. Atlas: create a least-privileged database user, use the `mongodb+srv` URI securely, and configure your host's network access. Do not expose an unauthenticated MongoDB port publicly.

```sh
npm ci
npm run db:setup
npm run build
npm start              # web process
npm run worker         # separate process/supervisor
```

Optional `compose.yaml` runs MongoDB, web and worker with persistent volumes. It is intended for a private single-host deployment behind an HTTPS reverse proxy. MongoDB has **no public host port**. Add internal database authentication and backup management appropriate to your infrastructure before public production use. Docker build/run has not been validated here. In managed cloud Docker environments, follow the platform proxy and CA-trust instructions rather than disabling TLS verification.

Terminate TLS with your host/reverse proxy and set APP_URL accurately; production cookies are Secure. Set a reverse-proxy upload limit of 21 MB, timeouts appropriate to image downloads, trusted client routing, and request-rate controls. Keep MongoDB and media backups. Use R2 or MongoDB GridFS for multiple app replicas; local files require a shared volume. Run migrations once per deployment and health-check `/api/health`. Seed only if you want the original-art starter collection. Do not use local development credentials in production.

Before a public launch: configure R2/AI if desired, validate provider behavior and current terms, review policies and business contact details, integrate automated moderation if required, add provider cost metering, complete a security/load review, and configure backups/monitoring. This is a functional implementation; those production operations are not claimed complete.

## Verification

```sh
npm run typecheck
npm test                  # image dimensions, crop, formats, metadata, limits, licenses, SSRF, signed sessions
npm run build
# start database + worker + web, then:
npm run test:admin        # admin rights, license rejection, deduplication, publication and unpublishing
npm run test:smoke        # real HTTP ownership/authorization, queue, 4K download, attribution, deletion, pages
npm run test:browser      # Chromium: search→download, upload→worker→download, mobile layout
npm audit --omit=dev
```

Browser tests use `/usr/bin/chromium` by default; set CHROMIUM_PATH to another installed browser. TEST_BASE_URL changes the test origin. Tests generate their own images. The smoke test removes its upload; browser test uploads expire normally. Neither test invokes a paid AI service with the default provider.

## Known limits

Actual R2 and hosted/local Real-ESRGAN success need your configured services and credentials. Source availability and API terms can change; inspect Admin source errors and the verification report. There is no subject-segmentation model; crop positioning is manual. There is no AI tagging, optional account registration, perceptual deduplication, actual AI-cost metering. The storage dashboard counts real local/R2/GridFS objects and bytes. Administrators can lower safe limits and adjust retention/rate limits in the dashboard; the hard ceilings remain server-enforced. Copyright reports are stored for administrator review, not emailed automatically. Download attribution is supplied as a companion file and license header, not embedded in a bundled ZIP. Gallery search uses a MongoDB text index and an aggregation facet for paginated items/counts.

## Vercel deployment checklist

The web UI/API can run on Vercel, but the local database, local media directory and long-lived worker cannot be used there as production services. Configure `MONGODB_URI` to your reachable MongoDB Atlas/private MongoDB database, then run `npm run db:setup` against that database from a trusted machine. Set the HTTPS `APP_URL`, `SESSION_SECRET` and `ADMIN_PASSWORD_HASH` in Vercel environment settings. Set `STORAGE_PROVIDER=mongodb` to store media privately in MongoDB GridFS, or configure private R2 storage. On Vercel, absent/local provider settings use GridFS automatically, avoiding writes to read-only `/var/task`. The cloud workspace's `.data` files are not deployed by Git. Use the **same storage provider and MongoDB database** on the persistent worker. For an initial gallery, run `npm run seed` from a trusted machine with the production MONGODB_URI and STORAGE_PROVIDER=mongodb (or your R2 settings); no credentials should be committed.

Vercel has request-body limits below this application's local 20 MB ceiling. The application automatically caps uploads at 4 MB on Vercel; local deployments retain the configured limit up to 20 MB. A separately hosted/direct-upload service is needed for larger Vercel uploads. Missing MongoDB configuration cannot be corrected by a UI redeployment alone. Check `/api/health` and deployment function logs without publishing credentials.

The gallery now distinguishes loading, unavailable and genuinely empty results, and offers retry after a service interruption. `npm run test:db-recovery` tests recovery after an initial database connection failure; it requires local MongoDB on port 27017.

## Weekly Vercel discovery and favicon

`vercel.json` registers `/api/cron/discovery` every Monday at 08:00 UTC (09:00 Lagos). Set a strong random `CRON_SECRET` in Vercel Production environment variables and redeploy. Vercel supplies it as a Bearer authorization header; unauthenticated calls are rejected. Run `npm run db:setup` against production once to enable the weekly source defaults. The cron endpoint initializes missing source records on first authorized invocation if migrations have not yet populated them. Eligible Commons originals publish automatically after source/license validation. Other sources and ambiguous rights remain unpublished.

Cron can perform weekly discovery without a persistent discovery worker. Studio jobs can run after the HTTP response on Vercel; status polling can resume eligible queued retries. Use `npm run worker` on a persistent host for unattended retries, long-running AI work and regular expired-file cleanup. Hosting execution limits still apply. With the worker, failed discovery retries become eligible after six hours; a cron-only deployment checks them at the next weekly trigger (or via an administrator's manual request). API availability, source licensing and the host's execution limits still apply. Source failures are visible in Admin.

GridFS image bytes persist in MongoDB collections `media.files` and `media.chunks`. Session/admin access checks remain in the API; there is no public GridFS file endpoint. Uploaded images stay private. Include these collections in database backups and storage planning. Existing local files are not migrated automatically; seed/import with the chosen production storage provider.

Brand assets are `src/app/favicon.ico`, `icon.svg` and `apple-icon.png`; Next.js adds the appropriate metadata links.

Additional checks (local MongoDB running): `npm run test:scheduler`, `npm run test:storage`, and `npm run test:vercel` (requires a production build). The Vercel test runs a local production server with Vercel flags and an intentionally unusable application storage path; it verifies an actual authenticated upload/private download and completed portrait conversion without a separate worker, using GridFS, the 4 MB cap, favicon files, and cron authorization. This is a runtime simulation, not proof of live Vercel deployment.

## First-visit catalog and Photo Studio

Opening Explore on a fresh storage backend now installs nine original, downloadable CC0 artworks into that deployment's storage/database. This is persistent initialization, not placeholder gallery data. The first gallery request also starts one bounded Commons discovery/import attempt after the response. A compatible source photograph is published automatically with creator, source, license and attribution intact. Explicit ShareAlike licenses are retained. The catalog initializer is idempotent and does not undo later administrator unpublishing. MongoDB connectivity is still required.

Studio upload confirmation checkboxes have been removed. Start with a photo or one of 12 original illustrated backgrounds (mountains, ocean waves, lunar orbit, botanical leaves, retro sun, blueprint, playful shapes, desert arches and more). Background selection preserves an uploaded photo as the foreground. Six design ideas apply coordinated backgrounds, framing and editable text. Six one-click looks, quote/focus layouts, rotation, flips, full-photo blurred/solid backdrops, framing, rounded corners, vignette and reset controls are available. Add multiline text using 12 bundled font styles with size, color, alignment, shadow and positioning controls. Drag text directly on the preview, resize using its corner, or nudge with arrow keys (Shift for larger steps). Five photo layouts include side-by-side, triptych, 2 × 2 and editorial mosaic, with up to five extra private photos; source ownership and expiration are checked for preview and export. The mobile canvas stays fixed while controls scroll. One-click 4K selects 3840 × 2160; portrait 4K is also available. Resizing is labeled separately from AI enhancement. Live previews use the same server renderer as final downloads. Very long text automatically fits within the canvas. Font files and their redistribution license are included; Vercel function tracing explicitly includes them. This provides backdrop/framing edits, not subject segmentation or background removal.
