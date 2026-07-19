#!/usr/bin/env node
// Sitemap-vs-disk consistency check (gh#257 acceptance criteria: "consider
// an automated sitemap-vs-disk consistency check").
//
// Compares the hand-maintained sitemap.xml (see CLAUDE.md: "sitemap.xml
// and robots.txt are hand-maintained — update sitemap.xml when adding
// pages") against the actual tracked *.html files, and flags drift in
// either direction. No npm dependencies.
//
// Shared scanning logic lives in scripts/ci/lib.mjs (also used by the
// scheduled site-health sweep, gh#283).
//
// Usage: node scripts/ci/check-sitemap.mjs

import { findSitemapDrift } from "./lib.mjs";

function main() {
  const { sitemapCount, diskCount, onDiskNotInSitemap, inSitemapNotOnDisk } = findSitemapDrift();

  console.log(
    `sitemap.xml has ${sitemapCount} entr${sitemapCount === 1 ? "y" : "ies"}; ` +
      `disk has ${diskCount} page(s).`
  );

  let problems = 0;

  if (onDiskNotInSitemap.length > 0) {
    problems += onDiskNotInSitemap.length;
    console.log(`\nOn disk but missing from sitemap.xml (${onDiskNotInSitemap.length}):`);
    for (const p of onDiskNotInSitemap) console.log(`  ${p}`);
  }

  if (inSitemapNotOnDisk.length > 0) {
    problems += inSitemapNotOnDisk.length;
    console.log(`\nIn sitemap.xml but missing on disk (${inSitemapNotOnDisk.length}):`);
    for (const p of inSitemapNotOnDisk) console.log(`  ${p}`);
  }

  if (problems === 0) {
    console.log("\nsitemap.xml is consistent with the pages on disk.");
  } else {
    process.exitCode = 1;
  }
}

main();
