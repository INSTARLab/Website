#!/usr/bin/env node

import { access, copyFile, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const distDirectory = resolve(process.argv[2] ?? 'dist');
const indexPath = join(distDirectory, 'sitemap-index.xml');
const indexXml = await readFile(indexPath, 'utf8');
const nestedSitemapUrl = indexXml.match(/<loc>([^<]+)<\/loc>/i)?.[1];

if (!nestedSitemapUrl) {
  throw new Error(`Could not find a nested sitemap in ${indexPath}.`);
}

// Astro writes sitemap files at the artifact root even when a project Pages
// base path is configured. Use the generated filename, not the URL pathname,
// so the compatibility alias works for both root and project deployments.
const nestedSitemapPath = join(distDirectory, basename(new URL(nestedSitemapUrl).pathname));
await access(nestedSitemapPath);
await copyFile(nestedSitemapPath, join(distDirectory, 'sitemap.xml'));

console.log(`Copied ${basename(nestedSitemapPath)} to the conventional sitemap.xml alias.`);
