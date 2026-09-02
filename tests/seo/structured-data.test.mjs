import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const distRoot = join(process.cwd(), 'dist');
const expectedOrigin = 'https://www.instarlab.org';

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

function linkTag(html, rel, as) {
  return [...html.matchAll(/<link\s+[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => new RegExp(`rel=["']${rel}["']`, 'i').test(tag) && new RegExp(`as=["']${as}["']`, 'i').test(tag)) ?? '';
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] ?? '';
}

function linkAttribute(html, rel, name) {
  const tag = [...html.matchAll(/<link\s+[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => new RegExp(`rel=["']${rel}["']`, 'i').test(candidate));
  return tag ? attribute(tag, name) : '';
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
    const canonical = linkAttribute(html, 'canonical', 'href');
    assert.equal(new URL(canonical).origin, expectedOrigin, `${route}: canonical must use the preferred www origin`);
    const image = meta(html, 'og:image', 'property');
    const preload = linkTag(html, 'preload', 'image');
    if (image) {
      assert.ok(preload, `${route}: pages with an image should preload it`);
      assert.equal(
        new URL(attribute(preload, 'href'), `${expectedOrigin}/`).href,
        image,
        `${route}: image preload must match the page image`,
      );
    } else {
      assert.equal(preload, '', `${route}: pages without an image must not preload one`);
    }
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
