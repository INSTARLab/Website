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

test("applicant and research routes keep route-appropriate framing", async ({ page }) => {
  const routes = [
    {
      path: "/fellowship/",
      heading: "What a prospective fellow should know before applying.",
      required: "Choose the commitment that matches your present capacity.",
    },
    {
      path: "/research/current-programs/",
      heading: "Research areas, not a status claim.",
      required: "Research areas",
    },
    {
      path: "/research/our-process/",
      heading: "What a researcher or collaborator should know about our process.",
      required: "Two ways to engage depending on where you are in the process.",
    },
  ];

  for (const route of routes) {
    await test.step(route.path, async () => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toContainText(route.heading);
      await expect(page.locator("main")).toContainText(route.required);
      const mainText = await page.locator("main").innerText();
      expect(mainText).not.toMatch(/what a sponsor should be able to evaluate|program officer|contracting team|solicitation|output a sponsor can evaluate/i);
    });
  }
});

test("fellowship paths expose the matching US Fellows application handoff", async ({ page }) => {
  await page.goto("/fellowship/", { waitUntil: "domcontentloaded" });

  const applications = [
    {
      id: "international",
      href: "https://usfellows.org/apply.html?program=International%20R%26D%20Scholar",
      commitment: "No fixed weekly commitment",
    },
    {
      id: "resident",
      href: "https://usfellows.org/apply.html?program=Resident%20R%26D%20Scholar",
      commitment: "At least 20 hours per week",
    },
  ];

  for (const application of applications) {
    await test.step(application.id, async () => {
      const link = page.locator(`[data-fellowship-apply="${application.id}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", application.href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(page.locator(`#fellowship-program-${application.id}`)).toContainText(application.commitment);
    });
  }
});

test("fellowship route passes the WCAG 2.2 AA automated scan", async ({ page }) => {
  await page.goto("/fellowship/", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

test("search stays discoverable and recoverable when there are no matches", async ({ page }) => {
  await page.goto("/search/", { waitUntil: "domcontentloaded" });

  await expect(page.locator('.site-header a[href="/search/"]')).toHaveCount(2);

  await page.locator("#search-query").fill("zzzzzzzzzzzzzzzzzzzzzzzzzz");
  await expect(page.locator("#search-empty")).toBeVisible();
  await expect(page.locator("#search-browse")).toBeVisible();
});

test("record room uses only its dedicated navigation and evidence workspace", async ({ page }) => {
  await page.goto("/record/", { waitUntil: "networkidle" });
  await expect(page.locator(".site-header, .site-footer")).toHaveCount(0);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator(".record-document h1")).toHaveText("INSTAR Lab public record");
  await expect(page.locator("[data-record-viz]").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
});

test("record room remains readable with client JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
  const response = await page.goto(`${baseURL}/record/`, { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator(".record-document h1")).toHaveText("INSTAR Lab public record");
  await expect(page.locator('.record-sidebar__nav a[href="/record/nav/"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await context.close();
});

test("primary navigation closes the previous dropdown", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  let navigation = page.locator('.site-nav__desktop');
  if (!(await navigation.isVisible())) {
    await page.locator('.site-nav__mobile-trigger').click();
    navigation = page.locator('.site-nav__mobile-panel');
  }

  const summaries = navigation.locator('summary[data-nav-summary]');
  const dropdowns = navigation.locator('details[data-nav-dropdown]');
  await summaries.nth(0).click();
  await expect(dropdowns.nth(0)).toHaveAttribute('open', '');
  await summaries.nth(1).click();
  await expect(dropdowns.nth(0)).not.toHaveAttribute('open');
  await expect(dropdowns.nth(1)).toHaveAttribute('open', '');

  await page.locator('main').click({ position: { x: 8, y: 8 } });
  await expect(navigation.locator('details[open][data-nav-dropdown]')).toHaveCount(0);
});

test("primary navigation clears transient open state across route changes", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  let navigation = page.locator('.site-nav__desktop');
  const isMobile = !(await navigation.isVisible());
  if (isMobile) {
    await page.locator('.site-nav__mobile-trigger').click();
    navigation = page.locator('.site-nav__mobile-panel');
  }

  const group = navigation.locator('details[data-nav-dropdown]').first();
  await group.locator('summary[data-nav-summary]').click();
  await group.locator('a[href="/mission/"]').click();
  await expect(page).toHaveURL(/\/mission\/$/);
  await expect(page.locator('.site-nav__mobile[open]')).toHaveCount(0);
  const openTransientDetails = isMobile
    ? page.locator('.site-nav__mobile-panel details[open][data-nav-dropdown]')
    : page.locator('.site-nav__desktop details[open][data-nav-dropdown]');
  await expect(openTransientDetails).toHaveCount(0);
});

test("primary navigation keeps a single rhythmic desktop row", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "desktop navigation assertion");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const desktopNavigation = page.locator('.site-nav__desktop');
  const metrics = await desktopNavigation.locator(':scope > ul').evaluate((list) => {
    const items = Array.from(list.children).map((item) => (item as HTMLElement).getBoundingClientRect());
    const tops = new Set(items.map((item) => Math.round(item.top)));
    const gaps = items.slice(1).map((item, index) => item.left - (items[index].right ?? item.left));
    return {
      rows: tops.size,
      minGap: Math.min(...gaps),
      clientWidth: list.clientWidth,
      scrollWidth: list.scrollWidth,
    };
  });
  expect(metrics.rows).toBe(1);
  expect(metrics.minGap).toBeGreaterThanOrEqual(4);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

  const headerHeight = await page.locator('.site-header').evaluate((header) => header.getBoundingClientRect().height);
  await desktopNavigation.locator('summary[data-nav-summary]').first().click();
  await expect(desktopNavigation.locator('details[open][data-nav-dropdown]')).toHaveCount(1);
  const openHeaderHeight = await page.locator('.site-header').evaluate((header) => header.getBoundingClientRect().height);
  expect(openHeaderHeight).toBe(headerHeight);
});

test("mobile navigation stays within the viewport with comfortable targets", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1000, "mobile navigation assertion");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.locator('.site-nav__mobile-trigger').click();
  const metrics = await page.locator('.site-nav__mobile-panel').evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    const targets = Array.from(panel.querySelectorAll('a, summary')).map((target) => target.getBoundingClientRect().height);
    return {
      left: bounds.left,
      right: bounds.right,
      minTargetHeight: Math.min(...targets),
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.innerWidth);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.minTargetHeight).toBeGreaterThanOrEqual(44);
});

test("Escape closes the active disclosure and returns focus to its summary", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  let navigation = page.locator('.site-nav__desktop');
  if (!(await navigation.isVisible())) {
    await page.locator('.site-nav__mobile-trigger').click();
    navigation = page.locator('.site-nav__mobile-panel');
  }

  const summary = navigation.locator('summary[data-nav-summary]').first();
  const dropdown = summary.locator('xpath=ancestor::details[1]');
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(dropdown).toHaveAttribute('open', '');
  await expect(summary).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press("Escape");
  await expect(dropdown).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
});

function formatViolations(violations: Array<{ id: string; help: string; nodes: Array<{ target: unknown }> }>): string {
  return violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => JSON.stringify(node.target)).join(" | ")})`)
    .join("\n");
}
