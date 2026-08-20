import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const distRoot = join(process.cwd(), 'dist');

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const pathname = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(pathname));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(pathname);
  }
  return files;
}

function routeFor(file) {
  const pathname = relative(distRoot, file).replaceAll('\\', '/');
  if (pathname === 'index.html') return '/';
  return `/${pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '')}/`;
}

function meta(html, name, attribute = 'name') {
  const expression = new RegExp(`<meta\\s+[^>]*${attribute}=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(expression)?.[0] ?? '';
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '';
}

function structuredData(html, route) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1, `${route}: expected one JSON-LD script`);
  assert.doesNotMatch(scripts[0][1], /</, `${route}: JSON-LD must escape HTML-significant characters`);
  return JSON.parse(scripts[0][1]);
}

function assertAbsoluteUrls(value, route, key = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAbsoluteUrls(item, route, `${key}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [property, child] of Object.entries(value)) {
    const childKey = key ? `${key}.${property}` : property;
    if (['url', '@id', 'logo', 'image', 'item'].includes(property) && typeof child === 'string') {
      assert.match(child, /^https:\/\//, `${route}: ${childKey} must be an HTTPS absolute URL`);
    }
    assertAbsoluteUrls(child, route, childKey);
  }
}

test('built routes expose truthful, parseable SEO structured data', async () => {
  const files = await htmlFiles(distRoot);
  assert.ok(files.length > 0, 'dist must contain built HTML before running SEO tests');

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const route = routeFor(file);
    const document = structuredData(html, route);
    const graph = document['@graph'];
    assert.equal(document['@context'], 'https://schema.org', `${route}: schema context`);
    assert.ok(Array.isArray(graph), `${route}: schema graph`);

    const types = graph.map((node) => node['@type']);
    assert.ok(types.includes('Organization'), `${route}: Organization node`);
    assert.ok(types.includes('WebSite'), `${route}: WebSite node`);
    assert.ok(types.includes('WebPage') || types.includes('Article'), `${route}: page entity node`);
    if (meta(html, 'robots').includes('noindex')) {
      assert.ok(!types.includes('BreadcrumbList'), `${route}: noindex pages must not advertise breadcrumbs`);
    } else if (route !== '/') {
      assert.ok(types.includes('BreadcrumbList'), `${route}: indexable nested pages need breadcrumbs`);
    }

    assertAbsoluteUrls(document, route);
  }
});
