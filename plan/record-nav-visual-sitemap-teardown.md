# Track 2 Step 1 — Reference teardown: visual sitemap for `/record/nav/`

Status: teardown + plan only. No route, component, or data change in this step.
Source branch: `gh-pages` (HEAD `d9d6f63` at time of writing).
Reference: `/home/mrh/repos/ravonics/Ravonics-Website/dist/record/index.html`
(226,263 bytes, built static single-file record room, read 2026-09-14).
Local counterpart: `src/pages/record/nav/index.astro` (110 lines) → `/record/nav/`.

> Constraints carried through every step below: no fabricated facts (every
> count, label, and date on the page comes from a repository source);
> AVIF-only image references (never `.jpg`/`.jpeg`/`.png`/`.webp`); the
> telephone discrepancy note in `src/data/record-registers/legal.ts`
> (site-published `929-229-2918` vs Ohio AG record `(929) 222-2917`) stays a
> recorded discrepancy — no step "resolves" it by picking a winner; favicon
> PNGs and og JPGs are accepted exceptions and are not deleted; RR-301
> keyboard/contrast treatment (visible focus, `aria-live` result counts, `Esc`
> clears, `?` help, reduced-motion gating) is kept, not re-litigated.

## 1. What the reference actually contains

The reference is a three-pane app shell (`aside.sidebar` + `div.content` +
`aside.preview-shell`) with a view switcher (Screens / Nav / Metrics) and a
command palette. Its seven sitemap-relevant features:

### 1a. Numbered page directory (sidebar `nav.directory-wrap`)

- `<ol class="directory" id="directory">` rendered by JS (`buildDirectoryItem`)
  from the fetched manifest: zero-padded numbers (`numberFor`, width derived
  from entry count), file/title links, section heads (`sectionOf` groups by
  path prefix, "Top level" for root files), `is-active` + `aria-current` sync
  with the selected card.
- Sidebar search (`#gallery-search` + `#result-count[role=status]`) filters
  directory, grid, and count together; `/` focuses search, `Esc` clears.
- Collapsible sidebar (`#sidebar-toggle`, `#sidebar-edge`, persisted width),
  keyboard: arrows/J/K move between cards, `Enter` opens, `F`/double-click
  inspection view, `Ctrl/⌘+K` palette.

### 1b. All pages (noscript fallback)

- `<noscript>` static `<ul class="directory">` with one `<li>` per page
  (`01 booking.html …`). Explicit note: "Network topology view needs
  JavaScript; this list covers the same pages." This is the no-JS contract:
  the full list exists in HTML; JS only enhances.

### 1c. Route finder (`#network-path`)

- From/To `<select>`s (`#path-from`, `#path-to`) populated from the graph
  universe, "Allow chrome hops" checkbox (`#path-chrome`), Find/Clear buttons.
- `pathFind(contentEdges, chromeEdges, allowChrome, from, to)`: BFS shortest
  path over body-copy (content) edges, optionally plus site-nav/footer
  (chrome, "weak") edges. Same-page, unreachable, and nearest-hub
  (`pathNearestHub`, reverse-BFS) states handled explicitly.
- Result: summary sentence (`#path-summary`, focus-moved, `tabindex=-1`) +
  ordered step list (`#path-steps`, each step a button that previews the
  page); the route highlights in the topology (`pathShowHighlight`) with
  optional step playback (`pathTickPlayback`, reduced-motion aware).

### 1d. Page metrics (`#metrics-pane`)

- Lazy: `fetch("page-metrics.json", {cache:"no-store"})` on first view open
  (`ensureMetrics`), skeleton while loading.
- Per-page rows: layout, media, SEO, keyword, and landmark metrics; sortable
  table with column-visibility control, per-row detail drawer
  (`renderMetricsDetail`), rollup charts (`renderMetricsCharts`), CSV export
  (`exportMetricsCsv` via shared `downloadFile`), keyword search
  (`metricsRowMatches`).
- Stated policy in-pane: "Report-only triage for creator and SEO review; the
  site quality gate owns pass and fail."

### 1e. Top inbound pages (`#network-cta`)

- Ranked leaderboard from `graph.json` `cta` rows: `{target, inContent,
  inChrome}`. Sort chip cycles total → content → chrome (`ensureCtaSort`,
  synchronous re-render by design); per-row bar scaled to peak, count +
  `(content · chrome)` split; `Show all N` / `Show fewer` toggle
  (`CTA_TOP_N` collapsed default).
- Clicking a row pins node-focus (`pinNetwork` → dim/highlight in topology,
  `aria-pressed`); hover/focus previews without stealing the pin; `Esc`
  clears. This is the "where does attention concentrate" view.

### 1f. Per-page preview pane (`#preview-name` et al.)

- Kicker (`#preview-number`), linked name (`h2#preview-name > a`),
  title line (`#preview-title`), large capture (`#preview-image` in
  `#preview-link`), Copy link (`#copy-link` + `#copy-ok` status, shared
  `copyText` with textarea fallback), Maximize (`#preview-max`, fullscreen
  overlay dialog behavior), Recently-viewed rail (`#recents`, localStorage),
  collapsible pane (`#preview-edge`, splitter resize with
  `role=separator` + `aria-valuenow`, persisted width).
- Uncaptured (chrome-only leaf) pages: metadata-only state, no broken image
  (`selectNetworkLeaf` — kicker "Uncaptured page", copy disabled).
- Keyboard: click/focus a card updates preview; `Enter` on a topology node
  returns to the grid card (`networkBackToGrid`).

### 1g. Network CTA link graph (`#network-stage`, 7 inline `<svg>`)

- SVG topology (`svgEl` namespace helper) grouped by section lanes, nodes
  colored per section (`sectionColor`), edges faint (`opacity:.22`,
  `pointer-events:none`); node click → preview; focus dims the rest
  (`.is-focus .is-dim`); pan/zoom (`wireNetworkPanZoom`); `Enter` on node
  jumps back to grid.
- Data: `fetch("graph.json")` — nodes, content/chrome edge lists,
  `edgeLabels` (top inbound body-copy label per file feeds node tips via
  `networkTopInbound`), `cta` leaderboard rows, chrome pairs/layer.
- The 7 static inline SVGs are toolbar/preview affordances, not the graph
  itself: sidebar toggle, preview toggle, Screens icon, Nav icon, Metrics
  icon, expand, restore. All `aria-hidden`, `stroke=currentColor`, no emoji.

## 2. Local data-source mapping (all build-time derivable)

| Reference feature | Local source (already present) | Derivation point | Gap / adaptation |
|---|---|---|---|
| Manifest behind directory + grid | `sitePageRecords` (`src/data/record.ts:191`) — core (`core-routes.ts`) + editorial (`editorialRoutes.ts` + `workstream5/manifest.ts`) + 6 section pages + 15 record routes, deduped by path, sorted | Astro build (imported directly by `nav/index.astro`) | None for data; reference numbers by manifest order, local sorts by path — numbering must be defined (recommend: same order the "Find a route" table already renders: family-grouped) |
| `graph.json` behind topology + inbound + finder | `recordGraph` (`src/data/record.ts:293`) → `src/pages/record/graph.json.ts` → `dist/record/graph.json`. Nodes carry `{id, label, family, kind}`; edges derived from `recordJourneys` step pairs with `journey` id | Astro build, prerendered JSON | **Edges are journey flows, not body-copy links.** No content/chrome split exists locally. Inbound ranking = indegree over journey edges; finder BFS runs over journey edges; chrome-hop toggle has no local meaning (either omit, or map "weak" to `nextAction` terminal edges — decision for Step 2) |
| Journeys behind finder context | `recordJourneys` (`src/data/record.ts:193`, 5 journeys) → `src/pages/record/journeys.json.ts` → `dist/record/journeys.json`; rendered human-readable at `/record/journeys/` with `FlowDiagram` | Astro build | Reuse as-is; finder step labels/hrefs come from here |
| `page-metrics.json` behind Page metrics | `src/pages/record/page-metrics.json.ts` serves `{...recordStats, families}` (per-family counts, not per-page rows). Per-route metadata exists in `scripts/quality/route-ledger.mjs` output (route, title, description, canonical, h1/main counts, visual modes, page signature) built from `dist/` HTML | Build (endpoint) + CI post-build (ledger) | **No per-page metrics endpoint yet.** Step 2 must decide: promote ledger fields into a build-time per-route table vs extend `page-metrics.json.ts`. Do not invent SEO/keyword/landmark numbers — only ledger-measured or manifest-derived fields |
| `manifest.json` / `meta.json` | `recordMeta` + `recordRoutes` → `src/pages/record/manifest.json.ts`, `meta.json.ts`; `recordStats` (`record.ts:255`) | Astro build | Reuse; directory counts and provenance strings come from here |
| Screenshot captures | **None — by design.** `/record/screens/` uses the AVIF library via `recordVisuals` (`record.ts:277`, 6 route-backed visuals, dimensions/role/license from `publicMediaFor`) | Astro build | Preview pane shows the route's `recordVisuals` AVIF where one exists, metadata-only state otherwise (mirrors reference `selectNetworkLeaf`). No capture pipeline is proposed |

Confirmation: every input above is importable at `astro build` time or
produced from `dist/` by an existing ledger script. No runtime service, no
browser capture fleet, no new data vendor is required.

## 3. Local counterpart today (what `/record/nav/` has and lacks)

`src/pages/record/nav/index.astro` (110 lines, inside `RecordDocument` +
`RecordLayout` sidebar shell) currently has:

- Distribution card: `BarChart` "Routes by family" (`SRC-002` provenance,
  CSV export, data-table `<details>`), family counts derived from
  `sitePageRecords`; link to `/record/metrics/`.
- Legend card: route-kind definitions (Core / Editorial / Section / Record).
- "Find a route" card (keep as-is): full HTML table at build time
  (Route / Family / Kind / Indexability / Description), text search +
  family `<select>`, live `role=status` count, "Search is an enhancement"
  no-JS note. **This table is the local equivalent of the reference's
  noscript "All pages" contract — later steps enhance around it, never
  replace it.**

Zero of the seven reference features exist locally: no numbered directory,
no inbound ranking, no preview pane, no SVG topology, no route finder, no
per-page metrics, no command palette. (Palette is out of scope for the nav
page — it belongs to a record-wide shell concern, not Track 2.)

## 4. Component breakdown (new files under `src/components/record/`)

Conventions each component keeps: `recordHref()` for every link (base-path
safe); provenance footers (`Source: …` + `sourceHref` to `/record/verify/`,
`SRC-002` for route-manifest derivations); `RecordDocument` heading-level
discipline (call sites pass `level`, no hard-coded `h2` — RR-301 SF-3);
Bootstrap 5.3 cards/tables/controls; full content in HTML, JS enhances.

1. `src/components/record/RouteDirectory.astro` — numbered directory.
   Props: `entries` (already family-grouped order from the nav page),
   `currentPath`. Renders `<nav aria-label="Page directory"><ol>` with
   zero-padded numbers (width from entry count), family subheads, links via
   `recordHref`, `aria-current="page"` on current. Placement: sidebar-adjacent
   card above "Find a route" on `/record/nav/` (the record-room shell already
   owns the app sidebar; this is a page-level directory, not a second shell).
2. `src/components/record/InboundRanking.astro` — "Top inbound pages".
   Props: precomputed `rows: {path, title, inbound, journeys[]}[]` (indegree
   over `recordGraph.edges`; the `journeys` list replaces the content/chrome
   split — each row names which journey(s) traverse it). Collapsed top-N +
   `Show all` toggle (`aria-expanded`), row click pins/filters (progressive
   enhancement: rows are links to the routes; JS adds pin behavior only when
   the graph component is present).
3. `src/components/record/RoutePreview.astro` — preview pane.
   Static-first: `<aside aria-label="Route preview">` with kicker, linked
   name, title/description, family/kind/indexability meta, `recordVisuals`
   AVIF `<img>` when the route has one (exact `width`/`height`, AVIF-only),
   metadata-only "No route visual — linked from the route inventory" state
   otherwise. Copy-link + collapse/maximize + recents are JS enhancements
   wired by `src/components/record/route-preview.ts` (deferred module, respects
   `prefers-reduced-motion`, `Esc` clears). No `localStorage` dependency for
   core function.
4. `src/components/record/RouteGraph.astro` — SVG link graph.
   Server renders: `<svg role="img" aria-label>` with family-lane groups,
   nodes (`<a href>` around circle+label so the graph works without JS) and
   edges from `recordGraph`; plus a `<details>`/table fallback listing the
   same nodes/edges as text. Client module (`route-graph.ts`) adds
   focus-dim, pin-from-ranking, pan/zoom, `Enter`-returns-to-table-row.
   Node/edge counts stay small (route inventory scale, not web scale), so
   inline SVG is appropriate.
5. `src/components/record/RouteFinder.astro` — route finder.
   From/To selects populated from `sitePageRecords`, Find/Clear, BFS over
   `recordGraph.edges` in a deferred module (`route-path.ts`, same BFS shape
   as reference `pathFind` minus the chrome edge set). Result: summary
   sentence (focus-moved, `tabindex=-1`) + ordered step list of links reusing
   `FlowDiagram` styling vocabulary. Unreachable pair → explicit "no recorded
   path" state naming the journeys searched (never a fabricated route).
   Chrome-hop checkbox: omitted unless Step 2 adopts the `nextAction`-as-weak
   mapping — the checkbox must not ship wired to nothing.

Shared client-logic home (not a component): keep the three deferred modules
(`route-preview.ts`, `route-graph.ts`, `route-path.ts`) co-located under
`src/components/record/` so the nav page remains the only importer.

## 5. Implementation plan (steps after this teardown)

- **Step 2 — data + ranking.** Derive inbound ranking + finder adjacency from
  `recordGraph` in `src/data/record.ts` (or a `nav`-local derivation module —
  do not widen `recordGraph`'s shape without the record-room owner's sign-off
  per the Bootstrap handoff's shared-contract rule). Decide the weak-edge
  question (omit vs `nextAction`-as-weak). Decide per-route metrics source
  (ledger promotion vs endpoint extension). Deliverable: data functions +
  unit tests in `tests/record/`.
- **Step 3 — components.** Build the five components above in dependency
  order (directory → ranking → preview → graph → finder), each with
  no-JS content parity and RR-301 keyboard/contrast treatment.
- **Step 4 — compose `/record/nav/`.** Extend `nav/index.astro` keeping the
  distribution chart, legend, and "Find a route" table untouched in place;
  add directory + ranking + graph + finder + preview sections with
  `RecordDocument` heading discipline. AVIF-only; phone-discrepancy note
  untouched; favicon/og exceptions untouched.
- **Step 5 — gates.** `pnpm run check`, `quality:record` (extend ledger/tests
  for new components), full `pnpm run verify` before the nav MR; commit,
  push, watch pipeline green. No new JSON endpoint ships without updating
  `recordMeta.generatedFiles` and the sitemap/provenance checks that read it.

## 6. Teardown method (provenance for this document)

- Reference section inventory via heading/ID survey of the built file
  (`Numbered page directory`, `All pages`, `Route finder`, `Page metrics`,
  `Top inbound pages`, `preview-name`, `network-cta`, 7× `<svg`);
  behavior from named-function survey (`pathFind` BFS quoted verbatim in
  structure; `ctaRows`/`pinNetwork`/`selectNetworkLeaf`/`ensureMetrics`
  summarized, not copied — the local implementation will be original code
  against local data shapes).
- Local sources read: `src/data/record.ts` (inventory/graph/journeys/stats/
  meta/visuals), `src/pages/record/{graph,journeys,page-metrics,manifest,
  meta,bi}.json.ts`, `src/pages/record/nav/index.astro`,
  `src/pages/record/{metrics,journeys}/index.astro`,
  `src/components/record/{RecordDocument,viz/BarChart}.astro`,
  `scripts/quality/route-ledger.mjs`,
  `src/data/record-registers/legal.ts:91-97` (contact-discrepancy note).
- No counts, dates, or identifiers in this document come from anywhere else.
