#!/usr/bin/env node
// Canonical HTML route ledger for the Record parity contract (RRP-001, #23).
//
// Derives every emitted HTML document from the production `dist/` build and
// classifies it, so counts are read off the artifact instead of hardcoded:
// ordinary indexable pages, Record routes, the noindex error document, the
// noindex search utility, and any redirect/alias documents (meta-refresh).
// The checked-in ledger in plan/record-parity-contract.md is rendered from
// this script's output; rerun it after any route change and paste fresh rows.
//
// Usage:
//   node scripts/quality/canonical-route-ledger.mjs --dist dist [--out path] [--markdown]

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  absolutePath,
  listHtmlFiles,
  openingTags,
  pageMetadata,
  parseArgs,
  printHelp,
  readText,
  relativeToRepo,
  routeFromHtml,
  writeJson,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", out: "" });

if (options.help) {
  printHelp([
    "Derive the canonical HTML route ledger from rendered output.",
    "Usage: node scripts/quality/canonical-route-ledger.mjs --dist dist [--out path] [--markdown]",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  console.error("Run the Astro production build first, then rerun this audit.");
  process.exit(2);
}

const files = listHtmlFiles(root);
if (files.length === 0) {
  console.error(`No HTML documents found below ${root}`);
  process.exit(2);
}

function readSitemapRoutes() {
  const candidates = [join(root, "sitemap-0.xml"), join(root, "sitemap.xml")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const xml = readText(file);
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => {
      try {
        return new URL(match[1]).pathname;
      } catch {
        return "";
      }
    });
    // sitemap.xml is a copy of sitemap-0.xml plus the index wrapper never
    // lists pages; only accept a file that actually lists page URLs.
    if (urls.length > 1) return new Set(urls);
  }
  return new Set();
}

function readJsonIfPresent(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

const sitemapRoutes = readSitemapRoutes();
const graph = readJsonIfPresent(join(root, "record", "graph.json"));
const meta = readJsonIfPresent(join(root, "record", "meta.json"));
const graphNodes = new Map((graph?.nodes ?? []).map((node) => [node.id, node]));
const recordInventory = new Set((meta?.routeInventory ?? []).map((entry) => entry.path));

let endpointCount = 0;
try {
  endpointCount = readdirSync(join(root, "record")).filter((name) => name.endsWith(".json")).length;
} catch {
  endpointCount = 0;
}

function classify(route, metadata, html) {
  const refresh = openingTags(html, ["meta"]).find(
    ({ attributes }) => attributes["http-equiv"]?.toLowerCase() === "refresh",
  );
  if (refresh) return "alias";
  if (route === "/404.html") return "error";
  if (!metadata.indexable) return "utility";
  if (route.startsWith("/record/")) return "record";
  return "page";
}

const rows = files
  .map((file) => {
    const route = routeFromHtml(root, file);
    const html = readText(file);
    const metadata = pageMetadata(html, route);
    const kind = classify(route, metadata, html);
    const node = graphNodes.get(route);
    return {
      routeId: route,
      file: relativeToRepo(file),
      kind,
      title: metadata.title,
      inSitemap: sitemapRoutes.has(route),
      indexable: metadata.indexable,
      canonical: metadata.canonical,
      family: node?.family ?? (kind === "record" ? "Public record" : ""),
      nodeKind: node?.kind ?? "",
      inGraph: graphNodes.has(route),
      inRecordInventory: recordInventory.has(route),
    };
  })
  .sort((left, right) => left.routeId.localeCompare(right.routeId));

const byKind = new Map();
for (const row of rows) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { directory: relativeToRepo(root) },
  summary: {
    htmlDocs: files.length,
    byKind: Object.fromEntries(byKind),
    sitemapUrls: sitemapRoutes.size,
    recordInventoryRoutes: recordInventory.size,
    recordJsonEndpoints: endpointCount,
    graphNodes: graph?.nodes?.length ?? 0,
    graphEdges: graph?.edges?.length ?? 0,
  },
  rows,
};

if (options.markdown) {
  console.log("| # | Route ID | File | Class | Sitemap | Graph | Title |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  rows.forEach((row, index) => {
    const sitemap = row.inSitemap ? "yes" : "no";
    const graphMark = row.inGraph ? "yes" : "no";
    const title = row.title.replace(/\|/g, "\\|");
    console.log(
      `| ${index + 1} | \`${row.routeId}\` | \`${row.file}\` | ${row.kind} | ${sitemap} | ${graphMark} | ${title} |`,
    );
  });
} else {
  writeJson(options.out ? absolutePath(options.out) : "", report);
  const kinds = [...byKind.entries()].map(([kind, count]) => `${count} ${kind}`).join(", ");
  console.log(`Canonical route ledger: ${rows.length} HTML document(s) (${kinds}).`);
  console.log(
    `Derived counts: ${recordInventory.size} Record routes, ${endpointCount} JSON endpoints, ` +
      `${graph?.nodes?.length ?? 0} graph nodes, ${graph?.edges?.length ?? 0} journey edges, ` +
      `${sitemapRoutes.size} sitemap URLs.`,
  );
}
