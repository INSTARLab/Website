import { defineConfig, devices } from "@playwright/test";

/*
 * The browser leg must test the artifact this run just built.
 *
 * It used to set `reuseExistingServer: !process.env.CI` on a hard-coded port
 * 4173. With `CI` unset — which is the case for every local `pnpm run verify`
 * and for any shared working tree — Playwright would silently attach to
 * whatever was already listening on 4173 instead of starting the server below.
 * A stale `dist/` from an earlier build, another agent's server, or a server
 * pointed at a different directory all produce a green run that measured an
 * artifact this build did not produce. That is not a gate.
 *
 * Two changes make the attach path impossible rather than unlikely:
 *
 * 1. The suite serves on its own port, separate from the 4173/4174/4183 the
 *    other sessions in this tree occupy, and passes that base URL to the tests
 *    explicitly. `PLAYWRIGHT_WEB_SERVER_PORT` overrides it if 4187 is taken.
 * 2. `reuseExistingServer` is false unconditionally. If the port is occupied
 *    Playwright aborts with "…is already used, make sure that nothing is
 *    running on the port/url" instead of testing the stranger's server, so a
 *    collision fails loudly rather than passing quietly.
 *
 * Local development is unaffected: `pnpm run dev` is `astro dev` on its own
 * dev-server port and never touches this file. `pnpm run test:browser` still
 * starts and stops the server for you; only the port moved.
 *
 * Setting `PLAYWRIGHT_BASE_URL` still skips the webServer entirely. That is an
 * explicit, visible operator choice (CI passing a known origin), not a silent
 * attach, and it is the only remaining way this config will test a server it
 * did not start.
 */
const distDirectory = process.env.ASTRO_DIST_DIR ?? "dist";
const webServerPort = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? "4187");

if (!Number.isInteger(webServerPort) || webServerPort < 1 || webServerPort > 65535) {
  throw new Error(
    `PLAYWRIGHT_WEB_SERVER_PORT must be a port number between 1 and 65535, received ${JSON.stringify(process.env.PLAYWRIGHT_WEB_SERVER_PORT)}`,
  );
}

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${webServerPort}`;

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
  // A test that needs an absolute origin inside a browser context must take it
  // from this `baseURL` rather than re-deriving one, so there is exactly one
  // place the suite decides which server it is testing.
  webServer: externalBaseURL
    ? undefined
    : {
        command: `node scripts/quality/serve-dist.mjs --dist ${JSON.stringify(distDirectory)} --port ${webServerPort}`,
        cwd: process.cwd(),
        url: baseURL,
        reuseExistingServer: false,
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
