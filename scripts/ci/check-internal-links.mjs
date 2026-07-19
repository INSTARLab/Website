#!/usr/bin/env node
// Internal link checker for instarlab.org (gh#257).
//
// A static, regex-based scan over every hand-authored *.html file in the
// repo (no npm dependencies, no build step — consistent with the "no
// build system" rule in CLAUDE.md). Resolves every relative and
// root-relative href="" / src="" against the files actually on disk and
// reports any that don't exist. Does NOT check external (http/https)
// links — that would require network access from CI and is out of scope
// here; see .gitlab-ci.yml for how this is wired in as a non-blocking job.
//
// Shared scanning logic lives in scripts/ci/lib.mjs (also used by the
// scheduled site-health sweep, gh#283).
//
// Usage: node scripts/ci/check-internal-links.mjs

import { findBrokenLinks } from "./lib.mjs";

function main() {
  const { filesChecked, linksChecked, broken } = findBrokenLinks();

  console.log(`Checked ${linksChecked} internal link(s) across ${filesChecked} HTML file(s).`);

  if (broken.length > 0) {
    console.log(`\nFound ${broken.length} broken internal link(s):\n`);
    for (const { file, link, resolved } of broken) {
      console.log(`  ${file}: "${link}" -> missing ${resolved}`);
    }
    process.exitCode = 1;
  } else {
    console.log("No broken internal links found.");
  }
}

main();
