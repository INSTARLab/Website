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
        const header = element.querySelector('.record-document__header')!;
        return {
          left: rect.left,
          right: rect.right,
          titleInset: title.left - rect.left,
          headingPadding: parseFloat(getComputedStyle(header).paddingInlineStart),
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      // RR-301 SF-7: /record/leadership/ overflowed to scrollWidth 321 at
      // innerWidth 320 for a year of green runs because this assertion allowed
      // `width + 1` — exactly the size of the defect. There is no tolerance
      // now: measured on all twelve routes at 320/390/768/1280/1440/1920,
      // `scrollWidth - innerWidth` is 0 and `right - innerWidth` is 0.
      expect(bounds.scrollWidth, `${route} overflows the viewport horizontally`).toBeLessThanOrEqual(bounds.width);
      expect(bounds.right, `${route} document box escapes the viewport`).toBeLessThanOrEqual(bounds.width);
      // The old spacing assertion was `titleLeft - left >= 15`, which is
      // satisfied by a heading jammed 15px from a 32px gutter. The heading sits
      // on the shell's own gutter, so it is asserted against that gutter — the
      // computed padding of the very header that contains it. `toBeCloseTo`
      // allows half a pixel for float subtraction of two fractional rects; the
      // floor keeps a future `padding-inline: 0` from satisfying the equality.
      expect(bounds.titleInset, `${route} heading is not on the shell gutter`).toBeCloseTo(bounds.headingPadding, 0);
      expect(bounds.headingPadding, `${route} shell gutter collapsed`).toBeGreaterThanOrEqual(16);
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
      // The no-JS fallback keeps all twelve navigation links in flow, which is
      // the widest this shell ever gets below `lg`. It still may not exceed the
      // viewport: 390, not the 391 this assertion used to allow.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width);
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

// RR-301 BLK-2. `/record/` named a section with `aria-labelledby` pointing at
// an id that existed nowhere, so the section had no accessible name and the
// reference was silently discarded. Nothing in the suite enumerated references
// against ids, so it shipped. Every ARIA reference and every `<label for>` on
// every route has to resolve.
test('every Record route resolves each ARIA reference and label target', async ({ page }) => {
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const dangling = await page.evaluate(() => {
        const ids = new Set(Array.from(document.querySelectorAll('[id]')).map(element => element.id));
        const broken: string[] = [];
        for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
          for (const element of Array.from(document.querySelectorAll(`[${attribute}]`))) {
            const value = element.getAttribute(attribute) ?? '';
            for (const token of value.split(/\s+/).filter(Boolean)) {
              if (!ids.has(token)) broken.push(`${element.tagName.toLowerCase()}[${attribute}="${token}"]`);
            }
          }
        }
        for (const label of Array.from(document.querySelectorAll('label[for]'))) {
          const target = label.getAttribute('for') ?? '';
          if (!ids.has(target)) broken.push(`label[for="${target}"]`);
        }
        return broken;
      });
      expect(dangling, `${route} references ids that do not exist`).toEqual([]);
    });
  }
});

// RR-301 SF-3. Five visual components hard-coded `<h2>`, which produced two
// visible `<h2>` elements both reading "Routes by family" on /record/nav/ and
// an inverted h3 -> h2 -> h3 outline on /record/journeys/. A heading outline is
// only navigable if no level is skipped and no name is reused.
test('every Record route has a navigable heading outline', async ({ page }) => {
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(nodes => nodes.map(node => ({
        level: Number(node.tagName.slice(1)),
        name: (node.getAttribute('aria-label') ?? node.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })));
      expect(headings.length, `${route} has no headings`).toBeGreaterThan(0);
      expect(headings.filter(heading => heading.level === 1), `${route} must have exactly one h1`).toHaveLength(1);
      expect(headings[0].level, `${route} does not open with its h1`).toBe(1);
      expect(headings.some(heading => !heading.name), `${route} has an unnamed heading`).toBe(false);
      for (let index = 1; index < headings.length; index += 1) {
        expect(
          headings[index].level,
          `${route} skips from h${headings[index - 1].level} to h${headings[index].level} at "${headings[index].name}"`,
        ).toBeLessThanOrEqual(headings[index - 1].level + 1);
      }
      const names = headings.map(heading => heading.name);
      const repeated = names.filter((name, index) => names.indexOf(name) !== index);
      expect(repeated, `${route} reuses a heading name`).toEqual([]);
    });
  }
});

// RR-301 SF-8. `/record/ops/` rendered `recordBiSnapshot.source.locator`, which
// then held a private plan-file path, so the built page published
// "plan/record-room-bootstrap-bi.md#rr-208" as a public source — three times.
// Repository locators are legitimate content in the source register, and they
// are always rendered inside <code>; anywhere else on the page is prose and may
// not carry a repository path.
test('Record pages and JSON endpoints never publish an internal repository path as copy', async ({ page, request }) => {
  const repositoryPath = /\bplan\/|\.md#|\bsrc\/[\w.-]/;
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const copy = await page.evaluate(() => {
        const parts: string[] = [];
        const walk = (node: Node): void => {
          if (node.nodeType === Node.TEXT_NODE) { parts.push(node.textContent ?? ''); return; }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as Element;
          if (['CODE', 'PRE', 'SCRIPT', 'STYLE'].includes(element.tagName)) return;
          for (const child of Array.from(element.childNodes)) walk(child);
        };
        walk(document.body);
        return parts.join(' ').replace(/\s+/g, ' ');
      });
      const match = copy.match(repositoryPath);
      expect(match?.[0] ?? null, `${route} publishes an internal repository path as copy`).toBeNull();
    });
  }
  for (const name of ['meta', 'manifest', 'graph', 'journeys', 'page-metrics', 'bi']) {
    const body = await (await request.get(`/record/${name}.json`)).text();
    const match = body.match(repositoryPath);
    expect(match?.[0] ?? null, `/record/${name}.json publishes an internal repository path`).toBeNull();
  }
});

// RR-301 BLK-1. The small-screen shell is an in-flow navigation list without
// `data-record-js` and a fixed off-canvas panel with it — a 891px difference in
// where ARTICLE.record-document starts. The flag used to be set by the bundled
// `<script type="module">`, which always runs after HTML parsing, so the
// browser painted the in-flow layout and then moved the whole document: a
// single layout-shift entry of 1.0 (the maximum) on the first load of every
// page. Unthrottled headless Chromium wins that race and reports a false 0,
// which is exactly why the defect shipped, so this test throttles the CPU.
test('the Record shell resolves its layout before first paint, so a throttled phone never sees the document jump', async ({ browser, request }) => {
  test.setTimeout(120_000);

  const html = await (await request.get('/record/leadership/')).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const flagAt = head.indexOf('documentElement.dataset.recordJs');
  expect(flagAt, 'the record-js flag is not resolved during head parsing').toBeGreaterThan(-1);
  expect(head.indexOf('<link'), 'a stylesheet is parsed before the flag is set').toBeGreaterThan(flagAt);
  expect(head, 'the flag must be set by an inline script, not by the deferred module')
    .not.toMatch(/<script[^>]*type="module"[^>]*>[^<]*documentElement\.dataset\.recordJs/);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.addInitScript(() => {
      const store: number[] = [];
      (window as unknown as { __recordShifts: number[] }).__recordShifts = store;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) store.push(shift.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    for (let run = 0; run < 3; run += 1) {
      await page.goto('/record/leadership/', { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      const layout = await page.evaluate(() => {
        const store = (window as unknown as { __recordShifts: number[] }).__recordShifts;
        const article = document.querySelector('article.record-document');
        return {
          cls: store.reduce((sum, value) => sum + value, 0),
          worst: Math.max(0, ...store),
          articleTop: article ? Math.round(article.getBoundingClientRect().top) : null,
          sidebarPosition: document.querySelector('.record-sidebar')
            ? getComputedStyle(document.querySelector('.record-sidebar') as Element).position
            : null,
        };
      });
      expect(layout.worst, `run ${run + 1}: a single layout-shift entry reached ${layout.worst}`).toBeLessThan(0.1);
      expect(layout.cls, `run ${run + 1}: cumulative layout shift ${layout.cls}`).toBeLessThan(0.1);
      expect(layout.articleTop, `run ${run + 1}: the document did not start at the top of the page`).toBe(0);
      expect(layout.sidebarPosition, `run ${run + 1}: the small-screen shell is still in document flow`).toBe('fixed');
    }
  } finally {
    await context.close();
  }
});

// The chart export is the artifact a reader keeps after leaving the page, and
// until the last wave it lost the source entirely and wrote an unavailable
// observation as an empty cell — indistinguishable from a row that was never
// published. `csvDocument` quotes every cell, so an empty one is `,"",`.
test('Record chart exports keep their source, never blank a cell, and say "Not reported" out loud', async ({ page }) => {
  let exports = 0;
  let unavailable = 0;
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const hrefs = await page.locator('[data-record-viz] a.record-viz__export').evaluateAll(
        links => links.map(link => link.getAttribute('href') ?? ''),
      );
      for (const href of hrefs) {
        exports += 1;
        expect(href.startsWith('data:text/csv;charset=utf-8,'), `${route} export is not a CSV data URI`).toBe(true);
        const csv = decodeURIComponent(href.slice('data:text/csv;charset=utf-8,'.length));
        const [header, ...rows] = csv.split('\n');
        expect(header, `${route} export header`).toContain('"Source"');
        for (const row of rows) {
          expect(row, `${route} export blanks a cell`).not.toMatch(/,"",|^"",/);
          if (row.includes('"Not reported"')) unavailable += 1;
        }
      }
    });
  }
  expect(exports, 'no chart export was rendered to check').toBeGreaterThan(0);
  expect(unavailable, 'no export exercised the unavailable-value wording').toBeGreaterThan(0);

  // The charts built from the BI snapshot carry the approval reference an
  // operator needs to trace a value to its sign-off. The charts built from the
  // site's own route manifests have no snapshot approval to cite and correctly
  // omit the column, so this is asserted where the snapshot is the subject.
  for (const route of ['/record/ops/', '/record/federal/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const headers = await page.locator('[data-record-viz] a.record-viz__export').evaluateAll(
      links => links.map(link => decodeURIComponent((link.getAttribute('href') ?? '').slice('data:text/csv;charset=utf-8,'.length).split('\n')[0])),
    );
    expect(headers.length, `${route} renders no BI chart export`).toBeGreaterThan(0);
    for (const header of headers) {
      expect(header, `${route} BI export drops the approval reference`).toContain('"Approval"');
    }
  }
});

// RR-301 SF-6. `aria-modal="true"` asserts that everything outside the dialog
// is unavailable, but nothing enforced it, so a virtual cursor could still read
// the page behind the panel. The shell now inerts the document while the panel
// is open and releases it on close — and must not inert the panel itself, which
// lives inside the same region.
test('the off-canvas Record panel makes the page behind it inert, and releases it on close', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 992, 'mobile offcanvas');
  await page.goto('/record/', { waitUntil: 'networkidle' });
  const document = page.locator('#main-content');
  const panel = page.locator('.record-sidebar');
  const trigger = page.getByRole('button', { name: /record menu/i });
  await expect(document).not.toHaveAttribute('inert', /.*/);
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(document).toHaveAttribute('inert', /.*/);
  await expect(panel).not.toHaveAttribute('inert', /.*/);
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(document).not.toHaveAttribute('inert', /.*/);
});
