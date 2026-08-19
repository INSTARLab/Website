#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  absolutePath,
  hasFragment,
  internalReferences,
  listHtmlFiles,
  parseArgs,
  printHelp,
  relativeToRepo,
  resolveDistReference,
  routeFromHtml,
  readText,
} from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", origin: "" });

if (options.help) {
  printHelp([
    "Check internal href/src references and same-page fragments in rendered HTML.",
    "Usage: node scripts/quality/check-dist-links.mjs --dist dist [--origin https://example.test]",
  ]);
  process.exit(0);
}

const root = absolutePath(options.dist);
if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  process.exit(2);
}

const files = listHtmlFiles(root);
const broken = [];
let checked = 0;

for (const file of files) {
  const html = readText(file);
  for (const reference of internalReferences(html)) {
    const resolution = resolveDistReference(reference.value, file, root, options.origin);
    if (resolution.skipped || resolution.external) continue;
    checked += 1;
    if (!resolution.file) {
      broken.push({
        route: routeFromHtml(root, file),
        file: relativeToRepo(file),
        tag: reference.tag,
        attribute: reference.attribute,
        reference: reference.value,
        reason: "missing-target",
        resolvedPath: resolution.path,
      });
      continue;
    }

    if (resolution.fragment && /\.html?$/i.test(resolution.file)) {
      const targetHtml = readText(resolution.file);
      if (!hasFragment(targetHtml, resolution.fragment)) {
        broken.push({
          route: routeFromHtml(root, file),
          file: relativeToRepo(file),
          tag: reference.tag,
          attribute: reference.attribute,
          reference: reference.value,
          reason: "missing-fragment",
          target: relativeToRepo(resolution.file),
          fragment: resolution.fragment,
        });
      }
    }
  }
}

console.log(`Checked ${checked} internal rendered reference(s) across ${files.length} route document(s).`);
if (broken.length === 0) {
  console.log("No broken internal links, media references, or fragments found.");
} else {
  console.error(`Found ${broken.length} broken rendered reference(s):`);
  for (const item of broken) {
    const target = item.resolvedPath ?? `${item.target}#${item.fragment}`;
    console.error(`  ${item.file}: ${item.tag}[${item.attribute}] ${item.reference} -> ${item.reason} (${target})`);
  }
  process.exitCode = 1;
}
