import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Shipped-copy hygiene gate (gh#353, gh#352).
//
// Two internal-tooling fragments leaked into public body copy: the
// asset-library instruction published as a figcaption on every route with a
// supporting visual, and the privacy policy's own production-gate sentence.
// Both were honest-removal fixes, so this test fails closed on either string
// reappearing anywhere under src/ (the tree the static build renders from).
// Only the exact leaked fragments are banned: ordinary words like TODO in a
// code comment are tooling, not shipped copy, and stay out of this gate.
const REPO_ROOT = new URL('../..', import.meta.url).pathname;
const SCAN_ROOTS = ['src/data', 'src/components', 'src/pages', 'src/layouts'].map((entry) =>
  join(REPO_ROOT, entry),
);
const SCAN_EXTENSIONS = new Set(['.ts', '.astro', '.html', '.md', '.mdx']);
const BANNED_FRAGMENTS = ['repository asset library', 'before production publication'];

function* textFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      yield* textFiles(absolute);
    } else if ([...SCAN_EXTENSIONS].some((extension) => absolute.endsWith(extension))) {
      yield absolute;
    }
  }
}

test('shipped copy carries no internal-tooling leak fragments', () => {
  const hits = [];
  for (const root of SCAN_ROOTS) {
    for (const file of textFiles(root)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const fragment of BANNED_FRAGMENTS) {
          if (line.includes(fragment)) {
            hits.push(`${file.replace(REPO_ROOT, '')}:${index + 1} carries ${JSON.stringify(fragment)}`);
          }
        }
      });
    }
  }
  assert.deepEqual(hits, [], `leaked internal copy found:\n${hits.join('\n')}`);
});
