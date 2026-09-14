# Track 1 Step 1 — Chartable-series audit for infographics / dataviz expansion

Audit date: 2026-09-14. Branch: `gh-pages`. Scope: every numeric series in
`src/data/record-registers/` plus the BI snapshot they derive from
(`src/data/record-bi/`), against the four existing viz primitives and their
consumers. This file is the Step 1 deliverable; it proposes extension work but
implements none — no component, route, or data file changes in this step.

Hard rules observed throughout: no chart from an `unverified` or
`not-reported` cell; BI snapshot Published / Not reported / Stale states drive
visibility exactly as `src/pages/record/federal/index.astro` does; no invented
figures (real 501(c)(3), EIN 85-0845517 only); no new image references
(AVIF-only convention untouched — this audit proposes inline-SVG primitives,
not image files); the corrected contact phone in
`src/data/record-registers/legal.ts:93-94` (`929-229-2917`) is not charted and no chart consumes
phone numbers.

## 1. Snapshot freshness at audit time (what "Current" means today)

- BI snapshot `record-bi-ceo-attestation-2026-09-13`
  (`src/data/record-bi/current.json`): status `published`, approval
  `approved` on basis `management` (CEO attestation 2026-09-13), `asOf` and
  `refreshedAt` 2026-09-13, every observation `nextReviewDate` 2027-03-31.
  Per `recordBiIsStale` (`src/data/record-bi/index.ts`), all measured rows are
  **Current** on 2026-09-14 and go **Stale** together after 2027-03-31.
- Register retrieval dates: `legalRegisterRetrievedAt`,
  `governanceRegisterRetrievedAt`, `affiliationRegisterRetrievedAt`,
  `resourceUseRegisterRetrievedAt` are all `2026-09-14` — the external-record
  rows (Ohio AG filing figures) were re-opened the same pass as this audit.
- Metric registry: 7 definitions in `src/data/record-bi/schema.json`; 10
  observations in the snapshot (5 measured zeros, 5 explicit `unavailable`
  with `unavailableReason`).

## 2. Inventory — every numeric series in the registers

`comparable-periods?` uses the `comparableMetricSeries` rule
(`src/data/record-bi/selectors.mjs`): same metric, same dimension value, ≥2
periods of equal length, strictly non-overlapping. `asOf` (cumulative-date)
metrics can never satisfy it today — they need ≥2 distinct as-of dates before
any line is drawn, which is why the federal page renders its line empty now.

| # | Register / source | Field (numeric content) | Status / freshness | Comparable-periods? | Chart verdict + proposed type |
|---|---|---|---|---|---|
| 1 | BI `grants-awarded` × `funder-type` (federal/state/private) | 0 USD × 3, as of 2026-09-13, management attestation | `measured`, Current to 2027-03-31 | No — single as-of date, 3 categories | **Chartable now as Bar** (already is: federal page `fundingBars`, ops panels). Line only after a 2nd as-of snapshot lands. |
| 2 | BI `publications` × `publication-type` (journal-article/conference-paper) | 0 publications × 2, as of 2026-09-13 | `measured`, Current to 2027-03-31 | No — single as-of date | **Chartable now as Bar** (already is: ops panels). Same line precondition as #1. |
| 3 | BI `contributions-received` | value `null` + `unavailableReason` (no approved amount) | `unavailable` → Not reported | N/A (no value) | **Must not chart.** Renders as Not reported row only (resource-use register already does this). |
| 4 | BI `annual-revenue` (period 2025-01-01–2025-12-31) | value `null` + reason (990-N filer ⇒ bound ≤$50k, not an exact figure) | `unavailable` → Not reported | No — 1 period, no value | **Must not chart.** A bar at $50k would convert a filing bound into a revenue claim; the exclusion text in `schema.json` forbids exactly this. Chartable only when an approved exact figure for ≥1 year exists (bar), ≥2 complete years (line). |
| 5 | BI `completed-research-outputs` (period 2025) | value `null` + reason (no data owner supplied a count; year is Not reported, not zero) | `unavailable` → Not reported | No — 1 period, no value | **Must not chart.** Same precondition as #4. |
| 6 | BI `datasets-released` / `technology-transfers` (as-of) | value `null` + reasons (route copy is intent, not a release/agreement count) | `unavailable` → Not reported | N/A (no value) | **Must not chart.** |
| 7 | `resource-use.ts` — program-service share | 100.00% ($49,000 of $49,000), most recent Ohio AG filing year | `external-record`, retrieved 2026-09-14; single filing year | No — one year, self-reported filing | **Chartable now as single-snapshot Donut** (proposed primitive): program vs supporting slice, labelled with filing year + "self-reported filing, not audited" + pointer to the management-attestation row. Never a trend until ≥2 filing years are on record. |
| 8 | `resource-use.ts` — grant awards received to date | Derived sum of #1 (`measuredGrantTotal`, 0 USD across 3 funder types); falls back to "Not reported" if snapshot withdrawn | `repo-verified` (derivation, not a second claim) | Inherits #1 (no) | **Chartable now as Bar** via #1 only. The build-time derivation (sums the snapshot rather than hard-coding "0") is the pattern any new chart must keep. |
| 9 | `resource-use.ts` — contributions, evaluation plan, board-approved budget, restricted/unrestricted, designated use | All "Not reported" (`not-reported`) | Absence, published as absence | N/A | **Must not chart.** Five explicit non-series; the finding is the blank. |
| 10 | `governance.ts` — board members reported `3`, meetings reported `1`, audited statements none filed | `external-record`, one filing year | No — single-year filing figures | **Not time-series chartable.** Usable only as labelled stat cards (already are) or as one snapshot slice in a Donut-with-limits. Drawing a line or multi-bar implies a history the register does not hold. |
| 11 | `governance.ts` — board seats (3: 2 named site-published, 1 empty not-reported) | Mixed `site-published` / `not-reported` | No (roster, not periods) | **Chartable now as StatusMatrix** (already is: `seatMatrixRows`) or as Donut slices (named vs unaccounted) — provided the empty seat renders as "unaccounted", never dropped. A bar of "2 board members" would undercount the filed 3. |
| 12 | `governance.ts` — policy register (5: 1 conflict-of-interest external-record, 4 not-reported) | 1 `external-record` + 4 `not-reported` (+ derived `recordPolicyReportedCount` / `recordPolicyNotReportedCount`) | No (checklist, not periods) | **Chartable now as Bar** (already is: `policyBars`) and as Donut (1 vs 4). The not-reported slice must stay visible and labelled "no published source", never merged into zero. |
| 13 | `governance.ts` — resource-use status mix (`registerStatusCounts(recordResourceUse)`) | Derived counts across statuses | No | **Chartable now as Bar** (already is: `resourceBars`). |
| 14 | `legal.ts` — legal-status fields (9 rows; EIN 85-0845517, exemption, classification, dates, Ohio reg ID 12174620, address) | `repo-verified` / `external-record` / `site-published`; identifiers and dates, not measures | No | **Not chartable as series.** Only the *status mix* is chartable (already is: legal page `fieldCounts` bar). Values such as the EIN, registration ID, and ruling date must never become chart data. |
| 15 | `legal.ts:93-94` — published contact details (corrected single value `929-229-2917`) | `site-published` | N/A | **Must not chart.** Contact details are not a series; the corrected value is carried verbatim. |
| 16 | `legal.ts` — filing record FIL-001 (one 2025 e-Postcard filing in the bulk dataset; gap unresolved) | Single observed filing year; absence ≠ non-filing | No — one point + an open gap | **Timeline candidate** (proposed primitive): one event pin at tax year 2025 with the `whatItDoesNotEstablish` + `unresolved` text attached. A bar/line of "1 filing" would convert the dataset observation into a compliance claim the register explicitly refuses. |
| 17 | `affiliations.ts` — consortium (7 named: 1 owner-confirmed Ravonics, 6 unverified; 5 with outbound link, 2 without; marks all `unverified`) | 1 `owner-confirmed` + 6 `unverified` | No (membership list, not periods) | **Chartable now as Bar** (already is: `affiliationBars` 1 vs 6). Donut-eligible with the same visibility rule: the 6-slice renders as "named by the site, no source attached". Mark provenance (all unverified) is a constant — charting it would be a one-slice chart; keep as prose. |
| 18 | `affiliations.ts` — named people (4, all `unverified`; one carries an unevidenced doctoral honorific on-page) | All `unverified` incl. credential rule | N/A | **Must not chart as people data.** Counts (4 presented, 0 established) may appear only inside a status-mix chart whose slices are evidence states, never as a "team" visual. Never reproduce the honorific in chart labels. |
| 19 | `corrections.ts` — 6 corrections (COR-001–COR-006; published 2026-06-15/null/2026-09-13; corrected 2026-06-15/16, 2026-09-13; mirror public vs pending-promotion; 1 withholds retracted identifiers) | Commit-evidenced dates; SHAs never in structured data (build gate enforced) | Yes — dated events, 2026-06 → 2026-09 | **Timeline candidate** (proposed primitive): the register's only true event series. Plots published→corrected spans per COR id. Must describe, never reproduce, retracted identifiers (COR-003); must not emit SHAs into JSON-LD/meta/sitemap (existing `check-dist-provenance` gate). A bar of corrections-per-month is permitted only as a status-mix adjunct — the timeline is the honest shape. |
| 20 | Route inventory (`sitePageRecords`: family/kind counts; screens media-role profile; verify source-status counts) | `repo-verified` derived counts | No (census snapshot, not periods) | **Chartable now as Bar** (already are: metrics `familyBars`, nav, ops, screens, verify). Donut-eligible for kind/share views. |

Net: **8 chartable-now series** (#1, #2, #7, #8, #11, #12, #13, #14-mix, #17, #20 — ten rows, eight distinct shapes), **6 explicit non-series** (#3–#6, #9, #15, #18) that must stay tabular prose, and **2 timeline-eligible event sets** (#16, #19) with no existing primitive to carry them.

## 3. Visibility rule (already the law — restated so Step 2 cannot weaken it)

`src/pages/record/federal/index.astro` is the reference implementation:

- Bars show the latest comparable observation per category; a category with no approved observation renders as a `null`-valued row labelled **Not reported** (never omitted, never zeroed).
- A time series is drawn only when `comparableMetricSeries` returns a series (one category, equal-length non-overlapping periods); otherwise the line renders its empty state with the sentence "No comparable single-category series is available; no aggregate line is drawn." No aggregate line across categories, ever.
- Every observation table carries per-row Source + State badges (**Current** / **Stale** via `recordBiIsStale` / **Not reported** for nulls); the snapshot badge reads Published snapshot vs Not reported; the approval line prints both `recordBiApprovalLabel` and `recordBiApprovalBasisLabel` so a management attestation can never read as board approval.
- `src/pages/record/ops/index.astro` extends the same rule per panel (Current / Stale / Mixed freshness / Not reported + review dates in each description; empty panels print "no publishable observation" instead of borrowing the snapshot locator — RR-301 SF-8).

Any new primitive MUST implement the same three behaviours: null → "Not reported" slice/row (not dropped, not zeroed); stale → labelled Stale (per-row where the primitive has rows); source + approval attribution in footer/CSV. CSV exports keep the existing `Label,Value,State,Unit,Source,Approval` contract with measured-zero vs unavailable kept apart (`BarChart.astro:57-63`, `LineChart.astro:66-75`).

## 4. Existing primitives — review

All four live in `src/components/record/viz/`, share the
`title / description / source / sourceHref / level / id / emptyMessage`
contract, honour heading levels via `level`, ship a data table (`<details>` or
region-wrapped `<table>`), and use one token set
(ink `#122535`, secondary `#526675`, accent `#176b8c` / link `#14627d` on
white/`#f7fafc` grounds — body-text pairs clear AA; the accent-on-white pairs
are reserved for large/bold chart marks and links, never small body copy).

| Primitive | Consumers | Covers rows above | Gap |
|---|---|---|---|
| `BarChart.astro` (bars + CSV + table; null → "Not reported" row with zero-width bar) | federal, metrics, nav, ops, screens, governance, affiliations, legal, corrections, verify | #1, #2, #8, #12, #13, #14-mix, #17, #20 | Cannot show share-of-whole without misleading (a 100% single bar) or event order (corrections/filings). |
| `LineChart.astro` (segments split on nulls so gaps read as gaps + CSV + table) | federal only | (none live — correctly empty; preconditions in §2) | Correctly idle today; needs no change. |
| `StatusMatrix.astro` (Area × columns with positive/caution/negative/neutral + note tooltips) | governance seats, legal source scope, leadership | #11, #14-scope | Tabular by design; not a composition or chronology visual. |
| `FlowDiagram.astro` (numbered linked steps) | corrections (correction workflow) | pathway display only | Shows a process, not dated events — cannot carry COR-001–006 chronology. |

Kicker note: the primitives take no `kicker` prop today — pages render
`.record-section__label` / `.record-kicker` outside the component
(`src/styles/record.css:310,418-432`; e.g. governance stat cards, legal
freshness card). The proposal below folds an *optional* `kicker` into the
shared contract rendering that same class inside the viz header, so future
charts do not invent a second kicker style.

## 5. Proposal — at most 2 new primitives

### P1. `DonutChart.astro` (share-of-whole for single-snapshot compositions)

- Serves: #7 (program-service 100% filed share), #11 (seats named vs unaccounted), #12 (policies 1 vs 4), #17 (affiliations 1 vs 6), #20-kind shares.
- Props: shared contract + optional `kicker` + `slices: { label, value, state: 'measured'|'unavailable'|'not-reported', note? }[]` + `unit?`. Sums are derived in-page from register counts (as `policyBars`/`resourceBars` already do) — never typed in.
- Rendering: static inline SVG ring (no animation → reduced-motion safe); every slice labelled with value + state in text, never colour-alone; `unavailable`/`not-reported` slices rendered hatched/grey **and** labelled "Not reported: \<reason\>"; single-slice 100% totals print the total centre with the period/filing-year caption beneath.
- Honesty guards: requires ≥1 measured slice (all-absent input → `emptyMessage`, no ring); slices from mixed evidence bases print the basis in the slice note (e.g. "self-reported filing" vs "management attestation"); CSV + data-table mirror the BarChart columns.
- Styling: `.record-viz__*` classes only, existing tokens; slice palette restricted to accent/secondary/neutral tints already in the room with AA-checked label ink.

### P2. `Timeline.astro` (dated event sequences)

- Serves: #19 (corrections COR-001–COR-006 published→corrected spans) first; #16 (filing record single pin + open gap) second.
- Props: shared contract + optional `kicker` + `events: { id, label, date | { from, to }, state, href?, description, limits? }[]`. Dates must be commit-evidenced (corrections) or dataset-stated (filings) — `publishedAt: null` (COR-006) renders as "date not established in the repository", never a guessed date.
- Rendering: vertical list with date rail (horizontal on ≥xl, same breakpoint pattern as `FlowDiagram`); state badges reuse register vocabulary (`owner-confirmed`/`external-record`/… or Current/Stale/Not reported — never invented states); each event carries its `limits`/`unresolved` text inline (the filing gap stays visibly open).
- Honesty guards: COR-003 renders its description with no identifier values (register `withholdsRetractedIdentifiers`); commit SHAs render as page-body text/links only, never into structured data (existing provenance gate keeps enforcing this); single-event input (#16) renders a one-pin timeline with the open-gap note, not an error state.
- Styling: `.record-viz__*` classes + `.record-kicker` for the optional kicker; same tokens; no motion.

Explicit non-proposals: no pie-with-legend variant (donut covers it), no
stacked/area/range primitives (no multi-period data exists to justify them —
revisit only when §2 preconditions are met), no image-export pipeline (inline
SVG keeps the AVIF-only rule trivially satisfied; any future raster export
must land in `img/pages/<page>/` as `.avif` and is out of scope here).

## 6. Next steps for primitive extension (Step 2+ sequencing)

1. **Step 2a — `DonutChart.astro`**: implement per §5-P1; wire first to governance policy mix (#12, lowest dispute surface: 1-vs-4 with existing `policyBars` derivation as oracle); extend to affiliations (#17) and resource-use program share (#7, needs filing-year caption + attestation pointer); add `tests/record/` cases mirroring `record-bi.test.mjs` (null → Not reported slice; all-absent → empty state; CSV State column parity with BarChart).
2. **Step 2b — `Timeline.astro`**: implement per §5-P2; wire first to corrections (#19, dates commit-evidenced); then filing record (#16, single pin + open gap); extend `check-dist-provenance` coverage to the new component's output (no SHAs in structured data, no retracted identifiers anywhere).
3. **Shared-contract chore (either step)**: add optional `kicker` to all six primitives (renders `<p class="record-kicker">`, no new CSS); verify AA pairs for any new slice/rail tint before merge.
4. **Do not build yet**: line-chart wiring for any BI metric (blocked on a 2nd as-of snapshot or 2nd complete period year — a data event, not a code event); any chart touching #3–#6, #9, #15, #18 (blocked on sources that do not exist); raster infographic exports (blocked on AVIF pipeline + per-page banner review).
5. **Validation per step**: `pnpm run quality:record` + `tests/record/` green, then the standard commit → push → pipeline-watch → verify loop on `gh-pages`.

## 7. Sources consulted

`src/data/record-registers/{types,index,legal,governance,affiliations,corrections,resource-use}.ts`;
`src/data/record-bi/{schema.json,current.json,index.ts,selectors.mjs}`;
`src/components/record/viz/{BarChart,LineChart,FlowDiagram,StatusMatrix}.astro`
(+ `csv.mjs`, `line-segments.mjs`); consumers `src/pages/record/{federal,ops,metrics,nav,screens,governance,affiliations,legal,corrections,verify,leadership}/index.astro`;
`src/styles/record.css`; `tests/record/record-bi.test.mjs`; `package.json`
(`quality:record` = `node --test tests/record/*.test.mjs tests/unit/*.test.mjs`).
