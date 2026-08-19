# Workstream 6 handoff: quality, route ledger, media audit, and DX

## Scope and architectural decision

This workstream owns the rendered-output quality contract for the Astro v7
migration. The repository began as a hand-authored static HTML site; the
current workspace now has a pnpm-managed Astro 7.2.4 package foundation,
TypeScript 7, Tailwind 4 through Vite, typed route manifests, and a static
production build. The audit scripts remain Node-standard-library tooling so
they can inspect `dist/` without coupling route quality to the UI runtime.

The browser scaffold uses the pinned `@playwright/test` and
`@axe-core/playwright` packages. `pnpm run verify` runs the strict TypeScript
check, production build, route/link/sitemap/media audits, and the mobile and
desktop browser matrix.

## Changed paths

- `scripts/quality/lib.mjs`: shared dist discovery, HTML metadata, reference
  resolution, fragments, hashing, and output helpers.
- `scripts/quality/route-ledger.mjs`: rendered route coverage and metadata
  ledger.
- `scripts/quality/media-audit.mjs`: rendered media manifest, provenance,
  dimension, duplicate, and reuse audit.
- `scripts/quality/check-dist-links.mjs`: internal links/media/form actions and
  fragments against the built output.
- `scripts/quality/check-dist-sitemap.mjs`: sitemap index/file parity against
  indexable rendered routes.
- `scripts/quality/serve-dist.mjs`: dependency-free static server for browser
  checks.
- `tests/browser/playwright.config.ts` and
  `tests/browser/site-quality.spec.ts`: mobile/desktop route smoke, overflow,
  keyboard focus, and Axe scaffolding.
- `docs/astro-migration/*`: route ledger, media contract, package scripts, CI
  guidance, and this handoff.

Route workstreams also use these tools to verify their Astro pages and legacy
content bridges before handoff.

## Baseline findings

The pre-edit legacy checks found:

- 70 HTML documents and 9,844 internal references; the existing internal-link
  checker passed.
- `sitemap.xml` contains 68 entries while disk contains 70 pages; the known
  drift is `/community/fellowship/` missing from the sitemap.
- `html-validate` exits non-zero on the legacy markup, with recurring
  pre-existing findings such as lowercase doctypes, deprecated conditional
  comments, inline styles, non-native button controls, telephone whitespace,
  trailing whitespace, and focus/ARIA issues. This remains the legacy
  migration backlog rather than a regression from this workstream.
- No local Astro CLI or production `dist/` existed at the time of discovery, so
  an Astro build, Astro check, generated route audit, or browser/Axe run could
  not be completed before the package foundation lands.

The final build currently renders 70 HTML documents. The strict route ledger,
internal link/media audit, and sitemap parity check pass. The media audit has
0 errors and 2,810 warnings; the warnings are legacy markup metadata gaps
(stable media IDs, provenance, roles, and intrinsic dimensions) and remain a
tracked enrichment backlog rather than missing files or alt decisions.

The browser matrix passes all 6 tests across mobile and desktop Chromium:
route responses, no document overflow, WCAG 2.2 AA Axe scans, and keyboard
focus. The expected `/404.html` response is tested as HTTP 404, while the
community fellowship alias is tested as a redirect and excluded from the
final-document Axe scan.

`pnpm exec astro check` is currently blocked by Astro's programmatic checker
API rejecting TypeScript 7.0.2; `pnpm run check` is the enforced strict
`tsc --noEmit` gate until Astro supports TypeScript 7's native compiler API.
The build also warns about empty future article/author content collections
and the optional lazy Three.js chunk being larger than Vite's 500 kB advisory
threshold. Three.js is intersection-gated and not on the initial critical
path.

## Handoff commands after the package foundation lands

```bash
pnpm install --frozen-lockfile
pnpm run verify
```

Install Chromium once in a clean environment with `pnpm exec playwright
install chromium`. The audit scripts must target the production `dist/` and
never `src/` as a substitute for a build.

## Adding content, routes, and media safely

1. Add or update typed Astro content and a route family; do not rely on a
   source-only inventory.
2. Build the site and inspect the route ledger for every generated route,
   canonical, title, description, `h1`, and `main`.
3. Render media through the shared media component with stable IDs, roles,
   alt/caption decisions, dimensions, source, license, and focal/crop data.
4. Run the media audit and document any repeated creative asset with a real
   role-based reuse reason.
5. Run dist links and sitemap checks before browser tests.
6. Add a browser test only when it describes a stable reader or accessibility
   contract, not a brittle serialized HTML snapshot.

## Open risks and owners

| Risk | Owner | Exit condition |
| --- | --- | --- |
| Astro's `astro check` API does not yet accept TypeScript 7. | Tooling lead | Keep strict `tsc --noEmit` green; re-enable `astro check` when supported. |
| Legacy media metadata remains incomplete. | Editorial/media lead | Add stable IDs, roles, provenance, dimensions, and reuse reasons incrementally. |
| Near-duplicate visual judgment is not fully automatable. | Editorial lead | Review flagged screenshots and record composition decisions. |
| The optional Three.js chunk is above Vite's advisory size. | Performance lead | Keep it lazy; split or replace the scene if it becomes a critical-path feature. |
| GitHub Pages CDN asset-path behavior needs live verification after Astro cutover. | Deployment lead | Verify CSS/media status, MIME types, `.nojekyll`, and console on canonical domain. |
