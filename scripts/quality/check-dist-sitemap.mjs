#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  absolutePath,
  listHtmlFiles,
  pageMetadata,
  parseArgs,
  printHelp,
  relativeToRepo,
  routeFromHtml,
  readText,
  stripBasePath,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", sitemap: "", origin: "", base: process.env.ASTRO_BASE ?? "" });

if (options.help) {
  printHelp([
    "Compare the generated sitemap route set with rendered HTML routes.",
    "Usage: node scripts/quality/check-dist-sitemap.mjs --dist dist --origin https://example.test [--base /Website/] [--sitemap dist/sitemap-index.xml]",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  process.exit(2);
}

function findDefaultSitemap() {
  for (const name of ["sitemap-index.xml", "sitemap-0.xml", "sitemap.xml"]) {
    const candidate = join(root, name);
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

const sitemapFile = options.sitemap ? absolutePath(options.sitemap) : findDefaultSitemap();
if (!sitemapFile || !existsSync(sitemapFile)) {
  console.error(`Generated sitemap not found below ${root}.`);
  console.error("Pass --sitemap explicitly when the integration uses a custom sitemap filename.");
  process.exit(2);
}

function routeFromSitemapUrl(value) {
  try {
    const parsed = new URL(value, options.origin || "https://astro.invalid");
    const pathname = stripBasePath(parsed.pathname || "/", options.base);
    if (pathname === "/") return "/";
    if (pathname.endsWith("/index.html")) return pathname.slice(0, -"index.html".length);
    if (!pathname.slice(1).includes("/") && pathname.endsWith(".html")) return pathname;
    if (pathname.endsWith(".html")) return pathname.slice(0, -5);
    return pathname;
  } catch {
    return value;
  }
}

function readSitemap(file, visited = new Set()) {
  const absolute = absolutePath(file);
  if (visited.has(absolute)) return { urls: [], errors: [] };
  visited.add(absolute);
  const xml = readFileSync(absolute, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
  if (/<sitemapindex\b/i.test(xml)) {
    const nested = { urls: [], errors: [] };
    for (const loc of locs) {
      let nestedFile = "";
      try {
        const parsed = new URL(loc, options.origin || "https://astro.invalid");
        const pathname = stripBasePath(parsed.pathname || "/", options.base);
        nestedFile = join(root, pathname.replace(/^\//, ""));
      } catch {
        nestedFile = join(dirname(absolute), loc);
      }
      if (!existsSync(nestedFile)) {
        nested.errors.push({ sitemap: relativeToRepo(absolute), loc, reason: "missing-nested-sitemap" });
      } else {
        const result = readSitemap(nestedFile, visited);
        nested.urls.push(...result.urls);
        nested.errors.push(...result.errors);
      }
    }
    return nested;
  }
  return { urls: locs, errors: [] };
}

const sitemapResult = readSitemap(sitemapFile);
const sitemapRoutes = new Set(sitemapResult.urls.map(routeFromSitemapUrl));
const renderedRoutes = new Set();
const nonIndexableRoutes = new Set();

for (const file of listHtmlFiles(root)) {
  const route = routeFromHtml(root, file);
  const metadata = pageMetadata(readText(file), route);
  if (metadata.indexable && !/^\/(?:404|500|offline)(?:\/|$)/.test(route)) renderedRoutes.add(route);
  else nonIndexableRoutes.add(route);
}

const duplicates = sitemapResult.urls
  .map(routeFromSitemapUrl)
  .filter((route, index, routes) => routes.indexOf(route) !== index)
  .filter((route, index, routes) => routes.indexOf(route) === index);
const missingFromSitemap = [...renderedRoutes].filter((route) => !sitemapRoutes.has(route)).sort();
const sitemapNotRendered = [...sitemapRoutes]
  .filter((route) => !renderedRoutes.has(route) && !nonIndexableRoutes.has(route))
  .sort();

console.log(`Rendered indexable routes: ${renderedRoutes.size}; sitemap URLs: ${sitemapRoutes.size}.`);
if (missingFromSitemap.length === 0 && sitemapNotRendered.length === 0 && duplicates.length === 0 && sitemapResult.errors.length === 0) {
  console.log("Generated sitemap is consistent with rendered indexable routes.");
} else {
  for (const route of missingFromSitemap) console.error(`  rendered route missing from sitemap: ${route}`);
  for (const route of sitemapNotRendered) console.error(`  sitemap route missing from rendered output: ${route}`);
  for (const route of duplicates) console.error(`  duplicate sitemap route: ${route}`);
  for (const error of sitemapResult.errors) console.error(`  ${error.sitemap}: ${error.reason} (${error.loc})`);
  process.exitCode = 1;
}
