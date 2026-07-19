#!/usr/bin/env node
// Accessibility scan across every hand-authored page (gh#257).
//
// Runs pa11y (HTML_CodeSniffer WCAG2AA ruleset by default) against every
// tracked *.html file, scanning each one directly via a file:// URL so no
// local web server is required. pa11y is invoked through `npx` per page
// (see scripts/ci/pa11y.config.json for the shared launch config) rather
// than imported as a library, so this script has no package.json / npm
// install step of its own — consistent with CLAUDE.md's "no build
// system, no package.json" rule. The bundled Chromium that `pa11y`
// depends on (via puppeteer) is downloaded on demand by npx; no docker
// image or system Chrome install is required.
//
// Usage: node scripts/ci/run-a11y-scan.mjs

import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listHtmlFiles, REPO_ROOT } from "./lib.mjs";

const CI_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(CI_DIR, "pa11y.config.json");
const PA11Y_SPEC = "pa11y@9";

function main() {
  const files = listHtmlFiles();
  const failures = [];

  for (const file of files) {
    const url = pathToFileURL(join(REPO_ROOT, file)).href;
    const result = spawnSync(
      "npx",
      ["--yes", PA11Y_SPEC, "--config", CONFIG_PATH, url],
      { encoding: "utf8" }
    );

    if (result.error) {
      console.log(`${file}: failed to run pa11y — ${result.error.message}`);
      failures.push(file);
      continue;
    }

    const output = `${result.stdout}${result.stderr}`.trim();
    if (result.status === 0) {
      console.log(`${file}: OK`);
    } else {
      console.log(`${file}: issues found\n${output}\n`);
      failures.push(file);
    }
  }

  console.log(`\nScanned ${files.length} page(s) with pa11y.`);
  if (failures.length > 0) {
    console.log(`${failures.length} page(s) reported accessibility issues or scan failures:`);
    for (const f of failures) console.log(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log("No accessibility issues found.");
  }
}

main();
