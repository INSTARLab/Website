import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['', 'leadership/', 'legal/', 'governance/', 'affiliations/', 'marketing/', 'journeys/', 'federal/', 'verify/', 'corrections/', 'files/', 'nav/', 'metrics/', 'screens/', 'ops/', 'style/'].map(part => `/record/${part}`);

// The top bar renders exactly one link per Record route in each of its two
// lists (grouped menus and flat strip), so the counts below are derived from
// the same list this spec sweeps. A route dropped from the ledger — or added
// without reaching both lists — fails here rather than agreeing by
// construction. Deriving the counts from one list leaves a single inventory
// to maintain.
const navigationCount = routes.length;

test('every Record page has an isolated shell, evidence visual and readable spacing', async ({ page }) => {
  // Sixteen routes with a full page load and a dozen assertions each: well
  // past the default 30s budget on a loaded shared machine (the contrast
  // sweep below already carries the same explicit budget for the same reason).
  test.setTimeout(180_000);
  for (const route of routes) {
    await test.step(route, async () => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
      await expect(page.locator('.record-topbar__menu a')).toHaveCount(navigationCount);
      await expect(page.locator('.record-topbar__flat-list a')).toHaveCount(navigationCount);
      await expect(page.locator('.record-topbar__menu a[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.record-topbar__flat-list a[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.record-topbar__group > button')).toHaveCount(4);
      await expect(page.locator('.record-topbar__group > button[aria-current="true"]')).toHaveCount(1);
      // RR-101: no permanent global left rail remains at any width.
      await expect(page.locator('.record-sidebar')).toHaveCount(0);
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

test('Record group menus open one at a time, close on Escape and return focus', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 992, 'desktop dropdowns');
  test.setTimeout(120_000);
  await page.goto('/record/', { waitUntil: 'networkidle' });
  const start = page.getByRole('button', { name: 'Start', exact: true });
  const trust = page.getByRole('button', { name: 'Trust', exact: true });
  const inspect = page.getByRole('button', { name: 'Inspect', exact: true });
  await start.click();
  await expect(page.locator('#record-menu-start')).toBeVisible();
  await expect(start).toHaveAttribute('aria-expanded', 'true');
  // Sibling close: opening a second group closes the first.
  await trust.click();
  await expect(page.locator('#record-menu-start')).not.toBeVisible();
  await expect(page.locator('#record-menu-trust')).toBeVisible();
  // Arrow keys walk the group buttons and close any open menu.
  await trust.press('ArrowRight');
  await expect(inspect).toBeFocused();
  await expect(page.locator('#record-menu-trust')).not.toBeVisible();
  // ArrowDown opens the focused group and lands on its first link.
  await inspect.press('ArrowDown');
  await expect(page.locator('#record-menu-inspect a').first()).toBeFocused();
  // Escape closes and returns focus to the owning button.
  await page.keyboard.press('Escape');
  await expect(page.locator('#record-menu-inspect')).not.toBeVisible();
  await expect(inspect).toBeFocused();
  // Outside interaction closes without moving focus into the page.
  await start.click();
  await expect(page.locator('#record-menu-start')).toBeVisible();
  await page.locator('.record-document h1').click();
  await expect(page.locator('#record-menu-start')).not.toBeVisible();
  // Choosing a destination navigates with the menus closed.
  await trust.click();
  await page.locator('#record-menu-trust a[href="/record/verify/"]').click();
  await expect(page).toHaveURL(/\/record\/verify\/$/);
  await expect(page.locator('.record-topbar__menu:visible')).toHaveCount(0);
  // Every menu fits the viewport it opens in.
  for (const name of ['start', 'trust', 'inspect', 'run']) {
    await page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).click();
    const box = await page.locator(`#record-menu-${name}`).boundingBox();
    const viewport = page.viewportSize();
    expect(box, `${name} menu has no box`).toBeTruthy();
    expect(box!.x, `${name} menu escapes the viewport edge`).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, `${name} menu overflows the viewport`).toBeLessThanOrEqual(viewport!.width);
    await page.keyboard.press('Escape');
  }
});

test('all Record routes remain navigable and meaningful without JavaScript', async ({ browser, baseURL }) => {
  // `baseURL` is Playwright's own fixture, resolved from the config that also
  // started the server. Re-deriving an origin here (this used to hard-code
  // 4173) puts a second, unverified answer to "which artifact am I testing?"
  // in the suite, and the answer it gives is another session's server.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, baseURL });
  try {
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('.record-topbar__flat-list a').first()).toBeVisible();
      await expect(page.locator('.record-topbar__flat-list a').last()).toBeVisible();
      // The grouped menus need script: without it they stay hidden and the
      // flat strip is the whole navigation at every width.
      await expect(page.locator('.record-topbar__groups')).not.toBeVisible();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('[data-record-viz]').first()).toBeVisible();
      // The no-JS fallback keeps all sixteen navigation links in flow, which is
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
  await page.locator('.record-topbar__return').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.site-header')).toBeVisible();
  const after = await page.locator('.site-header').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  expect(after).toEqual(baseline);
  await expect(page.locator('.record-topbar')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/record\/$/);
  await expect(page.locator('.site-header')).toHaveCount(0);
});

test('Record JSON endpoints stay public and declare only approved operational observations', async ({ request }) => {
  for (const name of ['meta', 'manifest', 'graph', 'journeys', 'page-metrics', 'bi']) {
    const response = await request.get(`/record/${name}.json`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toBeTruthy();
  }
  const bi = await (await request.get('/record/bi.json')).json();
  expect(bi.schemaVersion).toBe(1);
  expect(bi.metrics).toHaveLength(7);
  expect(bi.observations.length).toBeGreaterThan(0);

  // The snapshot carries its own approval, and it is the part a reader cites
  // when they quote a figure from this endpoint. Without a basis on the
  // snapshot, a management attestation is indistinguishable from a board
  // resolution — the exact distinction the field exists to preserve.
  expect(bi.snapshot?.snapshotId, 'the published snapshot has no identity').toBeTruthy();
  expect(bi.snapshot?.status, 'the endpoint publishes a snapshot that is not published').toBe('published');
  expect(bi.snapshot?.approval?.status, 'the snapshot carries no approval').toBe('approved');
  expect(['board', 'management', 'external-publication'], 'the snapshot names no approval basis').toContain(bi.snapshot.approval.basis);
  expect(bi.snapshot.approval.reference, 'the snapshot cites no approval reference').toBeTruthy();
  expect(bi.snapshot.approval.approvedBy, 'the snapshot names no approver').toBeTruthy();
  expect(bi.snapshot.approval.approvedAt, 'the snapshot has no approval date').toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // The suite used to assert that no observation existed at all. What matters
  // is not that the array is empty but that nothing in it is invented: every
  // published figure must name the source it came from, who approved it, when,
  // and on whose authority — and a row with no value must say why rather than
  // posing as a measured zero.
  const contract = ['metricId', 'value', 'unavailableReason', 'unit', 'period', 'asOf', 'dimensions', 'source', 'approval', 'reviewOwner', 'nextReviewDate'];
  for (const observation of bi.observations) {
    expect(Object.keys(observation).every(key => contract.includes(key)), 'an observation carries a field outside the published contract').toBe(true);
    expect(observation.source?.id, 'an observation has no source').toBeTruthy();
    expect(observation.approval?.status, 'an observation is not approved').toBe('approved');
    expect(['board', 'management', 'external-publication'], 'an observation has no approval basis').toContain(observation.approval.basis);
    expect(observation.approval.approvedBy, 'an observation names no approver').toBeTruthy();
    expect(observation.approval.approvedAt, 'an observation has no approval date').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (observation.value === null) {
      expect((observation.unavailableReason ?? '').trim().length, `${observation.metricId} publishes a missing value with no reason`).toBeGreaterThan(0);
    } else {
      expect(observation.value).toBeGreaterThanOrEqual(0);
      expect(observation.unavailableReason, 'a measured value carries an unavailability reason').toBeUndefined();
    }
  }
});

test('Record content reflows at narrow, tablet and wide widths and supports reduced motion', async ({ page }) => {
  // Sixteen routes at five widths: eighty page loads, far past the default
  // 30s budget even unloaded.
  test.setTimeout(300_000);
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
  // The group menus toggle instantly — there is no panel transition to
  // suppress under reduced motion.
  expect(await page.locator('#record-menu-trust').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('Record print output hides navigation and exposes chart tables', async ({ page }) => {
  await page.goto('/record/metrics/');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.record-topbar')).not.toBeVisible();
  await expect(page.locator('.record-document__footer')).not.toBeVisible();
  await expect(page.locator('[data-record-jump-nav]')).not.toBeVisible();
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

test('Record visual sitemap keeps directory, ranking, preview, graph and finder consistent', async ({ page, request }) => {
  const graph = await (await request.get('/record/graph.json')).json();
  const metrics = await (await request.get('/record/page-metrics.json')).json();
  await page.goto('/record/nav/');
  const topologyNodes = graph.linkGraph?.nodes ?? graph.nodes;

  // The numbered directory covers the same inventory the table and graph do.
  const directoryPaths = await page.locator('[data-directory-path]').all();
  expect(directoryPaths).toHaveLength(graph.nodes.length);
  const numbers = await page.locator('[data-directory-path] .font-monospace').allTextContents();
  const width = String(graph.nodes.length).length;
  expect(new Set(numbers).size).toBe(graph.nodes.length);
  for (const number of numbers) expect(number).toMatch(new RegExp(`^\\d{${width}}$`));
  await expect(page.locator('[data-directory-path] a[aria-current="page"] code, [data-directory-path] a[aria-current="page"]')).toHaveCount(1);

  // The inbound leaderboard renders rows with counts, backed by the metrics endpoint.
  expect(metrics.routes).toHaveLength(graph.nodes.length);
  const rankingRows = page.locator('[data-inbound-link]');
  expect(await rankingRows.count()).toBeGreaterThan(0);
  await expect(rankingRows.first()).toContainText(/\d/);

  // The preview pane is complete HTML before scripts run, with visual or
  // metadata-only state and working actions.
  await expect(page.locator('[data-route-preview] [data-preview-link]')).toHaveAttribute('href', /.+/);
  await expect(page.locator('[data-route-preview] [data-preview-copy]')).toBeVisible();
  await expect(page.locator('[data-route-preview] [data-preview-max]')).toBeVisible();
  const visualCount = await page.locator('[data-route-preview] [data-preview-visual]').count();
  const noVisualCount = await page.locator('[data-route-preview] [data-preview-novisual]').count();
  expect(visualCount + noVisualCount).toBe(1);

  // The topology renders one node per stop plus a text fallback, and choosing
  // a node updates the preview without navigating.
  await expect(page.locator('[data-graph-node]')).toHaveCount(topologyNodes.length);
  await expect(page.locator('[data-graph-fallback]')).toContainText('Topology as text');
  const previewBefore = await page.locator('[data-route-preview] [data-preview-path]').textContent();
  await page.locator('[data-graph-node]').first().locator('text').click();
  await expect(page.locator('[data-route-preview] [data-preview-path]')).not.toHaveText(previewBefore ?? '');

  // The finder returns a recorded path for a connected pair, an honest dead
  // end for a disconnected pair, and clears on Escape.
  const observedPath = graph.linkGraph?.contentEdges?.[0] ?? graph.edges[0];
  expect(observedPath?.source).toBeTruthy();
  expect(observedPath?.target).toBeTruthy();
  await page.locator('[data-finder-from]').selectOption(observedPath.source);
  await page.locator('[data-finder-to]').selectOption(observedPath.target);
  await page.locator('[data-finder-find]').click();
  await expect(page.locator('[data-finder-summary]')).toBeFocused();
  expect(await page.locator('[data-finder-result] ol li').count()).toBeGreaterThanOrEqual(2);
  await page.locator('[data-finder-from]').selectOption('/contact-us/');
  await page.locator('[data-finder-to]').selectOption('/mission/');
  await page.locator('[data-finder-find]').click();
  await expect(page.locator('[data-finder-result]')).toContainText('No observed content path');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-finder-result]')).toContainText('Choose two stops');
});

test('Record topology loads observed graph provenance, separates chrome, and keeps path semantics explicit', async ({ page, request, context }) => {
  const graph = await (await request.get('/record/graph.json')).json();
  const observed = graph.linkGraph;
  expect(observed?.schemaVersion).toBe(2);
  await page.goto('/record/nav/', { waitUntil: 'networkidle' });

  const topology = page.locator('[data-route-graph]');
  await expect(topology).toHaveAttribute('data-graph-state', 'loaded');
  await expect(topology.locator('[data-graph-status]')).toContainText(`${observed.provenance.documentCount} documents`);
  await expect(topology.locator('[data-graph-provenance]')).toContainText(`${observed.summary.contentPairs} content pairs`);
  await expect(topology.locator('[data-graph-edge-zone="content"]')).toHaveCount(observed.contentEdges.length);
  await expect(topology.locator('[data-graph-edge-zone="chrome"]')).toHaveCount(observed.chromeEdges.length);
  await expect(topology.locator('[data-graph-edge-zone="journey"]')).toHaveCount(observed.journeyOverlay.length);
  await expect(topology.locator('[data-graph-chrome-layer]')).toHaveAttribute('hidden', '');
  await expect(topology.locator('[data-graph-journey-list] [data-graph-journey]')).toHaveCount(observed.journeyOverlay.length);
  await expect(topology.locator('[data-graph-content-list] [data-graph-content-edge]')).toHaveCount(observed.contentEdges.length);
  await expect(topology.locator('[data-graph-chrome-list] [data-graph-chrome-edge]')).toHaveCount(observed.chromeEdges.length);
  await expect(topology.locator('[data-graph-content-list] [data-graph-content-edge]').first()).toContainText(observed.contentEdges[0].source);
  await expect(topology.locator('[data-graph-chrome-list] [data-graph-chrome-edge]').first()).toContainText(observed.chromeEdges[0].target);
  const graphEndpoint = await topology.getAttribute('data-graph-endpoint');
  const graphBase = graphEndpoint!.replace(/\/record\/graph\.json$/, '');
  const firstNode = topology.locator('[data-graph-node]').first();
  const firstNodePath = await firstNode.getAttribute('data-graph-node');
  expect(await firstNode.getAttribute('href')).toBe(`${graphBase}${firstNodePath}`);
  await firstNode.locator('text').click();
  await expect(page.locator('[data-preview-path]')).toHaveText(firstNodePath!);
  await expect(page.locator('[data-preview-link]')).toHaveAttribute('href', `${graphBase}${firstNodePath}`);
  await expect(page.locator('[data-preview-recents] a').first()).toHaveAttribute('href', `${graphBase}${firstNodePath}`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin });
  await page.locator('[data-preview-copy]').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(`${graphBase}${firstNodePath}`);

  await topology.locator('[data-graph-chrome-toggle]').check();
  await expect(topology.locator('[data-graph-chrome-layer]')).not.toHaveAttribute('hidden', '');
  await topology.locator('[data-graph-chrome-toggle]').uncheck();
  await expect(topology.locator('[data-graph-chrome-layer]')).toHaveAttribute('hidden', '');

  const contentPairs = new Set(observed.contentEdges.map((edge: { source: string; target: string }) => `${edge.source} ${edge.target}`));
  const reaches = (edges: Array<{ source: string; target: string }>, from: string, to: string): boolean => {
    const forward = new Map<string, string[]>();
    for (const edge of edges) forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge.target]);
    const queue = [from];
    const seen = new Set([from]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      for (const next of forward.get(current) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return false;
  };
  const chromeOnly = observed.chromeEdges.find((edge: { source: string; target: string }) =>
    !contentPairs.has(`${edge.source} ${edge.target}`)
      && !reaches(observed.contentEdges, edge.source, edge.target)
      && reaches([...observed.contentEdges, ...observed.chromeEdges], edge.source, edge.target));
  expect(chromeOnly).toBeTruthy();
  const chromeSource = topology.locator(`[data-graph-node="${chromeOnly.source}"]`);
  const chromeTarget = topology.locator(`[data-graph-node="${chromeOnly.target}"]`);
  await chromeSource.focus();
  await expect(chromeTarget).toHaveClass(/is-dim/);
  await topology.locator('[data-graph-chrome-toggle]').check();
  await chromeSource.focus();
  await expect(chromeTarget).not.toHaveClass(/is-dim/);
  await topology.locator('[data-graph-chrome-toggle]').uncheck();
  await expect(page.locator('[data-route-finder]')).toHaveAttribute('data-finder-state', 'loaded');
  await page.locator('[data-finder-from]').selectOption(chromeOnly.source);
  await page.locator('[data-finder-to]').selectOption(chromeOnly.target);
  await page.locator('[data-finder-find]').click();
  await expect(page.locator('[data-finder-result]')).toContainText('No observed content path');
  await page.locator('[data-finder-chrome]').check();
  await page.locator('[data-finder-find]').click();
  await expect(page.locator('[data-finder-result]')).toContainText('including header/footer links');
  await expect(page.locator('[data-finder-result]')).not.toContainText('No recorded path');
  expect(await page.locator('[data-finder-result] ol a').first().getAttribute('href')).toBe(`${graphBase}${chromeOnly.source}`);
});

test('Record topology keeps the authored graph and finder when the build graph fetch fails', async ({ page }) => {
  await page.route('**/record/graph.json', (route) => route.abort());
  await page.goto('/record/nav/', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-route-graph]')).toHaveAttribute('data-graph-state', 'journey-fallback');
  await expect(page.locator('[data-graph-status]')).toContainText('authored journey fallback');
  await expect(page.locator('[data-graph-chrome-toggle]')).toBeDisabled();
  await expect(page.locator('[data-graph-edge-zone="journey"]')).toHaveCount(18);
  await expect(page.locator('[data-route-finder]')).toHaveAttribute('data-finder-state', 'journey-fallback');
  await page.locator('[data-finder-from]').selectOption('/mission/');
  await page.locator('[data-finder-to]').selectOption('/record/federal/');
  await page.locator('[data-finder-find]').click();
  await expect(page.locator('[data-finder-result] ol li')).toHaveCount(6);
  await expect(page.locator('[data-finder-result]')).toContainText('Recorded journey path');
  await expect(page.locator('[data-finder-source]')).toContainText('authored journey graph');
});

test('Record topology node activation preserves preview, keyboard rows and native new tabs', async ({ page, context, isMobile }) => {
  await page.goto('/record/nav/', { waitUntil: 'networkidle' });
  const node = page.locator('[data-graph-node]').first();
  const path = await node.getAttribute('data-graph-node');
  const href = await node.getAttribute('href');
  expect(path).toBeTruthy();
  expect(href).toBeTruthy();

  // Locator clicks use real mouse input: synthetic events miss pointer
  // capture retargeting, which previously swallowed clicks on SVG nodes.
  await node.locator('text').click();
  await expect(page).toHaveURL(/\/record\/nav\/$/);
  await expect(page.locator('[data-preview-path]')).toHaveText(path!);
  await node.focus();
  await page.keyboard.press('Enter');
  const row = page.locator('[data-route-item]').filter({ has: page.locator('code', { hasText: new RegExp(`^${path!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });
  await expect(row.locator('a[href]').first()).toBeFocused();

  // Mobile browsers do not offer the desktop modifier/middle-click gesture.
  if (!isMobile) {
    for (const link of [node, page.locator('[data-inbound-link]').first()]) {
      const destination = new URL((await link.getAttribute('href'))!, page.url()).href;
      for (const gesture of ['modified', 'middle', 'target'] as const) {
        if (gesture === 'target') await link.evaluate((element) => element.setAttribute('target', '_blank'));
        const opened = context.waitForEvent('page');
        const target = link === node ? link.locator('text') : link;
        await target.click(gesture === 'modified' ? { modifiers: ['ControlOrMeta'] } : gesture === 'middle' ? { button: 'middle' } : {});
        const tab = await opened;
        await expect(tab).toHaveURL(destination);
        await tab.close();
        await expect(page).toHaveURL(/\/record\/nav\/$/);
        if (gesture === 'target') await link.evaluate((element) => element.removeAttribute('target'));
      }
    }
  }
});

for (const activation of ['click', 'Enter'] as const) {
  test(`Record topology journey-only node follows its link with ${activation}`, async ({ page }) => {
    await page.goto('/record/nav/', { waitUntil: 'networkidle' });
    const node = page.locator('[data-graph-node]').first();
    const path = await node.getAttribute('data-graph-node');
    const destination = new URL((await node.getAttribute('href'))!, page.url()).href;
    // Today's graph inventory covers all stops. Model the supported
    // journey-only state by removing this stop's inventory row.
    await page.locator('[data-route-item]').evaluateAll((rows, route) => {
      for (const row of rows) if (row.querySelector('code')?.textContent?.trim() === route) row.remove();
    }, path);
    if (activation === 'click') await node.locator('text').click();
    else {
      await node.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page).toHaveURL(destination);
  });
}

test('Record topology Enter follows the route when its inventory row is filtered out', async ({ page }) => {
  await page.goto('/record/nav/', { waitUntil: 'networkidle' });
  const node = page.locator('[data-graph-node]').first();
  const destination = new URL((await node.getAttribute('href'))!, page.url()).href;
  await page.locator('[data-route-filter]').fill('no-route-exists-with-this-text');
  await expect(page.locator('[data-route-item]:visible')).toHaveCount(0);
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(destination);
});

test('Record topology background drag pans while node clicks preserve the viewBox', async ({ page }) => {
  await page.goto('/record/nav/', { waitUntil: 'networkidle' });
  const svg = page.locator('[data-graph-svg]');
  const nodeText = page.locator('[data-graph-node]').first().locator('text');
  const home = await svg.getAttribute('viewBox');
  await nodeText.click();
  await expect(svg).toHaveAttribute('viewBox', home!);

  // Scroll the top-left graph background into view. Using mouse down/move/up
  // exercises pointer capture and drag state instead of synthetic events.
  await svg.scrollIntoViewIfNeeded();
  await svg.evaluate((element) => { element.parentElement!.scrollLeft = 0; });
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 4, box!.y + 4);
  await page.mouse.down();
  await page.mouse.move(box!.x + 44, box!.y + 28, { steps: 4 });
  await page.mouse.up();
  await expect(svg).not.toHaveAttribute('viewBox', home!);

  const panned = await svg.getAttribute('viewBox');
  await nodeText.click();
  await expect(svg).toHaveAttribute('viewBox', panned!);
});


test('Record skip link bypasses the repeated navigation', async ({ page }) => {
  await page.goto('/record/');
  await page.keyboard.press('Tab');
  await page.getByRole('link', { name: /skip to main content/i }).press('Enter');
  await expect(page.locator('.record-document')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.record-topbar')))).toBe(false);
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
  // Sixteen routes plus six endpoints per run: paced past the default 30s
  // budget on a loaded shared machine.
  test.setTimeout(120_000);
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

// RR-101. The navigation row is the flat strip without `data-record-js` and
// the grouped menus with it at desktop widths. The flag used to be set by the
// bundled `<script type="module">`, which always runs after HTML parsing, so
// the browser painted the fallback row first and then swapped the navigation
// once the module ran. Unthrottled headless Chromium wins that race and
// reports a false 0, which is exactly why the defect class shipped before, so
// this test throttles the CPU.
test('the Record shell resolves its navigation before first paint, so a throttled phone never sees the document jump', async ({ browser, request }) => {
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
        const topbar = document.querySelector('.record-topbar');
        return {
          cls: store.reduce((sum, value) => sum + value, 0),
          worst: Math.max(0, ...store),
          topbarTop: topbar ? Math.round(topbar.getBoundingClientRect().top) : null,
          topbarPosition: topbar
            ? getComputedStyle(topbar as Element).position
            : null,
        };
      });
      expect(layout.worst, `run ${run + 1}: a single layout-shift entry reached ${layout.worst}`).toBeLessThan(0.1);
      expect(layout.cls, `run ${run + 1}: cumulative layout shift ${layout.cls}`).toBeLessThan(0.1);
      expect(layout.topbarTop, `run ${run + 1}: the navigation did not start at the top of the page`).toBe(0);
      expect(layout.topbarPosition, `run ${run + 1}: the top bar is not pinned`).toBe('sticky');
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
  test.setTimeout(120_000);
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

// RR-101. The grouped menus are popovers, not modal dialogs: the page behind
// them stays interactive, and a closed menu must be truly hidden — `hidden`
// backed by CSS — so no link inside one is ever focusable or announced.
test('closed Record menus stay hidden and unfocusable, and the page behind them stays live', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 992, 'desktop dropdowns');
  await page.goto('/record/', { waitUntil: 'networkidle' });
  for (const name of ['start', 'trust', 'inspect', 'run']) {
    await expect(page.locator(`#record-menu-${name}`)).toHaveAttribute('hidden', /.*/);
  }
  // `tabIndex` reads 0 for links in a `display: none` subtree, so it cannot
  // prove anything here. Focus is the behaviour that matters: calling focus()
  // on a link inside a closed menu must leave the focused element untouched.
  const focusStuckInHidden = await page.evaluate(() => {
    const hiddenLinks = Array.from(document.querySelectorAll('.record-topbar__menu[hidden] a[href]'));
    const before = document.activeElement;
    for (const link of hiddenLinks) (link as HTMLElement).focus();
    return {
      count: hiddenLinks.length,
      moved: document.activeElement !== before,
      insideMenu: Boolean(document.activeElement?.closest('.record-topbar__menu[hidden]')),
    };
  });
  expect(focusStuckInHidden.count, 'the grouped menus render no links to check').toBe(navigationCount);
  expect(focusStuckInHidden.moved, 'a closed menu accepted focus').toBe(false);
  expect(focusStuckInHidden.insideMenu, 'focus landed inside a closed menu').toBe(false);
  const trust = page.getByRole('button', { name: 'Trust', exact: true });
  await trust.click();
  await expect(page.locator('#record-menu-trust')).toBeVisible();
  // The page behind the open menu is not inerted: content links keep working.
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert', /.*/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#record-menu-trust')).toHaveAttribute('hidden', /.*/);
  await expect(trust).toBeFocused();
});

// The three publication states are three different claims about the
// institution: "we measured this and it is zero", "this is approved and the
// value is not published", and "nothing has been approved here". Rendering any
// two of them the same way makes the room lie about one of them, so the states
// are asserted apart on the page itself rather than only in the data module.
test('Record measures keep measured zeros, approved unavailability, and unpublished measures apart', async ({ page }) => {
  await page.goto('/record/', { waitUntil: 'domcontentloaded' });
  const cards = await page.locator('[data-record-metric]').evaluateAll(elements => elements.map(element => ({
    label: element.getAttribute('data-record-metric') ?? '',
    state: element.getAttribute('data-record-value-state') ?? '',
    value: element.querySelector('.record-metric__value')?.textContent?.trim() ?? '',
    note: element.querySelector('.record-metric__note')?.textContent?.trim() ?? '',
  })));

  expect(cards.length, 'the overview renders no measures').toBeGreaterThan(0);
  const measured = cards.filter(card => card.state === 'measured');
  const unavailable = cards.filter(card => card.state === 'unavailable');
  expect(measured.length, 'no measure published a measured value').toBeGreaterThan(0);
  expect(unavailable.length, 'no measure exercised the approved-unavailable state').toBeGreaterThan(0);

  for (const card of measured) {
    // A measured value — including a measured zero — is a numeral. If it ever
    // renders as "Not reported", the page has published the opposite claim.
    expect(card.value, `${card.label} publishes a measured value as missing`).not.toBe('Not reported');
    expect(card.value, `${card.label} does not render a numeral`).toMatch(/^[\d,.]+$/);
  }
  for (const card of unavailable) {
    expect(card.value, `${card.label} invents a value it has no approval for`).toBe('Not reported');
    // The reason is the whole difference between this state and an
    // unpublished one, so it has to be on the page.
    expect(card.note.replace(/^Not reported · /, '').length, `${card.label} states no reason for its unavailability`).toBeGreaterThan(0);
  }
  // The two measures the institution has actually attested are published from
  // zero, so the overview must show them as measured zeros and not merely as
  // "some measure has a number".
  const attested = cards.filter(card => /grants awarded|publications/i.test(card.label));
  expect(attested.length, 'the attested measures are missing from the overview').toBe(2);
  for (const card of attested) {
    expect(card.state, `${card.label} is no longer published as a measured value`).toBe('measured');
    expect(card.value, `${card.label} does not render its measured zero`).toBe('0');
  }
});

// The export is the artifact a reader keeps. A spreadsheet row that says
// "Not reported" for a measured zero is the same defect as the page saying it,
// and it is harder to notice.
test('Record exports distinguish a measured zero from an unavailable value', async ({ page }) => {
  await page.goto('/record/ops/', { waitUntil: 'domcontentloaded' });
  const documents = await page.locator('[data-record-viz] a.record-viz__export').evaluateAll(links => links.map(link =>
    decodeURIComponent((link.getAttribute('href') ?? '').slice('data:text/csv;charset=utf-8,'.length)).split('\n'),
  ));
  const rowGroups = documents.map(document => document.slice(1));
  const rows = rowGroups.flat();

  // The state column has to be named, not merely populated: a reader holding
  // the file needs to know which column carries the distinction, and a dropped
  // header is the quiet way the three states stop being readable in a
  // spreadsheet.
  expect(documents.length, 'the business-status page rendered no BI export').toBeGreaterThan(0);
  for (const [index, document_] of documents.entries()) {
    expect(document_[0], `export ${index + 1} does not name the publication state column`).toContain('"State"');
  }

  expect(rows.length, 'the business-status page rendered no BI export rows').toBeGreaterThan(0);
  const measured = rows.filter(row => row.includes('"measured"'));
  const unavailable = rows.filter(row => row.includes('"unavailable"'));
  expect(measured.length, 'no export row carries a measured value').toBeGreaterThan(0);
  expect(unavailable.length, 'no export row carries an unavailable value').toBeGreaterThan(0);

  for (const row of measured) {
    expect(row, 'a measured row exported its value as missing').not.toContain('"Not reported"');
  }
  for (const row of unavailable) {
    expect(row, 'an unavailable row exported a value as if it were measured').toContain('"Not reported"');
  }
  expect(measured.some(row => row.includes(',"0",')), 'no measured zero was exported as the number zero').toBe(true);
});

// The room cites the government filing that publishes INSTAR Lab's figures
// rather than restating them as its own measures, and the ProPublica entry is
// published with the reason it shows no financial data — bare, it reads as a
// hole rather than as a record.
test('the source register cites external records with working links and stated limits', async ({ page }) => {
  await page.goto('/record/verify/', { waitUntil: 'domcontentloaded' });
  const externalLinks = await page
    .locator('a[href^="https://charitableregistration.ohioago.gov"], a[href^="https://projects.propublica.org"]')
    .evaluateAll(links => links.map(link => ({
      href: link.getAttribute('href') ?? '',
      rel: link.getAttribute('rel') ?? '',
      label: link.getAttribute('aria-label') ?? '',
    })));

  expect(externalLinks.length, 'no external record was rendered').toBeGreaterThanOrEqual(2);
  for (const link of externalLinks) {
    expect(link.rel, `${link.href} opens a new tab without noopener`).toContain('noopener');
    expect(link.label.length, `${link.href} has no accessible name`).toBeGreaterThan(0);
  }
  expect(externalLinks.some(link => link.href.includes('charitableregistration.ohioago.gov/Charities/OrganizationDetails?Id=12174620')), 'the Ohio filing link is missing').toBe(true);
  expect(externalLinks.some(link => link.href.includes('projects.propublica.org/nonprofits/organizations/850845517')), 'the ProPublica link is missing').toBe(true);

  const body = await page.locator('main').innerText();
  expect(body, 'the ProPublica entry does not explain why it shows no financial data').toMatch(/990-N/);
  expect(body, 'the ProPublica framing sentence was dropped').toMatch(/No Financial Data Available/);
  // A session-bound IRS TEOS link was verified to break; it must not come back.
  expect(await page.locator('a[href*="apps.irs.gov"]').count(), 'a session-bound IRS link was published').toBe(0);
});
