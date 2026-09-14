import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';
import { chromium } from '@playwright/test';

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const label = argValue('--label', `record-${Date.now()}`);
const directory = join(argValue('--output', 'artifacts/record-visuals'), label);
const dist = resolve(argValue('--dist', 'dist'));
// Keep the default aligned with tests/browser/playwright.config.ts, which
// serves the built artifact on its own port. 4173 belongs to other sessions in
// this working tree; this tool must not default onto a server it did not start.
const baseUrl = argValue('--base-url', process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? '4187'}`).replace(/\/$/, '');
const recordRoot = join(dist, 'record');
const routes = ['/record/', ...(await readdir(recordRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => `/record/${entry.name}/`)].sort();
const protectedRoutes = ['/', '/research/current-programs/', '/contact-us/'];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const evidence = { capturedAt: new Date().toISOString(), label, dist, baseUrl, routes, artifacts: {}, measurements: [] };
await mkdir(directory, { recursive: true });
for (const route of [...routes, ...protectedRoutes]) {
  evidence.artifacts[route] = createHash('sha256').update(await readFile(join(dist, route, 'index.html'))).digest('hex');
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of [...routes, ...protectedRoutes]) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const stem = `${viewport.width}-${route.replaceAll('/', '-').replace(/^-|-$/g, '') || 'home'}`;
      await page.screenshot({ path: `${directory}/${stem}-full.png`, fullPage: true });
      await page.screenshot({ path: `${directory}/${stem}-fold.png` });
      evidence.measurements.push(await page.evaluate(() => {
        const main = document.querySelector('main');
        const bounds = main?.getBoundingClientRect();
        const styles = main ? getComputedStyle(main) : null;
        return { route: location.pathname, width: innerWidth, height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth, heightTotal: document.body.scrollHeight,
          mains: document.querySelectorAll('main').length, marketingHeaders: document.querySelectorAll('.site-header').length,
          marketingHeaderHeight: document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0,
          marketingFooters: document.querySelectorAll('.site-footer').length,
          mainBounds: bounds ? { x: bounds.x, width: bounds.width } : null,
          mainPadding: styles ? { left: styles.paddingLeft, right: styles.paddingRight } : null };
      }));
    }
    // Preserve marketing navigation open states for cross-shell comparisons.
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const trigger = viewport.width >= 992 ? page.locator('.site-nav__desktop summary[data-nav-summary]').first() : page.locator('.site-nav__mobile-trigger');
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.screenshot({ path: `${directory}/${viewport.width}-marketing-menu-open.png` });
    }
    if (viewport.width < 992) {
      await page.goto(`${baseUrl}/record/`, { waitUntil: 'networkidle' });
      const menu = page.getByRole('button', { name: /record menu/i });
      if (await menu.count() && await menu.isVisible()) {
        await menu.click();
        await page.screenshot({ path: `${directory}/${viewport.width}-record-menu-open.png` });
      }
    }
  }
  await writeFile(`${directory}/evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
  const images = evidence.measurements.map(row => {
    const stem = `${row.width}-${row.route.replaceAll('/', '-').replace(/^-|-$/g, '') || 'home'}`;
    return `<figure><figcaption>${row.width}px ${row.route}</figcaption><a href="${stem}-full.png"><img loading="lazy" src="${stem}-full.png" alt="${row.route} at ${row.width}px"></a></figure>`;
  }).join('\n');
  await writeFile(`${directory}/contact-sheet.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Record visual evidence ${label}</title><style>body{font:16px sans-serif;background:#eee}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}figure{margin:0;background:white;padding:8px}img{width:100%;height:auto}figcaption{padding:8px}</style><h1>${label}</h1><main>${images}</main></html>`);
  console.log(`Captured ${routes.length} Record routes and ${protectedRoutes.length} protected routes at ${viewports.length} viewports: ${directory}`);
} finally {
  await browser.close();
}
