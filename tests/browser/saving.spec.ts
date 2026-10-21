import { test, expect } from "@playwright/test";
import sharp from "sharp";
async function detail(page: any) {
  const r = await page.request.get("/api/wallpapers?q=Aurora%20silk");
  const data = await r.json();
  await page.goto(`/wallpaper/${data.items[0].id}`);
  return data.items[0].id;
}
test("detail Fit and Fill update the rendered preview and verify actual 4K downloads", async ({
  page,
}) => {
  const id = await detail(page);
  await page
    .getByLabel("Your device", { exact: true })
    .selectOption("resolution-2");
  await expect(
    page.getByRole("button", { name: "Fill Crop to screen", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Fit Keep/ }).click();
  const preview = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/wallpapers/${id}/preview?`) &&
      new URL(r.url()).searchParams.get("fit") === "fill",
  );
  await page
    .getByRole("button", { name: "Fill Crop to screen", exact: false })
    .click();
  await page
    .getByLabel("Horizontal crop position", { exact: true })
    .press("End");
  await preview;
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download wallpaper", exact: true })
    .click();
  const file = await download;
  const m = await sharp((await file.path())!).metadata();
  expect(m.width).toBe(3840);
  expect(m.height).toBe(2160);
  expect(m.format).toBe("jpeg");
  await expect(page.getByText(/Download started/)).toBeVisible();
  const link = page.getByRole("link", { name: "Open full-resolution image" });
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.headers()["content-type"]).toBe("image/jpeg");
  expect(response.headers()["content-disposition"]).toContain("inline;");
  expect(response.headers()["x-image-width"]).toBe("3840");
});
test("iPhone flow shares an actual prepared File inside the user gesture and handles cancellation honestly", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      value: ({ files }: any) => files?.[0] instanceof File,
    });
    Object.defineProperty(navigator, "share", {
      value: ({ files }: any) => {
        (window as any).__shared = {
          name: files[0].name,
          size: files[0].size,
          type: files[0].type,
          active: navigator.userActivation.isActive,
        };
        return Promise.reject(new DOMException("Canceled", "AbortError"));
      },
    });
  });
  await detail(page);
  await page.getByLabel("Your device", { exact: true }).selectOption("iphone");
  await page
    .getByRole("button", { name: "Prepare wallpaper", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save / Share Image", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Save / Share Image", exact: true })
    .click();
  await expect(
    page.getByText("Sharing canceled. Your image is still ready."),
  ).toBeVisible();
  const shared = await page.evaluate(() => (window as any).__shared);
  expect(shared.active).toBe(true);
  expect(shared.type).toBe("image/jpeg");
  expect(shared.size).toBeGreaterThan(1000);
  expect(shared.name).toContain("1206x2622.jpg");
  await expect(
    page.locator(".save-help > p").filter({ hasText: "Files → Downloads" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
test("Android downloads a valid matching image and explains Downloads instead of claiming Photos success", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  await detail(page);
  await page
    .getByRole("button", { name: "Prepare wallpaper", exact: true })
    .click();
  await expect(page.getByText(/Verified 1440 × 3120/)).toBeVisible({
    timeout: 30000,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download File", exact: true })
    .click();
  const result = await download;
  const m = await sharp((await result.path())!).metadata();
  expect(m.width).toBe(1440);
  expect(m.height).toBe(3120);
  await expect(page.getByText(/Downloads or your browser/)).toBeVisible();
  await context.close();
});
test("failed image preparation never reports download success", async ({
  page,
}) => {
  await detail(page);
  await page.route("**/api/wallpapers/*/download?*", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Image temporarily unavailable" }),
    }),
  );
  await page
    .getByRole("button", { name: "Download wallpaper", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Image temporarily unavailable" }),
  ).toContainText("Image temporarily unavailable");
  await expect(page.getByText(/Download started/)).toHaveCount(0);
});
test("themes persist through navigation and reload and respect the initial system preference", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/explore");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "AI Studio", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
