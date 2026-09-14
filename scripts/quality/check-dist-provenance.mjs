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
 *    values, so this gate cannot hard-code them either — it derives them from
 *    the git object of the commit that introduced them and hashes its way
 *    through the artifact. Nothing in this file names an identifier, and no
 *    file in the repository does.
 *
 *    A second, value-independent rule runs alongside it: an uppercase entity-
 *    identifier-shaped token sitting immediately after a `UEI`, `CAGE`, `DUNS`
 *    or `SAM` label is a defect whatever its value. That one needs no git and
 *    catches the *next* invented identifier, which the exact rule cannot.
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
 *   node scripts/quality/check-dist-provenance.mjs --dist dist [--retraction-commit <sha>]
 */

import { execFileSync } from "node:child_process";
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
  "retraction-commit": "3337b68b05ca8cd1bc040284cda2fcdc6a9d91b6",
});

if (options.help) {
  printHelp([
    "Check the built artifact for retracted federal identifiers and for commit",
    "SHAs leaking out of prose into structured data.",
    "Usage: node scripts/quality/check-dist-provenance.mjs --dist dist [--retraction-commit <sha>]",
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
 * The values the retraction commit introduced, read out of the git object.
 *
 * Thresholds and labels are structural, not the values: the identifier appears
 * in the historical copy as `UEI <value>` and `CAGE <value>`, so the diff is
 * scanned for those shapes rather than for anything this file knows in advance.
 */
function retractedIdentifierTokens(commit) {
  let diff;
  try {
    diff = execFileSync("git", ["show", "--no-color", "--unified=0", commit], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      `Could not read the retraction commit ${commit} from git (${error.message}). ` +
      "This gate derives the retracted identifier set from the commit that introduced it, " +
      "so it needs the commit in the local history; a shallow clone cannot run it.",
    );
  }

  const tokens = new Set();
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+")) continue;
    for (const match of line.matchAll(/\bUEI\s+([A-Z0-9]{5,20})\b/g)) tokens.add(match[1]);
    for (const match of line.matchAll(/\bCAGE\s+([A-Z0-9]{4,10})\b/g)) tokens.add(match[1]);
  }
  if (tokens.size === 0) {
    throw new Error(
      `The retraction commit ${commit} yielded no identifier-shaped tokens, so this gate would ` +
      "pass vacuously. Either the commit reference is wrong or its diff no longer carries the values.",
    );
  }
  return [...tokens];
}

const retractedTokens = retractedIdentifierTokens(options["retraction-commit"]);
const textFiles = listFiles(root, isTextArtifact);

/** Every text artifact, with its contents, read once. */
const artifacts = textFiles.map((file) => ({ file, relative: relativeToRepo(file), text: readText(file) }));

const findings = [];

// ---------------------------------------------------------------------------
// 1a. The retracted values, by exact value.
// ---------------------------------------------------------------------------
const exactHits = [];
for (const artifact of artifacts) {
  for (const token of retractedTokens) {
    if (artifact.text.includes(token)) exactHits.push(`${artifact.relative} contains a retracted identifier value`);
  }
}
if (exactHits.length > 0) {
  findings.push(...exactHits);
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
    `${retractedTokens.length} retracted identifier value(s) absent, ` +
    "correction citations absent from structured data.",
  );
}
