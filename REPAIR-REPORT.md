# Wallpaper experience repair — audit and verification

## Audit before changes

- Public download controls fetched a blob and clicked an unattached download anchor. There was no actual-file sharing, inline full-resolution viewing, or platform-specific Photos/Downloads guidance. A completed HTTP response did not establish a Photos save.
- Public downloads always used crop-to-fill. The detail image, device mockup and resolution selector had independent state. Selecting a target did not update the other previews, and fit/crop choices were not part of a single workflow.
- Detail and related images used fixed landscape HTML dimensions even for portrait sources. Gallery thumbnails were framed at arbitrary ratios based on card position and used cover cropping.
- Device preview filtering prevented misleading native matches but offered no integrated way to fit another source shape. Several required iPhone/Pixel/desktop presets were missing.
- Original media and thumbnails are stored separately; downloads already render from original media, not screenshots. Sharp and the asynchronous editor provide useful full-resolution rendering. GridFS already avoids Vercel's read-only application filesystem. These components will be retained.
- Crop variant keys previously included position but not distinct Fit/Fill modes. New rendering configuration needs complete cache identity and actual output verification.
- There was no light theme or persistent system-aware theme control. Repeated hard-coded dark surfaces require semantic surface/text colors across the application.
- The bundled catalog contains 500 distinct source URLs, all within the configured 40MP source limit. These are source metadata records, not proof that all original files have been downloaded, decoded, quality-reviewed or verified. Existing verified-file counters must remain separate.
- Only Chromium is initially installed. Physical iPhone/Android devices and a native Photos library are unavailable in this environment. Native share-sheet and actual Photos insertion cannot be confirmed by browser automation alone.

Implementation and final test results are recorded below as completed. No physical-device result will be marked passed without evidence.

## Implemented repairs

- Unified detail workspace: one device/resolution, fit mode, crop position, zoom and format drive both the rendered preview and full-resolution export. Normal **Fill / crop to screen is the default**, following the user's latest instruction. Fit keeps the entire image with a complementary blurred background. Neither mode stretches the source.
- Exact iPhone, Samsung, Pixel, desktop Full HD/QHD/4K/5K/ultrawide and custom targets. Manual horizontal/vertical crop and zoom preserve control over subjects. The simple Smart Fit uploader starts with an ordinary crop and Original styling; it does not automatically remove the subject's background.
- Generated files are rendered from original media, verified for dimensions/format and fully decoded before delivery. Preview-only OS clocks and widgets are never part of the export. Full render settings and original-file hash identify cached variants.
- Native image sharing uses a prepared, decoded actual File and checks canShare({files}). Sharing starts synchronously from the user's click; cancellation is neutral. Download File, inline full-resolution viewing, accurate MIME/filenames and platform-specific save guidance are available. No message claims that Photos insertion has been verified.
- These save actions also serve quick creation, the full editor and completed upload jobs. Full-resolution text, fonts, effects, undo/redo and layered editing remain available.
- Rebuilt homepage with actual imagery, search, featured/trending/latest, phone/desktop/football sections and category counts. Reusable gallery/detail cards preserve source aspect ratios, display orientation and distinguish source metadata from file-verified quality. Empty, error, retry, loading and processing states remain visible.
- Persistent light/dark themes follow the system initially and survive navigation/reload. Shared surfaces and controls adapt to both modes; device mockups preserve their own OS styling.
- Original/thumbnail loading now deduplicates concurrent requests, caches downloaded originals separately, verifies original metadata, and does not disguise configuration failures as missing files.

## Production library audit — 2026-10-21

Read all 29 public API pages: **512 unique entries**, **5 with recorded original-file verification**, **507 metadata-only entries**. There were 63 portrait, 441 landscape and 8 square entries. None listed a short side below 1080 pixels; all included creator, source URL, license and license URL. One source-URL group repeated; no verified perceptual-hash duplicates were found. A repeated attribution URL does not by itself establish duplicate pixels.

This is a metadata audit, not a claim that 512 original files were downloaded or visually approved. Source-file verification occurs when originals are fetched; the durable ingestion workflow performs further verification. No blanket claim about broken links, visual composition or blur is possible from metadata alone. The 1,000 initial / 1,000 weekly approved-file plan remains configured, but its quota is not yet met. Do not inflate approved counts with metadata-only entries.

## External capabilities and manual checks

- AI super-resolution remains genuine optional model processing, with explicit errors instead of silent ordinary-resize fallback. Ordinary interpolated outputs are labelled as standard resizing.
- AI expansion is unavailable until an outpainting provider is configured; the interface disables that option. It is not represented by blurred padding.
- Physical iPhone Safari and Android devices were unavailable. Chromium automation with mobile viewport/user agents and a mocked native share API verifies our application behavior, not actual iOS/Android OS integration.
- Firefox and WebKit could not be installed: official browser download hosts were rejected by this environment's network policy (HTTP 403). Desktop Safari/Firefox execution remains unverified.

### Physical-device acceptance checklist

1. iPhone Safari: browse, open a detail, choose the exact iPhone size, check lock/home previews and crop. Prepare, Share Image, select Save Image if offered, locate/open the image in Photos. Also open the full-resolution image and test long-press saving; test Download File via Files → Downloads → Share → Save Image. Cancel sharing and confirm there is no false success.
2. Android Chrome: choose Samsung/Pixel/custom dimensions, crop, download, locate the file in Downloads and open it. Confirm its pixel dimensions and the device's Gallery/Google Photos visibility. Test actual native file sharing where offered.
3. Desktop Chrome/Safari/Firefox: browse/search/filter, choose 1920×1080, 2560×1440, 3840×2160, 5120×2880 and 3440×1440; compare Fit/Fill previews with decoded downloads. Set a file as wallpaper and check the OS's own wallpaper scaling option.
4. Repeat mobile layout/save checks in both themes. Upload a photo, move the crop, add text and export; confirm the final image contains edits at the selected resolution.

## Executed validation

- Production build and TypeScript checks passed.
- **33/33 unit and image-processing tests passed**: non-stretched geometry, left/right crop selection, whole-image fitting, exact desktop/phone dimensions including 5K, JPEG/PNG/WebP, decode integrity, typography, layers, private sessions, licensing and genuine-AI failure behavior.
- **19/19 Playwright Chromium tests passed** in the final complete run. They cover gallery/detail real downloads, mobile layout, upload/editor/template exports, photo background replacement, native preview compatibility, actual-file share activation/cancellation, Android-style downloads, failed-download feedback and persistent themes.
- Vercel runtime simulation passed with an intentionally unusable `/var/task/.data` path: private upload/download, asynchronous post-response rendering without a worker, public Fit/Fill variants and repeated cached files, favicon assets and authenticated cron. Both public variants decoded at exactly 1080×1920 with proper JPEG and inline headers.
- Inspected desktop dark, mobile light and mobile detail screenshots. Checked document width against the viewport; no overflow in those inspected layouts. This complements automated checks and does not establish physical-device results.
- Initial browser failures were outdated link selectors after save controls became buttons, plus an overly broad alert selector matching Next's route announcer. These selectors were corrected; the final full suite passed without suppressing assertions.
