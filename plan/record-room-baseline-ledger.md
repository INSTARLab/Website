# RR-101 — Baseline and template contract ledger

Owner: primary / explorer. Scope: plan and baseline records only; no application
edits were made under RR-101. Recorded 2026-09-14 at `511e1c0` plus the
working-tree changes listed below, which are preserved, not reverted.
(Baseline first captured at `199b1a5`, refreshed through `9e33bd0` —
"feat(record): build Golden Record nav parity with megamenu, identity hero,
grouped sidebar" — and `511e1c0` — "feat(record): build visual sitemap for
/record/nav/ per teardown plan"; route ledger unchanged at 16 routes.)

Supersedes the "12 routes / five endpoints" wording in the RR-101 issue body:
the room has grown since that text was written. The authoritative counts below
are read off `src/data/record.ts` at this commit. Prior checkpoint passes
(including `.astro-magazine/checkpoints/record-room-candidate-20260913.json`
and `.astro-magazine/reviews/record-room-visual-evidence.json`) describe the
pre-Bootstrap tree and remain historical evidence only.

## Route ledger — 16 HTML routes

Source of truth: `recordRoutes` in `src/data/record.ts`. Every route renders
through `RecordDocument.astro` → `RecordLayout.astro`; no `/record/` page
imports `SiteLayout`.

| # | Path | Sidebar group | Owner workstream |
| --- | --- | --- | --- |
| 01 | `/record/` | Start | RR-204 |
| 02 | `/record/journeys/` | Start | RR-205 |
| 03 | `/record/marketing/` | Start | RR-205 |
| 04 | `/record/leadership/` | Trust | RR-205 |
| 05 | `/record/legal/` | Trust | route owner (legal register) |
| 06 | `/record/governance/` | Trust | route owner (board/policy register) |
| 07 | `/record/affiliations/` | Trust | route owner (affiliation register) |
| 08 | `/record/verify/` | Trust | RR-206 |
| 09 | `/record/corrections/` | Trust | route owner (corrections register) |
| 10 | `/record/files/` | Trust | RR-206 |
| 11 | `/record/nav/` | Inspect | RR-204 |
| 12 | `/record/metrics/` | Inspect | RR-204 |
| 13 | `/record/screens/` | Inspect | RR-206 |
| 14 | `/record/federal/` | Run | RR-205 |
| 15 | `/record/ops/` | Run | RR-207 |
| 16 | `/record/style/` | Run | RR-206 |

Group membership is enforced at build time: `recordNavigationGroups` throws on
an unknown or ungrouped path, so a new route cannot silently drop out of the
sidebar. Added after the original 12-route plan: `legal/`, `governance/`,
`affiliations/`, `corrections/`.

## JSON endpoint ledger — 6 static endpoints

Listed in `recordMeta.generatedFiles`; all are prerendered static JSON:

- `/record/bi.json` (RR-201 contract; the sixth endpoint, added after the "five endpoints" wording)
- `/record/graph.json`
- `/record/journeys.json`
- `/record/manifest.json`
- `/record/meta.json`
- `/record/page-metrics.json` (per-route inbound connectivity rows added in the working tree)

## Template contract

- Official Bootstrap 5 Dashboard and Sidebar examples, pinned to
  `bootstrap@5.3.8` in `package.json` (installed and verified: 5.3.8).
- Bootstrap 5.3.8 was released August 25, 2025; it is not described as a 2026
  release anywhere in the room or its docs.
- MIT attribution retained in `docs/record-template.md` with a link to the
  official license file.
- Full shell rules: `docs/record-template.md`. Record-local replacement of
  `SiteLayout` is explicitly authorized for `/record/` only; the marketing
  shell outside `/record/` is protected.

## Baseline captures

- Protected marketing home/navigation/footer baselines and pre-Bootstrap
  Record captures exist under ignored `test-results/record-visuals/baseline/`
  and are historical, not current acceptance.
- Current-build desktop 1440px / mobile 390px captures for all 16 routes are
  a verifier job (RR-302), not claimed here. No screenshot in this ledger is
  presented as current acceptance.

## Build identity and preserved working tree

- HEAD: `511e1c0` (2026-09-14, "feat(record): build visual sitemap for /record/nav/ per teardown plan").
- Preserved modified files (branch shared — other agents in flight; do not
  stage these under RR-101/102/103): `CLAUDE.md`,
  `src/components/chrome/SiteFooter.astro`,
  `src/components/core/CoreEditorialPage.astro`,
  `src/components/editorial/EditorialHome.astro`,
  `src/components/editorial/EditorialRoute.astro`,
  `src/components/editorial/HomeSlider.astro`,
  `src/data/editorialRoutes.ts`, `src/data/siteNavigation.ts`,
  `src/data/workstream5/manifest.ts`.
- RR-101 deliverable (this ledger): `plan/record-room-baseline-ledger.md`.
- RR-103 additions: `src/components/record/ui/` — `MetricGrid.astro`
  (pre-existing), `SectionHeading.astro`, `EvidencePanel.astro`,
  `SourceNote.astro`, `StatusPill.astro`, `RecordTable.astro`,
  `DataState.astro`, `value-state.mjs`, `status-label.mjs`;
  `tests/record/record-ui.test.mjs`.
- Other workstreams' untracked Record tests (not RR-101/102/103 scope):
  `tests/record/record-bi-aggregations.test.mjs`,
  `tests/record/record-viz-core.test.mjs`.
- Gates observed while recording: `pnpm run check` clean; `pnpm run
  quality:record` 69 pass / 0 fail (2026-09-14, includes 13 RR-103 UI tests). Full `pnpm run verify` (build, route,
  media, link, sitemap, browser gates) runs under RR-102/RR-302 acceptance.

## Composition decision

Evidence-led with operational summaries, within Bootstrap containers, grid,
cards, tables, and offcanvas — selected over dashboard-first (metric tiles
without provenance) and portfolio-led (gallery without evidence states).
The room keeps one persistent sidebar; no marketing header/footer renders on
any `/record/` route.
