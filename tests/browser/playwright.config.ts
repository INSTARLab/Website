import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const distDirectory = process.env.ASTRO_DIST_DIR ?? "dist";

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 2),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `node scripts/quality/serve-dist.mjs --dist ${JSON.stringify(distDirectory)} --port 4173`,
        cwd: process.cwd(),
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
