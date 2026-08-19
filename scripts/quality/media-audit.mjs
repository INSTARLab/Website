#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  absolutePath,
  listHtmlFiles,
  openingTags,
  parseArgs,
  printHelp,
  relativeToRepo,
  resolveDistReference,
  routeFromHtml,
  readText,
  sha256,
  writeJson,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", out: "" });

if (options.help) {
  printHelp([
    "Build a rendered media manifest and report missing metadata or reuse risks.",
    "Usage: node scripts/quality/media-audit.mjs --dist dist [--out path] [--strict]",
    "Expected authoring data attributes: data-media-id, data-media-role, data-reuse-reason, data-source, data-license.",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  process.exit(2);
}

const entries = [];
for (const file of listHtmlFiles(root)) {
  const html = readText(file);
  const route = routeFromHtml(root, file);
  const tags = openingTags(html, ["img", "source", "video", "audio", "track"]);

  for (const tag of tags) {
    const attributes = tag.attributes;
    const sources = [];
    if (attributes.src) sources.push(attributes.src);
    if (attributes.poster) sources.push(attributes.poster);
    if (attributes.srcset) {
      for (const candidate of attributes.srcset.split(",")) {
        const source = candidate.trim().split(/\s+/)[0];
        if (source) sources.push(source);
      }
    }
    if (sources.length === 0) continue;

    const resolvedSources = sources.map((source) => {
      const resolved = resolveDistReference(source, file, root);
      return {
        url: source,
        external: resolved.external ?? resolved.skipped ?? false,
        skipped: resolved.skipped ?? false,
        file: resolved.file ? relativeToRepo(resolved.file) : null,
        exists: Boolean(resolved.file) || Boolean(resolved.skipped),
        sha256: resolved.file ? sha256(resolved.file) : null,
      };
    });
    const primary = resolvedSources[0];
    const decorative = attributes["aria-hidden"] === "true" || attributes.role === "presentation";
    const type = attributes["data-media-type"] ?? inferMediaType(tag.name, primary.url);
    const assetId = attributes["data-media-id"] ?? attributes["data-asset-id"] ?? "";

    entries.push({
      route,
      pageFile: relativeToRepo(file),
      element: tag.name,
      type,
      assetId,
      role: attributes["data-media-role"] ?? attributes["data-role"] ?? "",
      reuseReason: attributes["data-reuse-reason"] ?? "",
      source: attributes["data-source"] ?? "",
      license: attributes["data-license"] ?? "",
      alt: attributes.alt ?? null,
      decorative,
      width: attributes.width ?? null,
      height: attributes.height ?? null,
      loading: attributes.loading ?? null,
      sizes: attributes.sizes ?? null,
      fetchpriority: attributes.fetchpriority ?? null,
      sources: resolvedSources,
      primaryKey: primary.file ?? primary.url,
      primaryHash: primary.sha256,
    });
  }
}

const findings = [];
for (const entry of entries) {
  if (entry.element === "img" && entry.alt === null && !entry.decorative) {
    findings.push({ severity: "error", rule: "missing-alt-decision", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
  if (entry.sources.some((source) => !source.external && !source.exists)) {
    findings.push({ severity: "error", rule: "missing-rendered-media", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
  if (entry.element === "img" && !entry.width && !entry.height) {
    findings.push({ severity: "warning", rule: "missing-intrinsic-dimensions", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
  if (!entry.assetId) {
    findings.push({ severity: "warning", rule: "missing-media-id", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
  if (!entry.role) {
    findings.push({ severity: "warning", rule: "missing-media-role", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
  if (!entry.source || !entry.license) {
    findings.push({ severity: "warning", rule: "missing-provenance", route: entry.route, pageFile: entry.pageFile, asset: entry.primaryKey });
  }
}

const sameRoute = groupBy(entries, (entry) => `${entry.route}\u0000${entry.primaryKey}`);
for (const [key, group] of sameRoute) {
  if (group.length > 1 && !group.some((entry) => entry.reuseReason)) {
    findings.push({ severity: "error", rule: "duplicate-creative-on-route", route: group[0].route, asset: key.split("\u0000")[1], count: group.length });
  }
}

const acrossRoutes = groupBy(entries, (entry) => entry.primaryHash || entry.primaryKey);
const duplicateAssets = [];
for (const [key, group] of acrossRoutes) {
  const routes = [...new Set(group.map((entry) => entry.route))];
  if (routes.length < 2) continue;
  const intentional = group.some((entry) => entry.reuseReason || /^(?:logo|icon|mark|brand|ui|system)$/i.test(entry.role));
  duplicateAssets.push({
    key,
    routes,
    count: group.length,
    intentional,
    reuseReasons: [...new Set(group.map((entry) => entry.reuseReason).filter(Boolean))],
  });
  if (!intentional) {
    findings.push({ severity: "warning", rule: "unexplained-cross-route-reuse", asset: key, routes });
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { directory: relativeToRepo(root) },
  summary: {
    mediaElements: entries.length,
    distinctPrimaryAssets: acrossRoutes.size,
    findings: findings.length,
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    duplicateAssets: duplicateAssets.length,
  },
  duplicateAssets,
  findings,
  entries,
};

writeJson(options.out ? absolutePath(options.out) : "", report);
console.log(`Media audit: ${entries.length} rendered media element(s), ${acrossRoutes.size} distinct primary asset(s).`);
console.log(`Findings: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s).`);

if (options.strict && findings.some((finding) => finding.severity === "error" || finding.severity === "warning")) {
  process.exitCode = 1;
}

function inferMediaType(tagName, source) {
  if (tagName === "video") return "video-or-animation-poster";
  if (tagName === "audio" || tagName === "track") return "audio-or-transcript";
  if (/\.svg(?:[?#]|$)/i.test(source)) return "icon-or-mark";
  if (/\.(?:avif|webp|jpe?g|png|gif)(?:[?#]|$)/i.test(source)) return "photography-or-illustration";
  return "media";
}

function groupBy(items, keyFunction) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFunction(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}
