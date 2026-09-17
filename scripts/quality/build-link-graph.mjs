#!/usr/bin/env node
// build-link-graph.mjs — merge the observed actual-link graph into dist/record/graph.json.
//
// WHAT: runs the pure extractor (`src/components/record/nav-graph.mjs`) over
// every emitted `dist/**/*.html` document and merges the versioned `linkGraph`
// payload into `dist/record/graph.json` WITHOUT touching the compatibility
// `nodes`/`edges` keys (inventory nodes plus journey-step edges at
// schemaVersion 1), which existing consumers (`page-metrics.json.ts`,
// `/record/nav/`, `canonical-route-ledger.mjs`, the parity-contract guard)
// keep reading unchanged. The output envelope is schemaVersion 2 with the
// observed topology nested under `linkGraph`: content/chrome edge sets with
// occurrence evidence, authored journeys as a labelled overlay (never
// presented as observed links), every ledger route as a node (orphans stay
// visible), and missing internal targets reported with their sources.
//
// WHEN: after `astro build` (before the quality gates that read `dist`),
// wired as `pnpm run build:link-graph` at the end of `pnpm run build`.
// Idempotent: rerunning over the same `dist` yields the same edge sets
// (only `generatedAt` changes).
//
// EXIT: 0 with warnings when internal targets resolve nowhere
// (`check-dist-links.mjs` owns broken-link enforcement); 1 when the dist,
// compatibility graph, or journeys inputs are absent, or the node population
// fails to reconcile with the emitted documents.
//
// Usage:
//   node scripts/quality/build-link-graph.mjs --dist dist [--base /] [--origin https://www.instarlab.org]

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  absolutePath,
  listHtmlFiles,
  pageMetadata,
  parseArgs,
  printHelp,
  readText,
  relativeToRepo,
  routeFromHtml,
  writeJson,
} from "./lib.mjs";
import {
  buildLinkGraph,
} from "../../src/components/record/nav-graph.mjs";

const options = parseArgs(process.argv.slice(2), {
  dist: "dist",
  base: process.env.ASTRO_BASE || "/",
  // src/data/seo/site.ts pins www as the single canonical host.
  origin: "https://www.instarlab.org",
});

if (options.help) {
  printHelp([
    "Merge the observed actual-link graph into dist/record/graph.json.",
    "Usage: node scripts/quality/build-link-graph.mjs --dist dist [--base /] [--origin https://www.instarlab.org]",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  console.error("Run the Astro production build first, then rerun this generator.");
  process.exit(2);
}

function readJson(file, description) {
  if (!existsSync(file)) {
    console.error(`Missing ${description}: ${relativeToRepo(file)}`);
    console.error("Run the Astro production build first, then rerun this generator.");
    process.exit(2);
  }
  try {
    return JSON.parse(readText(file));
  } catch {
    console.error(`Unparseable ${description}: ${relativeToRepo(file)}`);
    process.exit(2);
  }
}

const compatPath = join(root, "record", "graph.json");
const journeysPath = join(root, "record", "journeys.json");
const compat = readJson(compatPath, "compatibility graph");
const journeysJson = readJson(journeysPath, "journeys manifest");

if (!Array.isArray(compat?.nodes) || !Array.isArray(compat?.edges)) {
  console.error(`Compatibility graph has no nodes/edges arrays: ${relativeToRepo(compatPath)}`);
  process.exit(2);
}
if (!Array.isArray(journeysJson)) {
  console.error(`Journeys manifest is not an array: ${relativeToRepo(journeysPath)}`);
  process.exit(2);
}

const files = listHtmlFiles(root);
if (files.length === 0) {
  console.error(`No HTML documents found below ${root}`);
  process.exit(2);
}

// Inventory metadata comes from the compatibility nodes (source inventory);
// the served `<title>` and robots meta are the fallback and the served truth
// for title/indexable, so the graph never invents metadata for a page the
// inventory does not describe (today: the /search/ utility route).
const compatNodes = new Map(compat.nodes.map((node) => [node.id, node]));
const routes = [];
const documents = [];
for (const file of files) {
  const route = routeFromHtml(root, file);
  const html = readText(file);
  const metadata = pageMetadata(html, route);
  const inventory = compatNodes.get(route);
  routes.push({
    path: route,
    title: inventory?.label ?? metadata.title ?? route,
    family: inventory?.family ?? null,
    kind: inventory?.kind ?? null,
    indexable: metadata.indexable,
  });
  documents.push({ route, html });
}

const journeys = journeysJson.map((journey) => ({
  id: journey.id,
  label: journey.label,
  steps: journey.steps,
  nextAction: journey.nextAction,
}));

const linkGraph = buildLinkGraph({
  routes,
  documents,
  journeys,
  // The source inventory is the compatibility node set: ledger-only routes
  // outside it (today: the /search/ utility route) stay visible as nodes
  // with inInventory false, closing the 86-vs-87 node/doc gap honestly.
  inventory: [...compatNodes.keys()],
  base: options.base,
  origin: options.origin,
  // Path-free provenance label (never `src/…`): the RR-301 repository-path
  // browser gate fails any JSON endpoint whose body carries a repository
  // locator, so the generator names the derivation, not the files behind it.
  generator: "record link-graph builder over the production build (RRP-203)",
});

const nodeIds = new Set(linkGraph.nodes.map((node) => node.id));
const unreconciled = [...compatNodes.keys()].filter((id) => !nodeIds.has(id));
if (unreconciled.length > 0) {
  console.error(`Node population fails to reconcile: ${unreconciled.length} compatibility node(s) without a link-graph node:`);
  for (const id of unreconciled.slice(0, 20)) console.error(`  ${id}`);
  process.exit(1);
}

const merged = {
  schemaVersion: linkGraph.schemaVersion,
  nodes: compat.nodes,
  edges: compat.edges,
  linkGraph: { ...linkGraph, provenance: { ...linkGraph.provenance, generatedAt: new Date().toISOString() } },
};
writeJson(compatPath, merged);

const { summary } = linkGraph;
const journeyOnly = linkGraph.nodes.filter((node) => !node.inLedger).length;
console.log(
  `Link graph: ${summary.nodes} nodes (${routes.length} ledger + ${journeyOnly} journey-only), ` +
    `${summary.contentPairs} content pairs, ${summary.chromePairs} chrome pairs, ` +
    `${summary.journeyLinks} journey overlay links (${summary.observedJourneyLinks} observed) -> ${relativeToRepo(compatPath)}`,
);
if (linkGraph.orphans.length > 0) {
  console.log(`Orphan ledger pages with no inbound content edge (${linkGraph.orphans.length}): ${linkGraph.orphans.join(", ")}`);
} else {
  console.log("Orphan ledger pages: none — every ledger route has an inbound content edge.");
}
if (linkGraph.missing.length > 0) {
  console.warn(`Missing internal targets reported (${linkGraph.missing.length}); broken-link enforcement belongs to check-dist-links.mjs:`);
  for (const target of linkGraph.missing.slice(0, 20)) {
    console.warn(`  ${target.route} (${target.occurrences}x from ${target.sources.slice(0, 4).join(", ")})`);
  }
} else {
  console.log("Missing internal targets: none.");
}
if (linkGraph.provenance.unzoned.length > 0) {
  console.warn(`Unzoned documents with no <main> landmark: ${linkGraph.provenance.unzoned.join(", ")}`);
}
if (linkGraph.provenance.aliases.length > 0) {
  console.warn(`Alias documents excluded as sources: ${linkGraph.provenance.aliases.map((entry) => entry.route).join(", ")}`);
}
