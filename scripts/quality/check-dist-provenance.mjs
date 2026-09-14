#!/usr/bin/env node

/**
 * Two provenance invariants of the built artifact, both of which are about what
 * the site is allowed to say on the organization's own domain.
 *
 * 1. No retracted federal identifier comes back.
 *
 *    In June 2026 the site published a SAM Unique Entity Identifier and a CAGE
 *    code that had never been issued to INSTAR Lab, across dozens of files
 *    including JSON-LD. They were removed the next day. The corrections
 *    register records the episode and deliberately does not reproduce the
 *    values, so this gate cannot hard-code them either.
 *
 *    What it holds instead is a manifest of SHA-256 digests
 *    (`retracted-identifiers.json`), derived once by
 *    `derive-retracted-identifiers.mjs`. The gate walks every alphanumeric run
 *    in the artifact, hashes each window whose length matches a manifest entry,
 *    and fails on a digest match. A digest cannot be turned back into the
 *    string, so the repository proves the values absent without carrying a
 *    copy of them.
 *
 *    This replaced an earlier version that read the values out of the git
 *    object of the retraction commit at gate time. That version could not run
 *    in CI at all: `node:22-bookworm-slim` has no git binary, so it died with
 *    `spawnSync git ENOENT` — and the failure was latent rather than obvious,
 *    because the same derivation would also have broken once the token-bearing
 *    commit drifted out of the runner's depth-20 clone. A gate that depends on
 *    a specific old commit staying reachable is a gate that expires.
 *
 *    A second, value-independent rule runs alongside it: an uppercase entity-
 *    identifier-shaped token sitting immediately after a `UEI`, `CAGE`, `DUNS`
 *    or `SAM` label is a defect whatever its value. That rule catches the
 *    *next* invented identifier, which the exact rule cannot.
 *
 * 2. The corrections register cites commits without emitting them.
 *
 *    Commit SHAs are published on the corrections page as prose and as links.
 *    They must not reach machine-readable output — not the page's JSON-LD, not
 *    a meta tag anywhere, not the sitemap — because a SHA there is a citation
 *    a machine reads as part of the page's structured claim about the
 *    institution rather than as a note a human follows.
 *
 * Usage:
 *   node scripts/quality/check-dist-provenance.mjs --dist dist [--manifest <path>]
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

import {
  REPO_ROOT,
  absolutePath,
  listFiles,
  parseArgs,
  printHelp,
  relativeToRepo,
  readText,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), {
  dist: "dist",
  manifest: join("scripts", "quality", "retracted-identifiers.json"),
});

if (options.help) {
  printHelp([
    "Check the built artifact for retracted federal identifiers and for commit",
    "SHAs leaking out of prose into structured data.",
    "Usage: node scripts/quality/check-dist-provenance.mjs --dist dist [--manifest <path>]",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  console.error("Run the Astro production build first, then rerun this gate.");
  process.exit(2);
}

/** Text formats the gate can read and search. Binary assets are skipped. */
const TEXT_EXTENSIONS = new Set([
  ".html", ".json", ".css", ".js", ".mjs", ".txt", ".xml", ".svg",
  ".webmanifest", ".map", ".csv", ".yml", ".yaml",
]);

const isTextArtifact = (file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase());

/**
 * The digests of the withdrawn identifiers, read from the checked-in manifest.
 *
 * The manifest carries no plaintext value — see `derive-retracted-identifiers.mjs`
 * for why, and for how it is regenerated. A set of digests keyed by length is
 * all this gate needs: hash a window of that length and ask whether it is one of
 * them.
 */
function loadRetractedIdentifierDigests(manifestPath) {
  const absolute = absolutePath(manifestPath);
  if (!existsSync(absolute)) {
    throw new Error(
      `The retracted-identifier manifest is missing at ${manifestPath}, so this gate cannot tell ` +
      "whether a withdrawn identifier came back. Regenerate it with " +
      "`node scripts/quality/derive-retracted-identifiers.mjs --write`.",
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(absolute, "utf8"));
  } catch (error) {
    throw new Error(`The retracted-identifier manifest at ${manifestPath} is not valid JSON: ${error.message}`);
  }

  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (entries.length === 0) {
    throw new Error(
      `The retracted-identifier manifest at ${manifestPath} carries no entries, so this gate would ` +
      "pass vacuously. An empty manifest is a broken manifest, not a clean artifact.",
    );
  }
  for (const entry of entries) {
    if (typeof entry?.sha256 !== "string" || !Number.isInteger(entry?.length) || entry.length < 1) {
      throw new Error(`The retracted-identifier manifest at ${manifestPath} has an entry without a usable sha256/length pair.`);
    }
  }

  /** Lengths are deduplicated: two entries of the same length share one pass. */
  const lengths = [...new Set(entries.map((entry) => entry.length))];
  return { digests: new Set(entries.map((entry) => entry.sha256)), lengths };
}

const { digests: retractedDigests, lengths: retractedLengths } =
  loadRetractedIdentifierDigests(options.manifest);
const textFiles = listFiles(root, isTextArtifact);

/** Every text artifact, with its contents, read once. */
const artifacts = textFiles.map((file) => ({ file, relative: relativeToRepo(file), text: readText(file) }));

const findings = [];

// ---------------------------------------------------------------------------
// 1a. The retracted values, by digest.
//
//     Every alphanumeric run is split out, and each window of a manifest length
//     inside it is hashed and compared. Windows are uppercased first, because
//     the manifest is normalized that way and a lowercased rendering of the
//     same identifier is the same defect.
// ---------------------------------------------------------------------------
const digestHits = [];
let windowsHashed = 0;
for (const artifact of artifacts) {
  // One finding per artifact. A value published sitewide would otherwise report
  // once per occurrence, and the count of occurrences is not the useful fact —
  // which file has to be fixed is.
  const matchedLengths = new Set();
  for (const run of artifact.text.split(/[^A-Za-z0-9]+/)) {
    for (const length of retractedLengths) {
      if (run.length < length) continue;
      for (let start = 0; start + length <= run.length; start += 1) {
        const digest = createHash("sha256")
          .update(run.slice(start, start + length).toUpperCase(), "utf8")
          .digest("hex");
        windowsHashed += 1;
        if (retractedDigests.has(digest)) matchedLengths.add(length);
      }
    }
  }
  if (matchedLengths.size > 0) {
    const labels = [...matchedLengths].sort((a, b) => a - b).join(", ");
    digestHits.push(
      `${artifact.relative} contains a value matching a retracted identifier digest ` +
      `(${labels} character(s)); the withdrawn values may not be republished`,
    );
  }
}
if (digestHits.length > 0) {
  findings.push(...digestHits);
}

// ---------------------------------------------------------------------------
// 1b. An identifier-shaped value sitting after an identifier label, whatever
//     it is. Uppercase alphanumeric, 5-20 characters, at least one digit, so
//     that prose words (CAGE, SAM, DUNS themselves) do not trip it while every
//     real federal entity identifier does.
// ---------------------------------------------------------------------------
const LABELLED_IDENTIFIER = /\b(?:UEI|CAGE|DUNS|SAM)\b[^A-Za-z0-9]{0,8}([A-Z0-9]{5,20})\b/g;
const labelledHits = [];
for (const artifact of artifacts) {
  for (const match of artifact.text.matchAll(LABELLED_IDENTIFIER)) {
    if (/\d/.test(match[1])) {
      labelledHits.push(`${artifact.relative} publishes an identifier-shaped value after a "${match[0].split(match[1])[0].trim()}" label`);
    }
  }
}
if (labelledHits.length > 0) {
  findings.push(...labelledHits);
}

// ---------------------------------------------------------------------------
// 2. Commit SHAs stay in prose.
// ---------------------------------------------------------------------------
const correctionsRelative = join("record", "corrections", "index.html");
const correctionsFile = join(root, correctionsRelative);
if (!existsSync(correctionsFile)) {
  findings.push(`${correctionsRelative} is missing from the artifact, so the register it is meant to carry cannot be checked`);
} else {
  const html = readFileSync(correctionsFile, "utf8");
  const cited = new Set([...html.matchAll(/\b[0-9a-f]{40}\b/g)].map((match) => match[0]));
  if (cited.size === 0) {
    findings.push(`${correctionsRelative} cites no commit SHA, so this check would pass vacuously`);
  }

  // Structured data: the JSON-LD block, every meta tag's content, and the
  // sitemaps. A SHA in any of those is a machine-readable citation.
  const structuredDataSources = [];
  for (const artifact of artifacts) {
    if (!artifact.relative.endsWith(".html")) continue;
    for (const script of artifact.text.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      structuredDataSources.push({ where: `${artifact.relative} JSON-LD`, text: script[1] });
    }
    for (const meta of artifact.text.matchAll(/<meta\s[^>]*content=["']([^"']*)["'][^>]*>/gi)) {
      structuredDataSources.push({ where: `${artifact.relative} meta content`, text: meta[1] });
    }
  }
  for (const artifact of artifacts) {
    if (/sitemap.*\.xml$/i.test(artifact.relative)) {
      structuredDataSources.push({ where: `${artifact.relative} sitemap`, text: artifact.text });
    }
  }

  for (const sha of cited) {
    for (const source of structuredDataSources) {
      if (source.text.includes(sha)) {
        findings.push(`${source.where} publishes the cited commit SHA ${sha.slice(0, 7)}…; corrections are cited in prose only`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`Provenance findings: ${findings.length}`);
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `Provenance clean: ${textFiles.length} text artifact(s) checked, ` +
    `${retractedDigests.size} retracted identifier digest(s) absent across ` +
    `${windowsHashed} candidate window(s), ` +
    "correction citations absent from structured data.",
  );
}
