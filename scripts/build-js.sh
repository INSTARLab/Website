#!/usr/bin/env bash
# Generates minified .min.js siblings for this site's own hand-authored
# JS (not the vendored jQuery-plugin files, which already ship pre-minified
# or are left readable on purpose). Source files stay untouched and
# individually editable; re-run this after changing any of them.
#
# Minified via terser (npx) — a one-shot CLI pass, same category of tool
# as clean-css-cli in build-css.sh. No bundler/build system introduced.
#
# Run from repo root: ./scripts/build-js.sh

set -euo pipefail
cd "$(dirname "$0")/.."

SOURCES=(
  js/ajax-mail.js
  js/main.js
  js/nav-2026.js
  js/newsletter.js
  js/site-chrome.js
)

for f in "${SOURCES[@]}"; do
  out="${f%.js}.min.js"
  npx --yes terser "$f" --compress --mangle --output "$out"
  echo "Wrote $out ($(wc -c < "$out") bytes, was $(wc -c < "$f"))"
done
