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
  await page.getByRole("textbox", { name: "Search wallpapers" }).fill("Aurora");
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
  await page.goto("/studio");
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
  await expect(page.getByText(/resized. Cropped/)).toBeVisible();
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
  await page.goto("/studio");
  await expect(page.getByRole("checkbox", { name: /I own/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Sunset", exact: true }).click();
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  await page.getByRole("button", { name: "Noir", exact: true }).click();
  await page.getByLabel("Wallpaper text").fill("STAY CURIOUS");
  await page
    .getByRole("combobox", { name: "Font", exact: true })
    .selectOption("serif");
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
  await page.setViewportSize({ width: 390, height: 844 });
  const ready = page.waitForResponse((r) =>
    r.url().endsWith("/api/capabilities"),
  );
  await page.goto("/studio");
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
  ).toHaveValue("art");
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
  expect(rect!.y).toBeLessThan(20);
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
