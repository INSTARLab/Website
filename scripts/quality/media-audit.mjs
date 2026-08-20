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

const mediaPolicyFile = absolutePath('src/data/media/public-media-policy.json');
const mediaPolicies = existsSync(mediaPolicyFile)
  ? JSON.parse(readText(mediaPolicyFile))
  : [];
const exceptions = new Map();

const entries = [];
for (const file of listHtmlFiles(root)) {
  const html = readText(file);
  const route = routeFromHtml(root, file);
  const tags = openingTags(html, ["img", "video", "audio", "track"]);

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
    const policy = publicMediaPolicyFor(primary.url);
    const policyId = policy ? stableMediaId(primary.url, policy.idPrefix) : "";
    const decorative = attributes["aria-hidden"] === "true" || attributes.role === "presentation";
    const type = attributes["data-media-type"] ?? policy?.type ?? inferMediaType(tag.name, primary.url);
    const assetId = attributes["data-media-id"] ?? attributes["data-asset-id"] ?? policyId;
    const role = attributes["data-media-role"] ?? attributes["data-role"] ?? policy?.role ?? "";
    const source = attributes["data-source"] ?? policy?.provenance?.source ?? "";
    const license = attributes["data-license"] ?? policy?.provenance?.license ?? "";
    const reuseReason = attributes["data-reuse-reason"] ?? policy?.reuseReason ?? "";

    const entry = {
      route,
      pageFile: relativeToRepo(file),
      element: tag.name,
      type,
      assetId,
      role,
      reuseReason,
      source,
      license,
      metadataSource: policy ? "public-media-policy" : "rendered-attributes",
      provenanceStatus: policy?.provenance?.status ?? null,
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
    };
    entries.push(entry);

    if (policy && !attributes["data-media-id"] && !attributes["data-asset-id"]) {
      addException("catalog-backed-legacy-markup", entry, {
        rationale: "The current route template still renders a direct public <img>; the typed catalog supplies the stable ID until that route adopts EditorialMedia.",
        nextStep: "Adopt src/components/editorial/media/EditorialMedia.astro in the owning route workstream.",
      });
    }
    if (policy?.provenance?.status === "unverified") {
      addException("provenance-review-required", entry, {
        rationale: policy.provenance.note ?? "The asset is present in the repository, but its original source or license is not recorded.",
        nextStep: "Have the media owner verify source and license, then update public-media-policy.json.",
      });
    }
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
    exceptions: exceptions.size,
  },
  duplicateAssets,
  exceptions: [...exceptions.values()],
  findings,
  entries,
};

writeJson(options.out ? absolutePath(options.out) : "", report);
console.log(`Media audit: ${entries.length} rendered media element(s), ${acrossRoutes.size} distinct primary asset(s).`);
console.log(`Findings: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s).`);
console.log(`Auditable exceptions: ${report.exceptions.length}.`);

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

function publicMediaPolicyFor(url) {
  const normalized = normalizeMediaUrl(url);
  if (/^https?:\/\//i.test(normalized)) return undefined;
  return mediaPolicies.find((policy) => new RegExp(policy.match).test(normalized));
}

function normalizeMediaUrl(value) {
  const withoutFragment = value.split("#", 1)[0] ?? value;
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? withoutFragment;
  if (/^https?:\/\//i.test(withoutQuery)) return withoutQuery;
  const path = withoutQuery.replace(/^\.\//, "").replace(/^dist\//, "/");
  return path.startsWith("/") ? path : `/${path}`;
}

function stableMediaId(sourceUrl, prefix) {
  const normalized = normalizeMediaUrl(sourceUrl);
  const basename = normalized.split("/").filter(Boolean).at(-1) ?? "asset";
  const safeBasename = basename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}${safeBasename}`;
}

function addException(rule, entry, details) {
  const key = `${rule}\u0000${entry.assetId || entry.primaryKey}`;
  const existing = exceptions.get(key);
  if (existing) {
    existing.routes = [...new Set([...existing.routes, entry.route])];
    return;
  }
  exceptions.set(key, {
    rule,
    assetId: entry.assetId || null,
    asset: entry.primaryKey,
    routes: [entry.route],
    ...details,
  });
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
