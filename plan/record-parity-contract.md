# RRP-001 — Ravonics parity contract and canonical route inventory

Owner: primary integrator / route-data owner. Milestone: Record Room parity 1
(reference contract, top navigation and drawers). GitLab: #23 (this ticket),
umbrella #22, unlocks #24–#30.

Recorded 2026-09-16 on branch `feat/record-parity-m1` at HEAD `37f6362`
("fix(seo,pwa): normalize science titles, repair manifest icons, document www
canonical"). Dist identity: local production build output (gitignored), built
2026-09-16 from that HEAD. Rerun the derivation commands after any
rebuild or route change; counts below are read off the artifact, never
hardcoded.

Supersedes where it conflicts: the sidebar-only / "Ravonics is inspiration
only" direction in #8–#21 and the corresponding historical repository plans
(see "Planning-file reconciliation"). INSTAR branding, institutional content,
public URLs, AVIF image policy, static/no-JS access, and existing JSON
consumer compatibility remain authoritative; Ravonics supplies the requested
layout and interaction target only. No Ravonics company claims are copied. No
institutional or traffic data is invented: missing is not zero.

## 1. Reference pin

Reference repository: `https://git.developerdojo.org/Ravonics/Ravonics-Website`,
pinned at source commit `926cb86e62266ad756bf2df329e88571e5961fc8`
(`fix/record-factual-report-20260909`, committed 2026-09-10 13:27:11 -0400,
"Add manual, additive gh-pages publish workflow"). Verified present locally:

```sh
git -C ~/repos/ravonics/Ravonics-Website cat-file -t 926cb86e62266ad756bf2df329e88571e5961fc8
# commit
git -C ~/repos/ravonics/Ravonics-Website log --oneline -1 926cb86e
# 926cb86 Add manual, additive gh-pages publish workflow
```

The pin is explicit, not floating: remote `main` has since moved to
`c684b3de`, and the fix branch tip is `e855c28f`. Downstream work targets the
pinned tree above. Re-pin only by owner decision, recorded here with date.

## 2. Dated dist asset hashes

The supplied reference `~/repos/ravonics/Ravonics-Website/dist/record/` is a
dated combined archive, not current live output. `meta.json` reads
`generatedAt 2026-09-08T14:18:26.059Z`, `pageCount 58`, `successfulCaptures
58`. SHA-256 verified 2026-09-16, matching the umbrella (#22) record exactly:

```sh
sha256sum ~/repos/ravonics/Ravonics-Website/dist/record/{index.html,manifest.json,meta.json,graph.json,page-metrics.json}
```

```text
index.html        63e8d3cf4bebcf73dd5989d4d3b23c7d76d55e3bb8b7efcb0129e28f71aacbaf
manifest.json     4d2208dd7b7023e20c6ecb5bcc87da286054764bdb33f47bb8445923db59c04c
meta.json         319b9d3ba756e5b91559cd396eba05be648baa2eb1eb9c75fc4a16e15f83970b
graph.json        d06a3a72c8e94c2671b769fae29b4764681176d3b6f584c43966a260823ad3a6
page-metrics.json 862db14332a52afdf456fe9c9775e8ec2afc34fbc38ec3f7ef90ac27599c0caf
```

Its single `index.html` is the retained combined Screens/Nav/Metrics viewer
with full images and thumbnails (`shots/`, `shots/thumbs/`). Its graph has 73
nodes (58 captured + 15 uncaptured linked leaves); the content/chrome edge
split (558 content, 2,036 chrome) is per the umbrella evidence. These describe
the reference dataset, not a target quota: INSTAR's every-page requirement is
stronger than copying its uncaptured leaves, and its historical page counts
are never INSTAR's target.

Live `https://ravonics.com/record/` (2026-09-14 comparison captures attached
to #22, retained there) now shows grouped top navigation (Company, Evidence,
Website archive, Reference) and dedicated `/record/screens/`, `/record/nav/`,
`/record/metrics/` pages. Rule for agents: the local retained viewer supplies
the drawer/inspection target; the live shell and pinned native source supply
the top-navigation target. Do not copy the older combined page as the whole
product.

## 3. Parity matrix

The four explicit owner requests are rows 1–4. Rows 5–7 cover archive
search/preview/metrics behavior. Each target carries Ravonics source or
captured-state evidence.

| # | Capability | Current INSTAR (2026-09-16) | Required outcome | Ravonics evidence |
| --- | --- | --- | --- | --- |
| 1 | Global Record navigation | Persistent left rail on all 16 Record routes plus on-page index (`src/layouts/RecordLayout.astro`, `src/components/record/RecordDocument.astro`, `src/styles/record.css`) | Compact grouped top navigation across every Record page; on-page section navigation in a compact top disclosure; return-to-site/legal links preserved; no permanent global left rail at desktop widths | Pinned `src/lib/record-document.ts`: `RECORD_TAB_GROUPS` (Company, Evidence, Website archive, Reference); `recordMenuScript()` (tap toggles, outside tap closes, Escape closes + refocuses, arrows/Home/End/Up/Down); `recordNoScriptHead()` (grouped dropdowns hide, flat list shows without script); sticky header+toolbar unit (`record-sticky-stack`); live 2026-09-14 captures on #22 |
| 2 | Inspection drawers | Directory (`RouteDirectory.astro`) and preview (`RoutePreview.astro`) render in normal content columns | Independently collapsible directory and resizable preview drawers around a useful central canvas; inspection controls, not replacement global navigation | Pinned `src/lib/record-document.ts:276` (`sidebar-collapsed preview-collapsed` body classes, `data-record-page`/`data-record-view`); pinned `src/styles/record.css` (`.preview-shell`, `.preview-edge`, responsive stacking at `:415,534`); supplied local viewer drawer-open capture on #22 |
| 3 | Visual archive | Six source AVIF visuals, explicitly not screenshots (`recordVisuals` in `src/data/record.ts`, `/record/screens/`) | Full-page screenshots + thumbnails for every public page (all 87 ledger docs), with build/capture provenance; replaces the six-image gallery | Supplied `manifest.json` (58 entries, each with `image`, `thumb`, `w`/`h`, `capturedAt`, `contentHash`); `shots/` + `shots/thumbs/`; local viewer screenshot-grid capture on #22 |
| 4 | Topology | SVG/ranking/finder over 5 authored journeys only: 86 inventory nodes, 15 journey-derived edges (`RouteGraph.astro`, `nav-graph.mjs`, `dist/record/graph.json`) | Actual built-page link graph over all 87 ledger docs with content/chrome distinction, all-page nodes, path exploration, screenshot preview | Supplied `graph.json` (73 nodes; content + chrome edge populations); local viewer topology state (directory + topology captures on #22) |
| 5 | Archive inspection | Small static media gallery; inventory search exists only on `/record/nav/` (`RouteFinder.astro`) | Search, sort, density/status controls, deep links, full preview/lightbox, two-page comparison | Supplied local viewer: full-page screenshot grid + right preview, directory + preview drawers open (captures on #22); pinned viewer toolbar order retained for compatibility |
| 6 | Page metrics | Route-manifest and journey summaries plus per-route inbound rows (`src/pages/record/page-metrics.json.ts`, `/record/metrics/`); manifest-derived identity + journey-step indegree only, no measured HTML facts | Measured per-page HTML facts (layout, media, SEO, word counts), sortable drilldowns, route identity shared with directory/graph/archive | Supplied `page-metrics.json` (`pages[]` with `layout`, `media`, `seo`, `keywords` per file; a11y report-only limits stated in its `comment` field) |
| 7 | Visual acceptance | Sidebar-era density; 16-route coverage in newer tests; historical sidebar/12-route briefs superseded | Explicit parity review across every current Record route + critical states at desktop/mobile, keyboard/touch/no-JS/reduced-motion | Live Record shell + dedicated screens/nav/metrics pages (2026-09-14 captures on #22); pinned `RECORD_PAGES` registry (`src/data/record-pages.ts` at pin) with per-page sections contract |

## 4. Component reuse / extend / replace map

Decisions for the implementing issues (#24–#30). Shared shell/data/schema
changes go through the designated owner; exclusive file ownership is assigned
before parallel work begins.

| Existing INSTAR component | Decision | Rationale / owning issue |
| --- | --- | --- |
| `src/data/record.ts` (`recordRoutes`, `recordNavigationGroups`, `recordGraph`, `recordMeta`, `sitePageRecords`) | Extend (additive) | Route-data owner (#23 contract; #24–#30 consume). Group labels stay INSTAR's (Start/Trust/Inspect/Run); tab-group presentation is the shell's job. Existing JSON consumers preserved through additive/versioned changes |
| `src/layouts/RecordLayout.astro` + `src/components/record/RecordDocument.astro` + `src/styles/record.css` | Extend → top-bar shell | Shared Record shell owner (#24). Reuse SEO/skip-link primitives, one-`main` rule, focus/Escape/no-JS behavior; replace left-rail geometry with grouped top bar per row 1. Stale "twelve navigation links" comment in `RecordLayout.astro` head is that owner's to fix |
| `src/components/record/RouteDirectory.astro`, `RouteFinder.astro` | Extend | Directory/search owner (#25). Reuse inventory + ranking (`nav-graph.mjs`, `InboundRanking.astro`); rebuild presentation as collapsible drawer with numbered entries, density/status controls, deep links |
| `src/components/record/RoutePreview.astro`, `route-preview.ts`, `route-path.ts` | Extend | Preview owner (#25, #27). Reuse selection-state helpers; rebuild as resizable preview drawer with full preview/lightbox + two-page comparison |
| `src/components/record/RouteGraph.astro`, `route-graph.ts`, `nav-graph.mjs` | Extend then replace data source | Topology owner (#28 → #29). Reuse ranking/finder/interaction; replace journey-only edge input with actual-link extractor output; add content/chrome distinction |
| `src/components/record/ui/` (MetricGrid, SectionHeading, EvidencePanel, SourceNote, StatusPill, RecordTable, DataState, value-state, status-label) | Reuse | Presentation primitives stand; no change unless a drawer/top-bar state needs a variant |
| `src/components/record/viz/` (BarChart, DonutChart, LineChart, Timeline, StatusMatrix, FlowDiagram) | Reuse | Chart primitives stand; measured page-metric series arrive as data (#30), not new chart framework |
| `src/components/record/InboundRanking.astro` | Reuse | Keeps the journey-step inbound definition shared with `page-metrics.json.ts` until the actual-link graph lands |
| `src/pages/record/*/index.astro` (16 routes) | Extend per route | Route UI work after shared shell/drawer state integrates (#24, #25 first); visual convergence reviewed whole-room in #31 |
| `src/pages/record/*.json.ts` (6 endpoints) | Extend (additive/versioned) | Never break existing consumers; new measured fields versioned (#28–#30) |
| `scripts/quality/route-ledger.mjs`, `scripts/quality/canonical-route-ledger.mjs` (new) | Reuse | Quality gates stand; canonical ledger script is the derivation tool for this contract and RRP-201/203/205 |

## 5. Route identity contract

One stable route identity joins directory, screenshot manifest, graph,
metrics, and selected-page state:

- **Route ID** is the canonical trailing-slash path (e.g. `/record/nav/`,
  `/research/current-programs/`). The build uses `trailingSlash: 'always'`
  with `format: 'directory'`, so each ID maps to exactly one
  `dist/<route>/index.html`. The sole exception is the host error document
  `/404.html`, whose ID is its emitted filename (`dist/404.html`).
- **Build/capture identity** travels beside the route ID, never inside it:
  `{ contentHash, builtAt, capturedAt, captureStatus }`. Missing, stale, or
  failing artifacts never count as complete; a route with no successful
  capture is uncovered, not done.
- **Join table** (all keyed by route ID): route directory
  (`sitePageRecords` / `/record/nav/`), screenshot manifest (RRP-201
  artifact; absent today — gap), graph nodes/edges (`recordGraph` /
  `/record/graph.json`, `id` = route ID today), metrics
  (`/record/page-metrics.json` per-route rows keyed by `path` today;
  per-page measured facts absent — gap), selected-page state
  (`route-path.ts` / `route-preview.ts`, path-keyed today).
- **Compatibility / versioning:** no `.html` compatibility aliases are
  emitted (see ledger §7 — the CLAUDE.md "root compatibility pages" line
  describes removed legacy source, not current output); canonical URLs are
  trailing-slash only; `dist/sitemap.xml` is a byte copy of the generated
  nested sitemap for host convention; `/search/` is intentionally noindex and
  excluded from the sitemap by the Astro config filter; JSON endpoint changes
  are additive/versioned with existing consumers preserved.

## 6. Derived-count reconciliation

Each count is read off the named source at the recorded HEAD/build. Stale
values (`12` Record routes, `five` endpoints, `58` captures-as-target, `86`
as an HTML-doc count, `70` docs / `68` routes) must never reappear as current
INSTAR facts; `58`/`73`/`558`/`2,036` describe the Ravonics reference
dataset only.

| Population | Value | Derived from | Command |
| --- | --- | --- | --- |
| Record HTML routes | 16 | `recordRoutes` in `src/data/record.ts`; `routeInventory` in `dist/record/meta.json` | `grep -c "route('/record" src/data/record.ts`; `node scripts/quality/canonical-route-ledger.mjs --dist dist` |
| Record JSON endpoints | 6 | `recordMeta.generatedFiles`; `src/pages/record/*.json.ts`; `dist/record/*.json` | `ls src/pages/record/*.json.ts dist/record/*.json` |
| Inventory nodes | 86 | `sitePageRecords` → `recordGraph.nodes` → `dist/record/graph.json` | `python3 -c "import json; print(len(json.load(open('dist/record/graph.json'))['nodes']))"` |
| Journey edges | 15 | `recordJourneys` step pairs → `recordGraph.edges` | `python3 -c "import json; print(len(json.load(open('dist/record/graph.json'))['edges']))"` |
| Emitted HTML docs | 87 | Rendered `dist/**/*.html` | `find dist -name '*.html' \| wc -l` |
| Sitemap URLs | 85 | `dist/sitemap-0.xml` (87 docs minus noindex `/404.html` and `/search/`) | `node scripts/quality/canonical-route-ledger.mjs --dist dist` |
| Of which: ordinary pages / Record / error / utility / aliases | 69 / 16 / 1 / 1 / 0 | Ledger classifier (§7) | same |

Node/doc gap, stated not smoothed over: 86 graph nodes vs 87 HTML docs
because the `/search/` utility route is not in `sitePageRecords` and hence
has no graph node; `/404.html` is in the inventory (via `coreRoutes.notFound`)
but out of the sitemap (noindex). RRP-203 decides whether `/search/` joins
the actual-link graph; until then the gap is documented, not patched by
hand-editing counts.

## 7. Alias / redirect / error handling

- No redirect or alias documents are emitted: zero meta-refresh documents
  found in `dist/`; no redirect directives in `astro.config.ts` or
  `src/pages/`; no `.html` compatibility aliases (see §5).
- Error handling: `dist/404.html` is the host-specific not-found document
  (noindex, follows the recovery template with inline site search); it is a
  graph member and a ledger row, not a redirect.
- If a future compatibility alias or redirect is needed, it must be a ledger
  row of class `alias` pointing at its captured canonical route, with a
  tested redirect — never a silently excluded file.

## 8. Canonical HTML route ledger (87 documents)

Generated 2026-09-16 from the local production build by:

```sh
node scripts/quality/canonical-route-ledger.mjs --dist dist --markdown
```

Class: `page` ordinary indexable page, `record` Record route, `error`
noindex error document, `utility` noindex utility route, `alias`
redirect/alias to a captured canonical (none today). Sitemap/Graph columns
state membership in `dist/sitemap-0.xml` and `dist/record/graph.json`.

| # | Route ID | File | Class | Sitemap | Graph | Title |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` | `dist/index.html` | page | yes | yes | INSTAR Lab — Research Institute |
| 2 | `/404.html` | `dist/404.html` | error | no | yes | Page Not Found — INSTAR Lab |
| 3 | `/about/` | `dist/about/index.html` | page | yes | yes | About INSTAR Lab — Nonprofit Research Institute |
| 4 | `/accessibility/` | `dist/accessibility/index.html` | page | yes | yes | Accessibility Statement — INSTAR Lab |
| 5 | `/community/about-us/` | `dist/community/about-us/index.html` | page | yes | yes | About Us — INSTAR Lab Community |
| 6 | `/community/careers/` | `dist/community/careers/index.html` | page | yes | yes | Careers at INSTAR Lab — Research & Science Jobs |
| 7 | `/community/contact/` | `dist/community/contact/index.html` | page | yes | yes | Research & Partnership Inquiries — INSTAR Lab |
| 8 | `/community/leadership/` | `dist/community/leadership/index.html` | page | yes | yes | Research Leadership & Governance — INSTAR Lab |
| 9 | `/community/partner/` | `dist/community/partner/index.html` | page | yes | yes | Partner With INSTAR Lab — Research & Philanthropy |
| 10 | `/community/support/` | `dist/community/support/index.html` | page | yes | yes | Give to INSTAR Lab — One-Time Gifts & Friends Membership |
| 11 | `/community/work-with-us/` | `dist/community/work-with-us/index.html` | page | yes | yes | Work With INSTAR Lab — Collaboration Opportunities |
| 12 | `/contact-us/` | `dist/contact-us/index.html` | page | yes | yes | Contact INSTAR Lab — Federal Research, Contracts & Partnerships |
| 13 | `/fellowship/` | `dist/fellowship/index.html` | page | yes | yes | INSTAR Lab R&D Fellowships — International and Resident Scholars |
| 14 | `/labs/biometric-security/` | `dist/labs/biometric-security/index.html` | page | yes | yes | Biometrics & Drone Sensing — INSTAR Lab |
| 15 | `/labs/cognitive-ai/` | `dist/labs/cognitive-ai/index.html` | page | yes | yes | Cognitive AI & Persona Systems — INSTAR Lab |
| 16 | `/labs/sovereign-ai/` | `dist/labs/sovereign-ai/index.html` | page | yes | yes | Sovereign AI Laboratory — INSTAR Lab |
| 17 | `/mission/` | `dist/mission/index.html` | page | yes | yes | Our Mission — INSTAR Lab |
| 18 | `/news/` | `dist/news/index.html` | page | yes | yes | News — INSTAR Lab |
| 19 | `/news/clinical-ai-safety/` | `dist/news/clinical-ai-safety/index.html` | page | yes | yes | Clinical AI Safety Research — INSTAR Lab |
| 20 | `/news/formal-methods-safety-critical-trust/` | `dist/news/formal-methods-safety-critical-trust/index.html` | page | yes | yes | Formal Methods and Trust in Safety-Critical Software — INSTAR Lab |
| 21 | `/news/hpc-infrastructure-for-ai/` | `dist/news/hpc-infrastructure-for-ai/index.html` | page | yes | yes | HPC Infrastructure for AI — INSTAR Lab |
| 22 | `/news/legal-foundations-tech-governance/` | `dist/news/legal-foundations-tech-governance/index.html` | page | yes | yes | Legal Foundations for Emerging Technology Governance — INSTAR Lab |
| 23 | `/news/materials-science-energy-transition/` | `dist/news/materials-science-energy-transition/index.html` | page | yes | yes | Materials Science and the Energy Transition — INSTAR Lab |
| 24 | `/news/open-data-research-philosophy/` | `dist/news/open-data-research-philosophy/index.html` | page | yes | yes | Open data is part of the research infrastructure — INSTAR Lab |
| 25 | `/news/precision-agriculture-open-data/` | `dist/news/precision-agriculture-open-data/index.html` | page | yes | yes | Precision Agriculture and Open Agricultural Data — INSTAR Lab |
| 26 | `/news/quantum-sensing-breakthroughs/` | `dist/news/quantum-sensing-breakthroughs/index.html` | page | yes | yes | Quantum Sensing Breakthroughs — INSTAR Lab |
| 27 | `/privacy/` | `dist/privacy/index.html` | page | yes | yes | Privacy Policy — INSTAR Lab |
| 28 | `/record/` | `dist/record/index.html` | record | yes | yes | INSTAR Lab public record \| INSTAR Lab |
| 29 | `/record/affiliations/` | `dist/record/affiliations/index.html` | record | yes | yes | Affiliation register \| INSTAR Lab |
| 30 | `/record/corrections/` | `dist/record/corrections/index.html` | record | yes | yes | Corrections register \| INSTAR Lab |
| 31 | `/record/federal/` | `dist/record/federal/index.html` | record | yes | yes | Federal and institutional research posture \| INSTAR Lab |
| 32 | `/record/files/` | `dist/record/files/index.html` | record | yes | yes | Public documents and asset register \| INSTAR Lab |
| 33 | `/record/governance/` | `dist/record/governance/index.html` | record | yes | yes | Board and policy register \| INSTAR Lab |
| 34 | `/record/journeys/` | `dist/record/journeys/index.html` | record | yes | yes | Role-specific paths through the INSTAR site \| INSTAR Lab |
| 35 | `/record/leadership/` | `dist/record/leadership/index.html` | record | yes | yes | Leadership, governance, and affiliations \| INSTAR Lab |
| 36 | `/record/legal/` | `dist/record/legal/index.html` | record | yes | yes | Legal status, filings, and the §6104(d) request path \| INSTAR Lab |
| 37 | `/record/marketing/` | `dist/record/marketing/index.html` | record | yes | yes | INSTAR Lab positioning and public claims \| INSTAR Lab |
| 38 | `/record/metrics/` | `dist/record/metrics/index.html` | record | yes | yes | Captured page inventory: content, media, and metadata \| INSTAR Lab |
| 39 | `/record/nav/` | `dist/record/nav/index.html` | record | yes | yes | INSTAR Lab public site link inventory \| INSTAR Lab |
| 40 | `/record/ops/` | `dist/record/ops/index.html` | record | yes | yes | Static delivery and operational readiness \| INSTAR Lab |
| 41 | `/record/screens/` | `dist/record/screens/index.html` | record | yes | yes | See the public site in context \| INSTAR Lab |
| 42 | `/record/style/` | `dist/record/style/index.html` | record | yes | yes | INSTAR Lab visual system and public assets \| INSTAR Lab |
| 43 | `/record/verify/` | `dist/record/verify/index.html` | record | yes | yes | Source register and verification limits \| INSTAR Lab |
| 44 | `/research/` | `dist/research/index.html` | page | yes | yes | Research — INSTAR Lab |
| 45 | `/research/consortium/` | `dist/research/consortium/index.html` | page | yes | yes | INSTAR Consortium — Collaborative Research Network |
| 46 | `/research/current-programs/` | `dist/research/current-programs/index.html` | page | yes | yes | Current Research Programs — INSTAR Lab |
| 47 | `/research/facilities/` | `dist/research/facilities/index.html` | page | yes | yes | Research Facilities — INSTAR Lab |
| 48 | `/research/funding/` | `dist/research/funding/index.html` | page | yes | yes | Federal Research & Sponsored Programs — INSTAR Lab |
| 49 | `/research/innovation/` | `dist/research/innovation/index.html` | page | yes | yes | Research Innovation — INSTAR Lab |
| 50 | `/research/open-data/` | `dist/research/open-data/index.html` | page | yes | yes | Open Data & Public Datasets — INSTAR Lab |
| 51 | `/research/opportunities/` | `dist/research/opportunities/index.html` | page | yes | yes | Research Opportunities — INSTAR Lab |
| 52 | `/research/our-process/` | `dist/research/our-process/index.html` | page | yes | yes | Our Research Process — INSTAR Lab |
| 53 | `/sciences/agriculture/` | `dist/sciences/agriculture/index.html` | page | yes | yes | Agriculture Research — INSTAR Lab Sciences |
| 54 | `/sciences/anthropology/` | `dist/sciences/anthropology/index.html` | page | yes | yes | Anthropology Research — INSTAR Lab Sciences |
| 55 | `/sciences/archaeology/` | `dist/sciences/archaeology/index.html` | page | yes | yes | Archaeology Research — INSTAR Lab Sciences |
| 56 | `/sciences/biology/` | `dist/sciences/biology/index.html` | page | yes | yes | Biology Research — INSTAR Lab Sciences |
| 57 | `/sciences/chemistry/` | `dist/sciences/chemistry/index.html` | page | yes | yes | Chemistry Research — INSTAR Lab Sciences |
| 58 | `/sciences/cognitive-sciences/` | `dist/sciences/cognitive-sciences/index.html` | page | yes | yes | Cognitive Sciences Research — INSTAR Lab Sciences |
| 59 | `/sciences/economics/` | `dist/sciences/economics/index.html` | page | yes | yes | Economics Research — INSTAR Lab Sciences |
| 60 | `/sciences/energy/` | `dist/sciences/energy/index.html` | page | yes | yes | Energy Research — INSTAR Lab Sciences |
| 61 | `/sciences/genetics/` | `dist/sciences/genetics/index.html` | page | yes | yes | Genetics Research — INSTAR Lab Sciences |
| 62 | `/sciences/geology/` | `dist/sciences/geology/index.html` | page | yes | yes | Geology Research — INSTAR Lab Sciences |
| 63 | `/sciences/kinesiology/` | `dist/sciences/kinesiology/index.html` | page | yes | yes | Kinesiology Research — INSTAR Lab Sciences |
| 64 | `/sciences/law/` | `dist/sciences/law/index.html` | page | yes | yes | Law & Legal Research — INSTAR Lab Sciences |
| 65 | `/sciences/linguistics/` | `dist/sciences/linguistics/index.html` | page | yes | yes | Linguistics Research — INSTAR Lab Sciences |
| 66 | `/sciences/materials-science/` | `dist/sciences/materials-science/index.html` | page | yes | yes | Materials Science Research — INSTAR Lab Sciences |
| 67 | `/sciences/medicine/` | `dist/sciences/medicine/index.html` | page | yes | yes | Medicine & Health Research — INSTAR Lab Sciences |
| 68 | `/sciences/neuroscience/` | `dist/sciences/neuroscience/index.html` | page | yes | yes | Neuroscience Research — INSTAR Lab Sciences |
| 69 | `/sciences/ocean-science/` | `dist/sciences/ocean-science/index.html` | page | yes | yes | Ocean Science Research — INSTAR Lab Sciences |
| 70 | `/sciences/outer-space/` | `dist/sciences/outer-space/index.html` | page | yes | yes | Outer Space Research — INSTAR Lab Sciences |
| 71 | `/sciences/physics/` | `dist/sciences/physics/index.html` | page | yes | yes | Physics Research — INSTAR Lab Sciences |
| 72 | `/sciences/physiology/` | `dist/sciences/physiology/index.html` | page | yes | yes | Physiology Research — INSTAR Lab Sciences |
| 73 | `/sciences/psychology/` | `dist/sciences/psychology/index.html` | page | yes | yes | Psychology Research — INSTAR Lab Sciences |
| 74 | `/sciences/sociology/` | `dist/sciences/sociology/index.html` | page | yes | yes | Sociology Research — INSTAR Lab Sciences |
| 75 | `/search/` | `dist/search/index.html` | utility | no | no | Search — INSTAR Lab |
| 76 | `/tech-transfer/enterprise-rd/` | `dist/tech-transfer/enterprise-rd/index.html` | page | yes | yes | Enterprise R&D — INSTAR Lab Technology Transfer |
| 77 | `/tech-transfer/portfolio/` | `dist/tech-transfer/portfolio/index.html` | page | yes | yes | Research Portfolio — INSTAR Lab Technology Transfer |
| 78 | `/tech-transfer/sttr-programs/` | `dist/tech-transfer/sttr-programs/index.html` | page | yes | yes | STTR Programs — INSTAR Lab Technology Transfer |
| 79 | `/tech-transfer/workshops-events/` | `dist/tech-transfer/workshops-events/index.html` | page | yes | yes | Workshops & Events — INSTAR Lab Technology Transfer |
| 80 | `/technology/augmented-reality/` | `dist/technology/augmented-reality/index.html` | page | yes | yes | Augmented Reality Research — INSTAR Lab Technology |
| 81 | `/technology/computer-science/` | `dist/technology/computer-science/index.html` | page | yes | yes | Computer Science Research — INSTAR Lab Technology |
| 82 | `/technology/data-science/` | `dist/technology/data-science/index.html` | page | yes | yes | Data Science Research — INSTAR Lab Technology |
| 83 | `/technology/formal-methods/` | `dist/technology/formal-methods/index.html` | page | yes | yes | Formal Methods Research — INSTAR Lab Technology |
| 84 | `/technology/machine-intelligence/` | `dist/technology/machine-intelligence/index.html` | page | yes | yes | Machine Intelligence Research — INSTAR Lab Technology |
| 85 | `/technology/natural-language-processing/` | `dist/technology/natural-language-processing/index.html` | page | yes | yes | Natural Language Processing Research — INSTAR Lab Technology |
| 86 | `/technology/quantum-computing/` | `dist/technology/quantum-computing/index.html` | page | yes | yes | Quantum Computing Research — INSTAR Lab Technology |
| 87 | `/terms/` | `dist/terms/index.html` | page | yes | yes | Terms of Use — INSTAR Lab |

Every emitted HTML document is accounted for: 85 captured pages (69
ordinary + 16 Record), 1 noindex error document that is a graph member, 1
noindex utility route outside the graph, 0 aliases. No normal public route
or Record page is silently excluded.

## 9. Planning-file reconciliation

Older sidebar-era records remain history; they must not override the owner's
top-navigation instruction when implementation begins:

- `plan/record-room-baseline-ledger.md` (RR-101): its 16-route / 6-endpoint
  facts stand; its composition decision ("one persistent sidebar",
  "dashboard/sidebar as the only navigation") is superseded by #22 — banner
  added at the top of that file under this ticket.
- `plan/record-room-issues.json` (RR-101..RR-205 bodies): "12 routes / five
  endpoints / sidebar-only" wording is historical. Left intact as machine
  history; superseded for implementation by #22 and this contract.
- `docs/astro-migration/route-ledger.md`: stale production counts (70
  documents / 68 routes) corrected to the derived 87 / 85 under this ticket,
  with a pointer to this canonical ledger.
- `src/layouts/RecordLayout.astro` head comment ("all twelve navigation
  links"): stale count in a shared-shell file — flagged for the RRP-101
  shell owner (#24), not edited here.
- `docs/record-template.md` shell contract (Record-local replacement of
  `SiteLayout` for `/record/` only) stands unchanged; only the sidebar
  geometry is superseded.

## 10. Standing rules observed

EIN 85-0845517 only; published phone 929-229-2917; missing is not zero (no
measured zeros invented, no absent figures rewritten); AVIF-only image
references; no secrets committed. Gates for this ticket: `pnpm run check`
clean, `pnpm run quality:record` green (including the new
`tests/record/record-parity-contract.test.mjs` derivation guard).
