import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as pagefind from 'pagefind';

const distDirectory = path.resolve(process.argv[2] ?? 'dist');
const excludedRoutes = new Set([
  '/404.html',
  '/404/',
  '/accessibility/',
  '/privacy/',
  '/search/',
  '/terms/',
]);

async function htmlFilesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await htmlFilesIn(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }

  return files;
}

function routeForFile(filePath) {
  const relativePath = path.relative(distDirectory, filePath).split(path.sep).join('/');
  if (relativePath === 'index.html') return '/';
  if (relativePath.endsWith('/index.html')) {
    return `/${relativePath.slice(0, -'/index.html'.length)}/`;
  }
  return `/${relativePath}`;
}

function markEditorialContent(html, route) {
  if (excludedRoutes.has(route)) return { html, indexed: false };

  const mainTag = html.match(/<main(?:\s[^>]*)?>/i)?.[0];
  if (!mainTag) {
    throw new Error(`Cannot mark ${route}: built HTML has no <main> element.`);
  }

  if (mainTag.includes('data-pagefind-body')) return { html, indexed: true };

  return {
    html: html.replace(mainTag, mainTag.replace(/>$/, ' data-pagefind-body>')),
    indexed: true,
  };
}

const htmlFiles = await htmlFilesIn(distDirectory);
let indexedRouteCount = 0;

for (const filePath of htmlFiles) {
  const route = routeForFile(filePath);
  const source = await readFile(filePath, 'utf8');
  const result = markEditorialContent(source, route);

  if (result.indexed) {
    indexedRouteCount += 1;
    if (result.html !== source) await writeFile(filePath, result.html);
  }
}

if (indexedRouteCount === 0) {
  throw new Error('Pagefind did not find any editorial HTML routes to index.');
}

const { index } = await pagefind.createIndex({ forceLanguage: 'en' });
const added = await index.addDirectory({
  path: distDirectory,
  glob: '**/*.html',
});

if (added.errors?.length) {
  throw new Error(`Pagefind indexing failed:\n${added.errors.join('\n')}`);
}

const output = await index.writeFiles({
  outputPath: path.join(distDirectory, 'pagefind'),
});

if (output.errors?.length) {
  throw new Error(`Pagefind output failed:\n${output.errors.join('\n')}`);
}

await pagefind.close();
console.log(`Pagefind marked ${indexedRouteCount} editorial route(s) and wrote dist/pagefind/.`);
