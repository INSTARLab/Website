#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  absolutePath,
  listHtmlFiles,
  pageMetadata,
  parseArgs,
  printHelp,
  relativeToRepo,
  routeFromHtml,
  readText,
  writeJson,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", out: "" });

if (options.help) {
  printHelp([
    "Build a route ledger from rendered HTML.",
    "Usage: node scripts/quality/route-ledger.mjs --dist dist [--out path] [--strict]",
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

const routes = files.map((file) => {
  const route = routeFromHtml(root, file);
  const metadata = pageMetadata(readText(file), route);
  return {
    ...metadata,
    file: relativeToRepo(file),
  };
});

const byRoute = new Map();
for (const entry of routes) {
  const current = byRoute.get(entry.route) ?? [];
  current.push(entry.file);
  byRoute.set(entry.route, current);
}

const duplicateRoutes = [...byRoute.entries()]
  .filter(([, filesForRoute]) => filesForRoute.length > 1)
  .map(([route, filesForRoute]) => ({ route, files: filesForRoute }));

const metadataFindings = routes.flatMap((route) => {
  if (!route.indexable || /^\/(?:404|500|offline)(?:\/|$)/.test(route.route)) return [];
  const findings = [];
  if (!route.title) findings.push("missing-title");
  if (!route.description) findings.push("missing-description");
  if (!route.canonical) findings.push("missing-canonical");
  if (route.h1Count !== 1) findings.push(`expected-one-h1-found-${route.h1Count}`);
  if (route.mainCount !== 1) findings.push(`expected-one-main-found-${route.mainCount}`);
  return findings.length > 0 ? [{ route: route.route, file: route.file, findings }] : [];
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { directory: relativeToRepo(root) },
  summary: {
    htmlFiles: files.length,
    routes: routes.length,
    duplicateRoutes: duplicateRoutes.length,
    metadataFindings: metadataFindings.length,
  },
  duplicateRoutes,
  metadataFindings,
  routes,
};

writeJson(options.out ? absolutePath(options.out) : "", report);
console.log(`Route ledger: ${routes.length} route(s) from ${files.length} HTML file(s).`);

if (duplicateRoutes.length > 0) {
  console.error(`Duplicate route path(s): ${duplicateRoutes.map(({ route }) => route).join(", ")}`);
}
if (metadataFindings.length > 0) {
  console.error(`Metadata findings: ${metadataFindings.length} indexable route(s).`);
}

if (options.strict && (duplicateRoutes.length > 0 || metadataFindings.length > 0)) {
  process.exitCode = 1;
}
