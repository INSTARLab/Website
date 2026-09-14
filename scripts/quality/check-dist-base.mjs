#!/usr/bin/env node

/**
 * The base contract of one built artifact.
 *
 * Astro rewrites every route and asset URL to the configured `base`, so the
 * same source produces two different artifacts: one mounted below the GitLab
 * Pages project subpath, and one served from the CNAME root at
 * https://instarlab.org. A defect that exists at only one of the two bases is
 * invisible to a gate that builds only the other one — which is exactly the
 * hole this exists to close. `quality:astro-artifact` validated the
 * `/Website/` build; the artifact that actually ships is the root build, and
 * the only thing that ever looked at it was `mirror`, on the promotion branch,
 * after the release decision had already been taken.
 *
 * Two invariants are asserted, and both are true of whichever base is expected:
 *
 *   1. A *different* configured base has not leaked in. One
 *      `/Website/assets/...` reference in a stylesheet, a JSON endpoint or a
 *      script is enough to 404 every asset on the published origin, and the
 *      reverse — a `/assets/...` reference in the subpath build — sends the
 *      GitLab Pages preview to URLs the Pages mount does not serve.
 *   2. The entry document references an asset at the expected base and that
 *      file is present in the artifact. This is the positive counterpart: rule
 *      1 only knows the one wrong base, so a build that emitted some third
 *      prefix would satisfy it while breaking the site.
 *
 * Both the demo-side gate and `mirror` call this script, so the promotion gate
 * and the staging gate enforce one rule rather than two copies of it. The
 * inline grep `mirror` used to carry could not tell the GitLab Pages base from
 * the public GitHub mirror this site cites at
 * `https://github.com/INSTARLab/Website/commit/<sha>`; see
 * `usesBaseAsUrlPrefix` below for the rule that replaced it.
 *
 * Usage:
 *   node scripts/quality/check-dist-base.mjs --dist dist-root --base / --other-base /Website/
 *   node scripts/quality/check-dist-base.mjs --dist dist --base /Website/
 */

import { existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

import {
  absolutePath,
  listFiles,
  parseArgs,
  printHelp,
  readText,
  relativeToRepo,
} from './lib.mjs';

const options = parseArgs(process.argv.slice(2), { dist: 'dist', base: '/', 'other-base': '' });

if (options.help) {
  printHelp([
    'Assert that a built artifact resolves at the base it was built for.',
    'Usage: node scripts/quality/check-dist-base.mjs --dist dist-root --base / [--other-base /Website/]',
  ]);
  process.exit(0);
}

/** Normalize to a leading-and-trailing-slash form, or `/` for the root. */
function normalizeBase(value) {
  if (!value || value === '/') return '/';
  const trimmed = String(value).replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

const root = absolutePath(options.dist);
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Rendered output not found: ${root}`);
  console.error('Run the Astro production build first, then rerun this audit.');
  process.exit(2);
}

const base = normalizeBase(options.base);
const otherBase = options['other-base'] ? normalizeBase(options['other-base']) : '';

// A `--other-base` of `/` would match every root-relative URL in the artifact
// and report the whole build as a leak, so it is refused rather than obeyed.
if (otherBase === '/') {
  console.error('--other-base must name a subpath (for example /Website/), not the root base.');
  process.exit(2);
}
if (otherBase && otherBase === base) {
  console.error(`--base and --other-base are both ${base}, so the leak scan could not tell them apart.`);
  process.exit(2);
}

// The text formats a leak can hide in. Binary assets carry no URL of their own.
const TEXT_EXTENSIONS = new Set([
  '.html', '.json', '.css', '.js', '.mjs', '.txt', '.xml', '.svg',
  '.webmanifest', '.map', '.csv', '.yml', '.yaml',
]);

const artifacts = listFiles(root, (file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()))
  .map((file) => ({ file, relative: relativeToRepo(file), text: readText(file) }));

/**
 * Whether `text` uses `base` at the start of a path, rather than as one segment
 * of somebody else's URL.
 *
 * The naive test — does the artifact contain the string `/Website/` — is wrong
 * for this repository, and wrong in the direction that blocks a release. The
 * corrections register cites the public GitHub mirror at
 * `https://github.com/INSTARLab/Website/commit/<sha>`, and the repository is
 * named `Website`, so a plain substring scan reports that legitimate cross-host
 * citation as the GitLab Pages base and refuses to publish a correct artifact.
 *
 * What separates the two is position, not value. A leaked base is used where a
 * path begins: after a quote, a bracket, an `=`, whitespace, or at the start of
 * the file. A path segment inside an absolute URL always has an alphanumeric
 * character in front of it — the last character of the host, or of an earlier
 * segment — so the rule is one negative: the character before the base must not
 * be alphanumeric. `href="/Website/assets/x.css"` and `url(/Website/x.avif)`
 * are still reported; `.../INSTARLab/Website/commit/...` is not.
 */
function usesBaseAsUrlPrefix(text, base) {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}`).test(text);
}

const findings = [];

if (artifacts.length === 0) {
  findings.push(`${relativeToRepo(root)} carries no readable text artifact, so this check would pass vacuously`);
}

if (otherBase) {
  for (const artifact of artifacts) {
    if (usesBaseAsUrlPrefix(artifact.text, otherBase)) {
      findings.push(`${artifact.relative} uses the ${otherBase} base as a URL prefix, which this artifact is not served at`);
    }
  }
}

const entry = join(root, 'index.html');
if (!existsSync(entry)) {
  findings.push('index.html is missing from the artifact, so the entry document cannot be checked');
} else {
  const html = readText(entry);
  const expectedPrefix = `${base}assets/`;
  const assetReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith(expectedPrefix));

  if (assetReferences.length === 0) {
    findings.push(`index.html references no asset under ${expectedPrefix}, so the entry document is not built for base ${base}`);
  }
  for (const reference of new Set(assetReferences)) {
    const target = join(root, reference.slice(base.length));
    if (!existsSync(target)) {
      findings.push(`index.html references ${reference}, which is absent from the artifact`);
    }
  }
}

if (findings.length > 0) {
  console.error(`Base findings for ${base}: ${findings.length}`);
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `Base ok: ${relativeToRepo(root)} is built for ${base}; ` +
    `${artifacts.length} text artifact(s) checked` +
    `${otherBase ? `, no ${otherBase} reference found` : ''}, entry asset(s) present.`,
  );
}
