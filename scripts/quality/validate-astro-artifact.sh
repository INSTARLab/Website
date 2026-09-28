#!/bin/sh

# Run the blocking static artifact checks against one built Astro output.
# Shared by the demo quality job and the gh-pages mirror so the exact artifact
# prepared for publication receives the same checks before any remote write.
set -eu

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: sh scripts/quality/validate-astro-artifact.sh <dist> <base> [other-base]" >&2
  exit 2
fi

dist_dir=$1
base=$2
other_base=${3:-}

node scripts/quality/route-ledger.mjs --dist "$dist_dir" --strict
node scripts/quality/check-dist-links.mjs --dist "$dist_dir" --base "$base"
node scripts/quality/check-dist-sitemap.mjs --dist "$dist_dir" --origin https://www.instarlab.org --base "$base"
node scripts/quality/media-audit.mjs --dist "$dist_dir" --strict
node scripts/quality/check-dist-provenance.mjs --dist "$dist_dir"
node scripts/quality/validate-dist-metadata.mjs --dist "$dist_dir"
node scripts/quality/capture-record-visuals.mjs --check --dist "$dist_dir" --base "$base" --strict
ASTRO_DIST_DIR="$dist_dir" node tests/seo/structured-data.test.mjs
test -f "$dist_dir/rss.xml"
test -f "$dist_dir/pagefind/pagefind.js"
test -f "$dist_dir/.well-known/security.txt"

if [ -n "$other_base" ]; then
  node scripts/quality/check-dist-base.mjs --dist "$dist_dir" --base "$base" --other-base "$other_base"
else
  node scripts/quality/check-dist-base.mjs --dist "$dist_dir" --base "$base"
fi
