#!/usr/bin/env node

/**
 * Derive the retracted-identifier manifest from the commit that introduced the
 * values. Developer-time tool: it shells out to git, so it runs where a full
 * clone exists — never in CI.
 *
 * The gate that consumes the manifest (`check-dist-provenance.mjs`) must run on
 * the smallest possible image, and `node:22-bookworm-slim` has no git binary at
 * all. Deriving there produced `spawnSync git ENOENT`, which the gate reported
 * as a shallow clone. Even with git installed the derivation would be fragile:
 * the token-bearing commit drifts out of a depth-20 clone once twenty commits
 * land on top of it, so the gate would start failing for a reason that has
 * nothing to do with the artifact.
 *
 * So the plaintext values are read exactly once, here, and reduced to SHA-256
 * digests plus lengths. The manifest carries no identifier value — a digest
 * cannot be turned back into the string — and both the gate and the browser
 * test read the same file, so the two cannot drift apart.
 *
 * Usage:
 *   node scripts/quality/derive-retracted-identifiers.mjs [--commit <sha>] [--write]
 *
 * Without `--write` it prints the manifest to stdout for review.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { REPO_ROOT, parseArgs, printHelp } from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), {
  commit: "3337b68b05ca8cd1bc040284cda2fcdc6a9d91b6",
  removed: "c11e03c61653e722aa8f5e1c9cc8b9963df54491",
  out: join("scripts", "quality", "retracted-identifiers.json"),
  write: "false",
});

if (options.help) {
  printHelp([
    "Derive the retracted-identifier digest manifest from the git commit that",
    "introduced the values. Requires git and the commit in local history.",
    "Usage: node scripts/quality/derive-retracted-identifiers.mjs [--commit <sha>] [--write]",
  ]);
  process.exit(0);
}

/**
 * The identifier shapes the historical copy used. These are structure, not
 * values: the copy wrote `UEI <value>` and `CAGE <value>`, so the diff is
 * scanned for those shapes rather than for anything this file knows in advance.
 */
const SHAPES = [
  { label: "UEI", pattern: /\bUEI\s+([A-Z0-9]{5,20})\b/g },
  { label: "CAGE", pattern: /\bCAGE\s+([A-Z0-9]{4,10})\b/g },
];

const digestOf = (value) => createHash("sha256").update(value.toUpperCase(), "utf8").digest("hex");

let diff;
try {
  diff = execFileSync("git", ["show", "--no-color", "--unified=0", options.commit], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
} catch (error) {
  console.error(`Could not read commit ${options.commit} from git: ${error.message}`);
  console.error("This tool needs a git checkout containing the commit. Run it outside CI.");
  process.exit(2);
}

/** Deduplicated by digest, so a value repeated across files appears once. */
const byDigest = new Map();
for (const line of diff.split("\n")) {
  if (!line.startsWith("+") || line.startsWith("+++")) continue;
  for (const { label, pattern } of SHAPES) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      const value = match[1];
      byDigest.set(digestOf(value), { sha256: digestOf(value), length: value.length, label });
    }
  }
}

if (byDigest.size === 0) {
  console.error(`Commit ${options.commit} yielded no identifier-shaped tokens.`);
  console.error("Refusing to write a manifest that would make the gate pass vacuously.");
  process.exit(1);
}

const manifest = {
  $comment:
    "SHA-256 digests of federal entity identifiers that were published on this site and then withdrawn. " +
    "The plaintext values are deliberately absent: they were invented, they were never issued to INSTAR Lab, " +
    "and writing them into the repository would re-publish them. Digests are one-way, so the gate can prove " +
    "absence without this file being a copy of the thing it forbids. Regenerate with derive-retracted-identifiers.mjs.",
  digest: "sha256",
  normalizedForm: "uppercase",
  introducedBy: options.commit,
  removedBy: options.removed,
  introducedOn: "2026-06-15",
  removedOn: "2026-06-16",
  entries: [...byDigest.values()].sort((a, b) => a.length - b.length),
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (options.write === true || options.write === "true" || options.write === "") {
  const target = join(REPO_ROOT, options.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, serialized, "utf8");
  console.error(`Wrote ${byDigest.size} digest(s) to ${options.out} (no identifier value written).`);
} else {
  process.stdout.write(serialized);
}
