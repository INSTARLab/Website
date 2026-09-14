import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['', 'leadership/', 'marketing/', 'journeys/', 'federal/', 'verify/', 'files/', 'nav/', 'metrics/', 'screens/', 'ops/', 'style/'].map(part => `/record/${part}`);

test('every Record page has an isolated shell, evidence visual and readable spacing', async ({ page }) => {
  for (const route of routes) {
    await test.step(route, async () => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
      await expect(page.locator('.record-sidebar__nav a')).toHaveCount(12);
      await expect(page.locator('.record-sidebar a[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('[data-record-viz]').first()).toBeVisible();
      const bounds = await page.locator('.record-document').evaluate(element => {
        const rect = element.getBoundingClientRect();
        const title = element.querySelector('h1')!.getBoundingClientRect();
        return { left: rect.left, right: rect.right, titleLeft: title.left, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
      });
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
      expect(bounds.titleLeft - bounds.left).toBeGreaterThanOrEqual(15);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
    });
  }
});

test('Record menu traps mobile focus, closes on Escape and restores the trigger', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 992, 'mobile offcanvas');
  await page.goto('/record/', { waitUntil: 'networkidle' });
  const trigger = page.getByRole('button', { name: /record menu/i });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const nav = page.locator('.record-sidebar');
  await expect(nav).toBeVisible();
  await page.locator('.record-sidebar__nav a').last().focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.record-sidebar')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(nav).not.toBeVisible();
  await trigger.click();
  await page.locator('.record-sidebar__nav a[href="/record/verify/"]').click();
  await expect(page).toHaveURL(/\/record\/verify\/$/);
  await expect(page.getByRole('button', { name: /record menu/i })).toBeVisible();
  await expect(page.locator('.offcanvas-backdrop')).toHaveCount(0);
});

test('all Record routes remain navigable and meaningful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
    for (const route of routes) {
      await page.goto(`${base}${route}`);
      await expect(page.locator('.record-sidebar__nav a').first()).toBeVisible();
      await expect(page.locator('.record-sidebar__nav a').last()).toBeVisible();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('[data-record-viz]').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    }
  } finally { await context.close(); }
});

test('Record navigation crosses marketing boundaries without CSS or script leakage', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const baseline = await page.locator('.site-header').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  // Select the actual public Record link and make its native disclosure visible if necessary.
  const link = page.locator('a[href="/record/"]').first();
  await link.evaluate(element => {
    let parent = element.parentElement;
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
  });
  // Marketing has separate desktop/mobile navigation; dispatch the real anchor activation if its copy is hidden.
  if (await link.isVisible()) await link.click();
  else await link.evaluate((element: HTMLAnchorElement) => element.click());
  await expect(page).toHaveURL(/\/record\/$/);
  await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
  if ((page.viewportSize()?.width ?? 0) < 992) await page.getByRole('button', { name: /record menu/i }).click();
  await page.locator('.record-sidebar a[href="/"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.site-header')).toBeVisible();
  const after = await page.locator('.site-header').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  expect(after).toEqual(baseline);
  await expect(page.locator('.record-sidebar, .offcanvas-backdrop')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/record\/$/);
  await expect(page.locator('.site-header')).toHaveCount(0);
});

test('Record JSON endpoints stay public and do not invent operational observations', async ({ request }) => {
  for (const name of ['meta', 'manifest', 'graph', 'journeys', 'page-metrics', 'bi']) {
    const response = await request.get(`/record/${name}.json`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toBeTruthy();
  }
  const bi = await (await request.get('/record/bi.json')).json();
  expect(bi.schemaVersion).toBe(1);
  expect(bi.metrics).toHaveLength(4);
  // This repository has no approved institutional observations yet. Adding them must update this fixture expectation.
  expect(bi.observations).toEqual([]);
});

test('Record content reflows at narrow, tablet and wide widths and supports reduced motion', async ({ page }) => {
  for (const width of [320, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/record/');
  await page.getByRole('button', { name: /record menu/i }).click();
  expect(await page.locator('.record-sidebar').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('Record print output hides navigation and exposes chart tables', async ({ page }) => {
  await page.goto('/record/metrics/');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.record-sidebar')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /record menu/i })).not.toBeVisible();
  await expect(page.locator('.record-viz__table-details table').first()).toBeVisible();
});


test('Record route inventory covers the whole graph and filters actual rows', async ({ page, request }) => {
  const graph = await (await request.get('/record/graph.json')).json();
  await page.goto('/record/nav/');
  const paths = await page.locator('[data-route-item] code').allTextContents();
  expect(paths.sort()).toEqual(graph.nodes.map((node: { id: string }) => node.id).sort());
  await page.locator('[data-route-filter]').fill('/research/open-data/');
  await expect(page.locator('[data-route-item]:visible')).toHaveCount(1);
  await expect(page.locator('[data-route-item]:visible code')).toHaveText('/research/open-data/');
  await page.locator('[data-route-filter]').fill('no-route-exists-with-this-text');
  await expect(page.locator('[data-route-count]')).toHaveText('0 routes');
  await page.locator('[data-route-filter]').fill('');
  await expect(page.locator('[data-route-item]:visible')).toHaveCount(graph.nodes.length);
});


test('Record skip link bypasses the repeated sidebar', async ({ page }) => {
  await page.goto('/record/');
  await page.keyboard.press('Tab');
  await page.getByRole('link', { name: /skip to main content/i }).press('Enter');
  await expect(page.locator('.record-document')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.record-sidebar')))).toBe(false);
});

// The Record Room shipped a muted token (#667786 = 4.13:1 on the record ground)
// that only the sweeping site-quality scan caught. Keep a focused guard on the
// tokens themselves plus an axe contrast pass so the room cannot silently
// regress to sub-AA secondary text.
const minimumContrast = 4.5;

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: number[]): number {
  const [red, green, blue] = rgb.map(channelLuminance);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: number[], background: number[]): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(value: string): number[] {
  const channels = value.match(/\d+(?:\.\d+)?/g);
  if (!channels || channels.length < 3) throw new Error(`Cannot parse the computed color "${value}"`);
  return channels.slice(0, 3).map(Number);
}

function contrastTokens() {
  const root = document.querySelector('.record-body');
  if (!root) throw new Error('The record shell did not render a .record-body element');
  const styles = getComputedStyle(root);
  const resolve = (value: string) => {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    probe.style.color = value;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  };
  const raw = (token: string) => styles.getPropertyValue(token).trim();
  return {
    background: resolve(raw('--bs-body-bg')),
    muted: resolve(raw('--color-muted')),
    secondaryColor: resolve(raw('--bs-secondary-color')),
    secondaryRgb: raw('--bs-secondary-rgb'),
    codeColor: resolve(raw('--bs-code-color')),
  };
}

test('every Record route keeps AA contrast for muted, secondary and code text', async ({ page }) => {
  test.setTimeout(180_000);
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const tokens = await page.evaluate(contrastTokens);
      const background = parseRgb(tokens.background);
      const samples: Array<[string, number[]]> = [
        ['--color-muted', parseRgb(tokens.muted)],
        ['--bs-secondary-color', parseRgb(tokens.secondaryColor)],
        ['--bs-secondary-rgb', parseRgb(tokens.secondaryRgb)],
        ['--bs-code-color', parseRgb(tokens.codeColor)],
      ];
      for (const [token, rgb] of samples) {
        const ratio = contrastRatio(rgb, background);
        expect(ratio, `${route} ${token} (${rgb.join(', ')}) contrasts ${ratio.toFixed(2)}:1 against ${tokens.background}`).toBeGreaterThanOrEqual(minimumContrast);
      }
      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const violations = results.violations.map(violation => `${violation.id}: ${violation.help} (${violation.nodes.map(node => JSON.stringify(node.target)).join(' | ')})`);
      expect(violations, `${route} has contrast violations`).toEqual([]);
    });
  }
});
