# Record Room Bootstrap + Business Intelligence Handoff

Status: ready for implementation; implementation pending
Owner: primary agent coordinating Luna workstreams
Scope: `/record/` only, including its local layout, data contracts, route
composition, visualizations, and validation evidence
Historical context: `plan/record-room.md` remains as historical planning
evidence. This document supersedes its protected-shell guidance for the
`/record/` surface only.
GitLab coordination: update existing umbrella issue 8 and milestone 2 with
the RR issue set below. Use these logical IDs until primary supplies live
GitLab links.

## Accepted direction

Adopt the official Bootstrap 5.3 Dashboard and Sidebar patterns as the Record
Room layout reference, pinned to Bootstrap 5.3.8. This is an official
Bootstrap implementation choice; do not describe it as a 2026 release. Use
Bootstrap's containers, 12-column grid, gutters, cards, tables, and controls
with the existing brand fonts and colors.

The Record Room gets a standalone `RecordLayout.astro`. It has one persistent
left navigation on large screens and the same navigation in a responsive
offcanvas panel below the `lg` breakpoint. The desktop sidebar is 16rem and
the content canvas is fluid. Remove the marketing header and footer from every
`/record/` route. Keep return-to-site and legal links inside the Record
sidebar. Preserve URL authority, static Astro delivery, SEO, skip links, and
the five existing JSON endpoints.

Record styling must be isolated from marketing-shell CSS. Do not add a
framework migration, a publication/150-article program, analytics, private
data, or a sitewide redesign. This scoped redesign explicitly authorizes the
Record Room to replace its existing shell; it does not authorize replacing the
ordinary site shell outside `/record/`.

## Worktree and implementation rules

- The worktree is intentionally dirty at handoff. Existing changes belong to
  the user; preserve them and review the final diff by path before delivery.
- Shared Record presentation components and visualization primitives have
  separate owners: RR-103 owns layout-facing panels and status/table
  components; RR-203 owns chart/interaction primitives. Do not overlap writes.
- RR-201 owns metric definitions, types, and snapshot JSON contracts. RR-202
  owns import tooling and fixtures that consume RR-201's stable schema; it may
  not redefine the contract.
- After shared contracts stabilize, route workers may run concurrently only
  within their assigned route files. Changes to shared data, styles,
  components, package files, or endpoints return to the designated owner.
- Operational data is blocked until an institutional data owner supplies and
  approves publishable aggregates. Empty, unavailable, or stale states must
  be explicit; agents must never invent sample values or imply that blocked
  data is complete.

## Milestone 1 — official layout and sidebar-only navigation

### RR-101 — Reconcile baseline and template contract

Owner: primary. Exclusive scope: `.astro-magazine/`, this handoff document,
Record route/data/style inventory, and baseline evidence.

Acceptance:

- Inventory all 12 Record HTML routes and five JSON endpoints without changing
  URL authority.
- Capture current desktop/mobile route and navigation baselines and record the
  approved shell replacement, Bootstrap 5.3.8 source, geometry, spacing, and
  attribution.
- Mark prior checks as historical evidence; no file outside the Record scope
  is overwritten or reverted.

Dependency: none.

### RR-102 — Implement isolated Record shell

Owner: shell worker. Exclusive scope: `RecordLayout.astro`, Record wrapper
styles, Record-local dependency wiring, and boundary-link handling needed for
shell isolation.

Acceptance:

- All Record routes use the new standalone shell with a 16rem desktop sidebar
  and fluid Bootstrap content containers.
- Marketing header and footer are absent from every Record route; the Record
  sidebar is the only navigation chrome.
- Below `lg`, the sidebar is a usable offcanvas opened by a Record menu
  control. Escape, focus return, keyboard navigation, touch, and no-JavaScript
  document-flow access work.
- CSS and runtime behavior do not leak into ordinary site pages; SEO and skip
  links remain valid.

Dependency: RR-101.

### RR-103 — Establish shared dashboard components

Owner: presentation worker. Exclusive scope: Record summary panels, section
headings, metric cards, source notes, status labels, responsive tables, and
empty/stale states. Do not implement chart algorithms or chart interactions;
those belong to RR-203.

Acceptance:

- Components use Bootstrap primitives and the agreed spacing: 16px mobile,
  24px tablet, 32px desktop main padding; 24px panel gutters; approximately
  68-character prose measure.
- Every panel supports source/date context, unavailable data, stale data, and
  accessible headings.
- Components are reusable across all 12 routes without forcing generic cards
  where a route needs a distinct evidence composition.

Dependency: RR-102.

## Milestone 2 — sourced visualization and operational BI

Create milestone: **Record Room — sourced visualizations and operational BI**.

### RR-201 — Establish metric definitions and source contracts

Owner: data-contract worker. Exclusive scope: central Record data/types,
metric definitions, observation schema, source metadata, and JSON endpoint
contracts.

Acceptance:

- Each observation identifies metric, value or unavailable state, unit, period
  or as-of date, dimensions, source, review owner, approval reference, and
  next review date.
- Public approved aggregates are separated from private/raw records.
- Duplicate observations, unknown metrics, invalid periods, inconsistent units,
  and missing source/approval metadata are rejected.
- Missing values render `Not reported`; zero requires an explicit measured
  zero; stale values retain their date and show a stale label.
- Trends appear only for comparable periods. Awards, revenue, expenditure,
  and commitments remain distinct.
- Existing five JSON response contracts remain compatible; add
  `/record/bi.json` for the approved BI dataset.

Dependency: RR-101.

### RR-202 — Build approved snapshot import

Owner: import worker. Exclusive scope: import scripts, input schemas,
documentation, and fixtures. Consume RR-201's schema without redefining it.

Acceptance:

- Accept approved CSV/JSON snapshots with provenance, periods, units, and
  approval metadata validated against RR-201.
- Preserve historical snapshots and document refresh, correction, ownership,
  and next-review procedures.
- No private corpus or unapproved operational data is copied into the public
  repository.

Dependency: RR-201.

### RR-203 — Build accessible visualization primitives

Owner: visualization worker. Exclusive scope: chart components and their
interaction code. Do not alter RR-103's panel/layout component contract.

Acceptance:

- Provide accessible bars, time-series lines, status matrices, and flow
  diagrams with HTML/SVG output, source notes, units, periods, caveats, and
  equivalent data tables.
- Native scripts provide filtering, chart/table switching, and filtered CSV
  export where useful; static HTML remains meaningful without JavaScript.
- Avoid charting services and tracking dependencies. Keyboard, touch, reduced
  motion, and empty/error states are covered.

Dependencies: RR-103, RR-201.

### RR-204 — Redesign overview and inventory pages

Owner: route worker A. Exclusive scope: `/record/`, `/record/metrics/`, and
`/record/nav/` route markup/data bindings.

Acceptance: show operational summary, research portfolio breakdown, evidence
coverage, content/indexability/media metrics, route-family distribution,
search/filter controls, and drill-down links. Keep organizational metrics
visibly separate from website inventory counts.

Dependency: RR-203.

### RR-205 — Redesign institutional and decision pages

Owner: route worker B. Exclusive scope: `/record/leadership/`,
`/record/marketing/`, `/record/journeys/`, and `/record/federal/`.

Acceptance: provide public governance/affiliation relationships, evidence
matrices, research-domain and audience/capability distributions, linked
decision flows, and approved funding distribution/history. Do not invent
conversion funnels, affiliation claims, or engagement pathways.

Dependency: RR-203.

### RR-206 — Redesign evidence and asset pages

Owner: route worker C. Exclusive scope: `/record/verify/`, `/record/files/`,
`/record/screens/`, and `/record/style/`.

Acceptance: show source review/freshness, document types/publication states,
provenance gaps, media roles/dimensions/provenance summaries, aligned asset
comparisons, and an actual palette/spacing/type/component reference.

Dependency: RR-203.

### RR-207 — Build business-status dashboard

Owner: route worker D. Exclusive scope: `/record/ops/`.

Acceptance: present funding, research projects, outputs, and institutional
partnership measures only from approved snapshots. Keep website delivery
evidence separate and dated; use `Not verified` where evidence is absent.

Dependencies: RR-202, RR-203.

### RR-208 — Populate and approve operational data

Owner: institutional data owner with data-contract worker. Exclusive scope:
publishable aggregate inputs, approvals, and reconciliation evidence.

Acceptance: approve definitions for funding by period/category, active projects
by domain/status, completed outputs by type, and active partnerships by
category; reconcile displayed totals to source records; record refresh owner
and review date. If a source domain is unavailable, keep the dashboard in an
explicit blocked/Not reported state and record the exact missing dependency.
This issue cannot be marked complete from a working empty state.

Blocked-with-owner register (RR-208 forward motion without invented data):
missing is not zero, every row renders Not reported, and no row carries a
value. The live register is `src/data/record-bi/blocked-domains.json`,
rendered as the blocked table on `/record/ops/`. Measured zeros in the
shipped snapshot were attested by the chief executive officer on 2026-09-13
(grants awarded, publications) and never appear here.

| Domain | State | Owner | Exact next action | Missing dependency |
| --- | --- | --- | --- | --- |
| Active projects | Not reported · no approved observation | Chief Executive Officer, INSTAR Lab Inc. | Decide whether an active-projects measure belongs in the nonprofit registry; if so, approve the definition and supply an approved aggregate via `scripts/record/import-bi.mjs`. | No approved metric definition; retired `active-research-projects` is not reused. |
| Active partnerships | Not reported · no approved observation | Chief Executive Officer, INSTAR Lab Inc. | Decide whether an active-partnerships measure belongs in the nonprofit registry; if so, approve the definition and supply an approved aggregate via `scripts/record/import-bi.mjs`. Until then name no partner. | No approved metric definition; retired `active-institutional-partnerships` is not reused. |
| Contributions (`contributions-received`) | Not reported · blocked with owner | Chief Executive Officer, INSTAR Lab Inc. | Supply an approved as-of aggregate with source/approval metadata via `scripts/record/import-bi.mjs`, or confirm no figure is approved. | Definition approved; no approved amount exists for publication. |
| Revenue (`annual-revenue`) | Not reported · blocked with owner | Chief Executive Officer, INSTAR Lab Inc. | Supply an approved 2025 period aggregate by source via `scripts/record/import-bi.mjs`, or confirm the year stays Not reported. | No approved exact 2025 figure; the 990-N bound (normally not more than $50,000) is never substituted. |
| Outputs (`completed-research-outputs`) | Not reported · blocked with owner | Chief Executive Officer, INSTAR Lab Inc. | Supply an approved 2025 completed-output count by output-type via `scripts/record/import-bi.mjs`. | No approved 2025 count; the year is Not reported rather than zero. |
| Datasets (`datasets-released`) | Not reported · blocked with owner | Chief Executive Officer, INSTAR Lab Inc. | Supply an approved as-of release count by channel via `scripts/record/import-bi.mjs`, or confirm no releases are approved. | No approved release count; the open-data route is intent, not a count. |
| Transfers (`technology-transfers`) | Not reported · blocked with owner | Chief Executive Officer, INSTAR Lab Inc. | Supply an approved as-of executed-agreement count by transfer-type via `scripts/record/import-bi.mjs`, or confirm none are approved. | No approved executed-agreement count; routes and conversations are not agreements. |

Honest-state machinery: `scripts/record/bi-schema.mjs` pins the two
CEO-attested zeros (`validateCeoAttestedZeros`, forbidding other zeros and
requiring non-empty reasons); `scripts/record/import-bi.mjs` rejects
blank-value rows without a reason and measured rows with a reason at the CSV
row boundary; `tests/record/record-bi.test.mjs` and
`tests/record/record-bi-aggregations.test.mjs` reconcile displayed aggregates
to source rows and the blocked register to snapshot states.

Dependencies: RR-202, RR-207.

## Required route coverage

Every route must retain its distinct content and receive a useful BI or
evidence visualization with source context and an equivalent table or text
description:

| Route | Required visual coverage |
| --- | --- |
| `/record/` | Operational summary, research portfolio breakdown, evidence coverage |
| `/record/leadership/` | Public governance/affiliation relationships and evidence matrix |
| `/record/marketing/` | Research-domain distribution and audience-to-capability matrix |
| `/record/journeys/` | Linked decision flows; no invented conversion funnel |
| `/record/federal/` | Approved funding distribution/history and engagement pathways |
| `/record/verify/` | Source review-status distribution and freshness |
| `/record/files/` | Document types, publication states, and provenance gaps |
| `/record/nav/` | Route-family distribution and filtered inventory |
| `/record/metrics/` | Content, indexability, metadata, and media coverage |
| `/record/screens/` | Media roles, dimensions, provenance summaries, aligned gallery |
| `/record/ops/` | Funding, projects, outputs, partnerships, and dated delivery evidence |
| `/record/style/` | Actual palette, spacing, typography, and component specimens |

## Milestone 3 — independent acceptance and delivery readiness

Create milestone: **Record Room — visual acceptance and release evidence**.

### RR-301 — Independent review and remediation

Owner: independent reviewer. Exclusive scope: review findings and review
artifacts; route workers remediate their own findings.

Acceptance: inspect all 12 routes for architecture, data meaning, factual
claims, accessibility, CSS isolation, responsive geometry, and full-page
composition. Verify no marketing chrome, no overflow, no duplicate main
landmark, useful empty/stale states, and no unsupported operational claims.

Dependencies: RR-204, RR-205, RR-206, RR-207, RR-208.

### RR-302 — Final verification and handoff

Owner: verifier. Exclusive scope: validation commands, rendered artifacts,
release evidence, and handoff report.

Acceptance: run all applicable checks below, inspect final diff by path, attach
route screenshots/measurements and data reconciliation evidence, and record
unresolved risks with exact next actions. A blocked data-owner dependency is
reported as blocked/Not reported rather than treated as a pass.

Dependency: RR-301.

## Validation and release gates

- Capture all 12 routes at 390px and 1440px, including first two viewports and
  full-page renders; inspect 320, 768, 1280, and 1920px plus 200% zoom.
- Test sidebar open/close, keyboard navigation, Escape/focus return, no-JS
  access, reduced motion, print, long labels, table scrolling, filters,
  exports, empty/stale data, and route navigation.
- Assert no marketing chrome on Record routes, one main landmark, consistent
  gutters, no clipped charts, and no document overflow. Compare ordinary-site
  baselines after navigating into and out of Record.
- Test aggregation, duplicate rejection, missing versus zero, incompatible
  periods, required approvals, source linkage, and parity between charts,
  tables, exports, and JSON.
- Run the repository's canonical `pnpm run check`, `pnpm run build`, route,
  media, link, sitemap, metadata/SEO, and browser checks. Repeat base-path
  artifact checks with `ASTRO_BASE=/Website/` when applicable.
- Run the Launch Sequence consumer linter against the pinned composition;
  record the resolved ref/commit, evidence/artifact flow, and earliest failing
  plane if any.
- Run the strict editorial/media/release audits required by the adopted
  build-astro-magazine workflow. Local build evidence does not prove deployed
  Pages/mirror behavior or live form delivery.
- Require independent review after integration, then verifier evidence. Mark
  each gate `pass`, `warn`, `blocked`, `accepted_exception`, or `unknown` with
  an owner and next action.

## Explicit boundaries and risks

- This is a focused `/record/` redesign. It does not upgrade Astro or other
  project dependencies, redesign the ordinary site, add analytics, expose
  private data, or initiate the broader magazine/publication program.
- The original worktree was dirty at handoff; preserve unrelated changes and
  resolve overlaps by ownership before integration.
- Existing media provenance may remain unresolved. Visual polish does not
  upgrade rights or source evidence.
- Operational BI remains blocked until an institutional data owner approves
  publishable aggregates. The implementation must ship truthful empty or
  `Not reported` states when that dependency is unavailable.
- Issue 8 and milestone 2 are external coordination records to be updated by
  primary; this document uses logical RR IDs until live links are assigned.

## Live GitLab tracker

Umbrella: [Record Room redesign](https://git.developerdojo.org/INSTARLab/Website/-/work_items/8). Implementation authorized on2026-09-13 and running with non-overlapping Luna workers.

### [Record Room — official Bootstrap layout and sidebar-only navigation](https://git.developerdojo.org/INSTARLab/Website/-/milestones/2)

- [RR-101: Reconcile baseline and official template contract](https://git.developerdojo.org/INSTARLab/Website/-/work_items/9)
- [RR-102: Implement isolated Bootstrap shell and sidebar-only navigation](https://git.developerdojo.org/INSTARLab/Website/-/work_items/10)
- [RR-103: Establish reusable Bootstrap dashboard presentation components](https://git.developerdojo.org/INSTARLab/Website/-/work_items/11)

### [Record Room — sourced visualizations and operational BI](https://git.developerdojo.org/INSTARLab/Website/-/milestones/3)

- [RR-201: Define trustworthy metrics, observations, and BI source contracts](https://git.developerdojo.org/INSTARLab/Website/-/work_items/12)
- [RR-202: Import approved public CSV and JSON metric snapshots](https://git.developerdojo.org/INSTARLab/Website/-/work_items/13)
- [RR-203: Build accessible charts, matrices and decision flows](https://git.developerdojo.org/INSTARLab/Website/-/work_items/14)
- [RR-204: Redesign overview, content inventory and site map](https://git.developerdojo.org/INSTARLab/Website/-/work_items/15)
- [RR-205: Visualize governance, market profile, journeys and federal record](https://git.developerdojo.org/INSTARLab/Website/-/work_items/16)
- [RR-206: Visualize source quality, documents, media and design system](https://git.developerdojo.org/INSTARLab/Website/-/work_items/17)
- [RR-207: Build business status and dated delivery evidence dashboard](https://git.developerdojo.org/INSTARLab/Website/-/work_items/18)
- [RR-208: Approve definitions and supply publishable operational data](https://git.developerdojo.org/INSTARLab/Website/-/work_items/19)

### [Record Room — visual acceptance and release evidence](https://git.developerdojo.org/INSTARLab/Website/-/milestones/4)

- [RR-301: Independently review all Record routes and BI meaning](https://git.developerdojo.org/INSTARLab/Website/-/work_items/20)
- [RR-302: Verify production artifacts and complete delivery handoff](https://git.developerdojo.org/INSTARLab/Website/-/work_items/21)

