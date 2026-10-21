import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("gallery search, details and real downloaded file", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your screen/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Find your wallpaper" }).click();
  await expect(
    page.getByRole("heading", { name: "Explore wallpapers." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search wallpapers" })
    .fill('"Aurora silk"');
  const card = page.locator(".wall-card");
  await expect(card).toHaveCount(1);
  await card.click();
  await expect(
    page.getByRole("heading", { name: "Aurora silk", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose your resolution").selectOption("0");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download wallpaper", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("wallspace-1920x1080.jpg");
  const path = await download.path();
  const m = await sharp(path!).metadata();
  expect(m.width).toBe(1920);
  expect(m.height).toBe(1080);
});
test("Studio uploads, creates and downloads a real private result", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/studio"),
  ]);
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#345678" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload image")
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: bytes });
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  await page.getByLabel("Target screen").selectOption("5");
  await page.getByRole("button", { name: "Create my wallpaper" }).click();
  await expect(
    page.getByRole("heading", { name: "Your new perspective is ready." }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/standard interpolation.*Cropped/)).toBeVisible();
  const promise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download finished wallpaper" }).click();
  const dl = await promise;
  const m = await sharp((await dl.path())!).metadata();
  expect(m.width).toBe(1080);
  expect(m.height).toBe(1920);
});
test("mobile navigation and gallery fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "AI Studio", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/explore?category=Abstract");
  await expect(
    page.getByRole("button", { name: "Abstract", exact: true }),
  ).toHaveClass(/active/);
  await expect(page.locator(".wall-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("gallery failure has a retry action and recovers without showing a false empty count", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/wallpapers?**", async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Database unavailable" }),
      });
    else await route.continue();
  });
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load the collection." }),
  ).toBeVisible();
  await expect(page.getByText("0 wallpapers", { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".wall-card").first()).toBeVisible();
  await expect(page.locator(".collection").getByRole("alert")).toHaveCount(0);
});

test("Studio templates, text and framing export a real edited wallpaper without confirmation", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/studio"),
  ]);
  await expect(page.getByRole("checkbox", { name: /I own/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Sunset", exact: true }).click();
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  await page.getByRole("button", { name: "Noir", exact: true }).click();
  await page.getByLabel("Wallpaper text").fill("STAY CURIOUS");
  await page.getByRole("combobox", { name: "Font", exact: true }).click();
  await page.getByRole("option", { name: /Editorial serif/ }).click();
  await page.getByLabel("Photo layout").selectOption("solid");
  await page.getByLabel("Backdrop color", { exact: true }).fill("#123456");
  await page.getByLabel("Target screen").selectOption("0");
  await page.getByRole("button", { name: "Create my wallpaper" }).click();
  await expect(
    page.getByRole("heading", { name: "Your new perspective is ready." }),
  ).toBeVisible({ timeout: 30000 });
  const promised = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download finished wallpaper" }).click();
  const dl = await promised;
  const meta = await sharp((await dl.path())!).metadata();
  expect(meta.width).toBe(1920);
  expect(meta.height).toBe(1080);
});

test("mobile editor preserves photos, pins preview and supports text dragging and grid photos", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const ready = page.waitForResponse((r) =>
    r.url().endsWith("/api/capabilities"),
  );
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/studio"),
  ]);
  await ready;
  const red = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload image", { exact: true })
    .setInputFiles({ name: "red.png", mimeType: "image/png", buffer: red });
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  let uploads = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/studio/background")) uploads++;
  });
  await page
    .getByRole("button", { name: "Alpine escape", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Photo layout", exact: true }),
  ).toHaveValue("art", { timeout: 45000 });
  expect(uploads).toBe(0);
  await page
    .getByLabel("Wallpaper text", { exact: true })
    .fill("MAKE IT YOURS");
  const selection = page.getByRole("button", { name: "Move text on canvas" });
  await expect(selection).toBeVisible({ timeout: 15000 });
  const before = await selection.boundingBox();
  await page.mouse.move(
    before!.x + before!.width / 2,
    before!.y + before!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before!.x + before!.width / 2 + 30,
    before!.y + before!.height / 2 + 25,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(
    page.getByLabel("Text horizontal position", { exact: true }),
  ).not.toHaveValue("0.5");
  const sizeBefore = await page
    .getByLabel("Text size", { exact: true })
    .inputValue();
  const handle = await page
    .getByLabel("Resize text", { exact: true })
    .boundingBox();
  await page.mouse.move(handle!.x + 10, handle!.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 30, handle!.y + 25, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Text size", { exact: true })).not.toHaveValue(
    sizeBefore,
  );
  await page.getByRole("button", { name: "2 × 2 grid", exact: true }).click();
  await page
    .getByLabel("Add collage photos", { exact: true })
    .setInputFiles({ name: "second.png", mimeType: "image/png", buffer: red });
  await expect(page.getByAltText("Grid photo 1")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Text alignment", exact: true })
    .scrollIntoViewIfNeeded();
  const rect = await page.locator(".studio-preview-frame").boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y).toBeLessThan(50);
  await page.getByLabel("Target screen").selectOption("5");
  expect(
    (await page.locator(".studio-preview-frame").boundingBox())!.height,
  ).toBeGreaterThan(400);
  await page
    .getByRole("button", { name: "Expand preview", exact: true })
    .click();
  expect(
    (await page.locator(".studio-preview-frame").boundingBox())!.height,
  ).toBeGreaterThan(600);
  await page
    .getByRole("button", { name: "Close expanded preview", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Convert to 4K", exact: false })
    .click();
  await page.screenshot({ path: "/tmp/studio-mobile-editor.png" });
  await page
    .getByRole("button", { name: "Create my wallpaper", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your new perspective is ready." }),
  ).toBeVisible({ timeout: 30000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download finished wallpaper" }).click();
  const download = await downloadPromise;
  const metadata = await sharp((await download.path())!).metadata();
  expect(metadata.width).toBe(3840);
  expect(metadata.height).toBe(2160);
});

test("Explore has 500 photographs and phone, desktop and iPad previews", async ({
  page,
}) => {
  await page.goto("/explore");
  await expect(page.getByText(/5\d\d wallpapers to make your own/)).toBeVisible(
    { timeout: 20000 },
  );
  await page
    .getByRole("button", { name: "Preview on phone", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Preview wallpaper on your devices",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".device-phone")).toBeVisible();
  await dialog.getByRole("button", { name: "Desktop", exact: true }).click();
  await expect(dialog.locator(".device-desktop")).toBeVisible();
  await dialog.getByRole("button", { name: "iPad", exact: true }).click();
  await expect(dialog.locator(".device-ipad")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Home screen", exact: true })
    .click();
  await expect(dialog.locator(".phone-home")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close phone preview", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
});

test("real on-device cutout removes background and photographic replacements export", async ({
  page,
}) => {
  test.setTimeout(90000);
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/studio"),
  ]);
  await page
    .getByLabel("Upload image", { exact: true })
    .setInputFiles("tests/fixtures/tiger.jpg");
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/uploads") && r.request().method() === "POST",
    { timeout: 60000 },
  );
  await page
    .getByRole("button", { name: "Remove original background", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({
        hasText:
          /Loading background|Finding the subject|Refining|Preparing|Saving/,
      })
      .first(),
  ).toBeVisible();
  const response = await saved;
  expect(response.status()).toBe(201);
  const upload = await response.json();
  const pixels = await page.request.get(`/api/uploads/${upload.id}/image`);
  const stats = await sharp(await pixels.body()).stats();
  expect(stats.channels[3].min).toBeLessThan(10);
  expect(stats.channels[3].max).toBeGreaterThan(240);
  const replacement = await sharp({
    create: { width: 800, height: 500, channels: 3, background: "#3388cc" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload replacement background", { exact: true })
    .setInputFiles({
      name: "background.png",
      mimeType: "image/png",
      buffer: replacement,
    });
  await expect(
    page.getByRole("combobox", { name: "Photo layout", exact: true }),
  ).toHaveValue("art");
  await page.getByRole("combobox", { name: "Font", exact: true }).click();
  const option = page.getByRole("option", { name: /Dancing Script/ });
  await expect(option).toBeVisible();
  expect(
    await option.evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Dancing Script");
  await option.click();
  await page
    .getByLabel("Wallpaper text", { exact: true })
    .fill("Wild at heart");
  await page.screenshot({ path: "/tmp/real-cutout-editor.png" });
  await page.getByLabel("Target screen").selectOption("0");
  await page
    .getByRole("button", { name: "Create my wallpaper", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your new perspective is ready." }),
  ).toBeVisible({ timeout: 30000 });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download finished wallpaper" }).click();
  const file = await downloaded;
  const pixel = await sharp((await file.path())!)
    .extract({ left: 1, top: 1, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(Math.abs(pixel[0] - 51)).toBeLessThan(12);
  expect(Math.abs(pixel[1] - 136)).toBeLessThan(12);
  expect(Math.abs(pixel[2] - 204)).toBeLessThan(12);
});

test("thumbnail failures show loading and retry automatically", async ({
  page,
}) => {
  let target = "";
  let failed = false;
  await page.route("**/api/wallpapers/*/thumbnail*", async (route) => {
    const url = new URL(route.request().url());
    if (!failed) {
      failed = true;
      target = url.pathname;
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    if (url.pathname === target) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: await sharp({
          create: {
            width: 400,
            height: 300,
            channels: 3,
            background: "#334455",
          },
        })
          .png()
          .toBuffer(),
      });
      return;
    }
    await route.continue();
  });
  await page.goto("/explore");
  await expect.poll(() => failed).toBeTruthy();
  const image = page.locator(`img[src*="${target}"]`);
  await expect(image).toHaveAttribute("src", /retry=1/, { timeout: 15000 });
  await expect(image).toHaveCSS("opacity", "1");
});
