# Astro migration quality workstream

This directory is the quality contract for the Astro v7 migration. The
scripts under `scripts/quality/` intentionally use only Node's standard
library so they can audit a production `dist/` independently of the UI
runtime.

Start with:

1. `route-ledger.md` for route families, reader jobs, visual signatures, and
   responsive risks.
2. `media-manifest.md` for the rendered media contract and reuse policy.
3. `proposed-package-scripts.md` for the package scripts currently used by
   `package.json`.
4. `ci-quality-gates.md` for the GitLab-first pipeline handoff.
5. `workstream-6-handoff.md` for the current baseline, ownership, and known
   exceptions.

The generated audit artifacts are intentionally not committed by default:

```text
artifacts/quality/route-ledger.json
artifacts/quality/media-manifest.json
artifacts/playwright-report/
```

The final Astro build is the audit surface. Do not treat a source-only route
inventory as proof that every generated route exists.
