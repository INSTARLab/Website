# Rendered media manifest and audit

Run this against the production output after every content or route change:

```bash
node scripts/quality/media-audit.mjs \
  --dist dist \
  --out artifacts/quality/media-manifest.json
```

Add `--strict` when the legacy metadata warning backlog is closed.

The script inventories `img`, `source`, `video`, `audio`, and `track` elements,
resolves local output files, records SHA-256 hashes when available, and flags
missing alt decisions, dimensions, provenance, reuse rationale, missing
rendered files, same-route duplicate creative, and unexplained cross-route
reuse. Hashes catch exact duplicates; perceptual similarity and crop fit still
need human review.

## Rendered metadata contract

The Astro media component should emit these attributes so the built output
remains auditable:

| Attribute | Required meaning |
| --- | --- |
| `data-media-id` | Stable editorial asset identifier, not a generated URL. |
| `data-media-role` | `hero`, `observation`, `evidence`, `diagram`, `portrait`, `icon`, etc. |
| `data-media-type` | Photography, illustration, chart, map, technical diagram, video poster, or icon/mark. |
| `data-source` | Source file, collection ID, or external provider reference. |
| `data-license` | License/owner reference; use an explicit `decorative` or `internal` policy where applicable. |
| `data-reuse-reason` | Required when a creative asset repeats across routes or sections. |
| `alt` | Useful contextual description, or `alt=""` for decorative media. |
| `width` / `height` | Intrinsic dimensions for raster media to reserve layout space. |
| `sizes` | Actual display slot, not a universal `100vw` guess. |
| `loading` / `fetchpriority` | Deliberate LCP versus noncritical loading policy. |

Brand marks, utility icons, a shared legend, or a system diagram may repeat
when the reuse reason is recorded. Recoloring, mirroring, or cropping a lead
image without adding a new idea is not meaningful diversity.

## Review protocol

1. Resolve all strict errors before handoff. The current non-strict audit has
   zero errors and reports legacy metadata warnings for incremental cleanup.
2. Review warnings in a route contact sheet at 390px and 1440px.
3. For each flagged route, compare at least two composition or crop options.
4. Record the selected option, rationale, confidence, source/license evidence,
   and owner in the route ledger or implementation note.
5. Rerun the audit against the final `dist/` and attach the JSON artifact to CI.

Current legacy convention is AVIF-first imagery. Do not weaken that project
rule during migration without an explicit, documented exception.
