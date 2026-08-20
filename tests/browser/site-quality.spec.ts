import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const distDirectory = resolve(process.env.ASTRO_DIST_DIR ?? "dist");

// The full WCAG sweep intentionally analyzes every rendered route in both
// viewport projects; keep the budget above the constrained CI runner's 3m
// default while retaining a finite upper bound.
test.setTimeout(420_000);

function listHtmlFiles(directory: string, result: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".astro", "node_modules"].includes(entry.name)) continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) listHtmlFiles(file, result);
    else if (entry.isFile() && entry.name.endsWith(".html")) result.push(file);
  }
  return result.sort();
}

function routeFor(file: string): string {
  const relativeFile = relative(distDirectory, file).split(sep).join("/");
  if (relativeFile === "index.html") return "/";
  if (relativeFile.endsWith("/index.html")) return `/${relativeFile.slice(0, -"index.html".length)}`;
  if (!relativeFile.includes("/") && relativeFile.endsWith(".html")) return `/${relativeFile}`;
  return `/${relativeFile.replace(/\.html$/i, "")}`;
}

function builtRoutes(): string[] {
  const files = listHtmlFiles(distDirectory);
  if (files.length === 0) throw new Error(`No rendered HTML found below ${distDirectory}`);
  return files.map(routeFor);
}

function redirectRoutes(): Set<string> {
  return new Set(
    listHtmlFiles(distDirectory)
      .filter((file) => /<meta\s+http-equiv=["']refresh["']/i.test(readFileSync(file, "utf8")))
      .map(routeFor),
  );
}

test("every rendered route responds without document-level overflow", async ({ page }) => {
  for (const route of builtRoutes()) {
    await test.step(route, async () => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !(route === "/404.html" && message.text().includes("Failed to load resource: the server responded with a status of 404"))) {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `${route} did not return a response`).not.toBeNull();
      if (route === "/404.html") {
        expect(response?.status(), `${route} should preserve its not-found status`).toBe(404);
      } else {
        expect(response?.status(), `${route} returned an HTTP error`).toBeLessThan(400);
      }
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator("h1"), `${route} should expose one primary heading`).toHaveCount(1);

      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route} has horizontal document overflow`).toBeLessThanOrEqual(dimensions.innerWidth + 1);
      expect(consoleErrors, `${route} emitted console errors`).toEqual([]);
      expect(pageErrors, `${route} emitted page errors`).toEqual([]);
    });
  }
});

test("every rendered route passes the WCAG 2.2 AA automated scan", async ({ page }) => {
  const redirects = redirectRoutes();
  for (const route of builtRoutes()) {
    await test.step(route, async () => {
      if (redirects.has(route)) return;
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations, formatViolations(results.violations)).toEqual([]);
    });
  }
});

test("the production artifact serves stylesheets as CSS", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const stylesheetHrefs = await page.locator('link[rel~="stylesheet"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );

  expect(stylesheetHrefs.length, "the home route should emit at least one stylesheet").toBeGreaterThan(0);
  for (const stylesheetHref of stylesheetHrefs) {
    const response = await request.get(stylesheetHref);
    expect(response.status(), `${stylesheetHref} should return HTTP 200`).toBe(200);
    expect(response.headers()["content-type"], `${stylesheetHref} should have a CSS MIME type`).toMatch(/^text\/css\b/i);
  }
});

test("the home route keeps keyboard focus in the document", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(focusedElement).not.toBe("BODY");
});

test("the client router preserves the editorial shell across navigation", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('.home-masthead__actions a[href="/research/current-programs/"]').click();
  await expect(page).toHaveURL(/\/research\/current-programs\/$/);
  await expect(page.locator("h1")).toContainText("Current Research Programs");
  await expect(page.locator(".site-header")).toBeVisible();
});

function formatViolations(violations: Array<{ id: string; help: string; nodes: Array<{ target: unknown }> }>): string {
  return violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => JSON.stringify(node.target)).join(" | ")})`)
    .join("\n");
}
