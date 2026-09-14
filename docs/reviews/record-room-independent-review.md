# Record Room — Independent Review (RR-301)

**Reviewer:** independent reviewer agent (RR-301)
**Date:** 2026-09-13
**Subject:** Bootstrap shell of `/record/` across all 12 routes
**Authority:** review only. No source file was modified. No project build was run.

---

## 0. Provenance and method

| Item | Observed value |
|---|---|
| Source HEAD at review start | `aeaae35` (2026-09-13 19:23:04) |
| Source HEAD at review end | `3199a3c` (`fix(record): reject hybrid provenance and harden the BI validator`) |
| Built `dist/` timestamp | 2026-09-13 19:44:25 |
| Record CSS bundle | `/assets/RecordDocument.rgIJ5VIG.css` (hash unchanged across the 19:41 and 19:44 rebuilds) |
| Marketing CSS bundles | `/assets/index.CULWFlcj.css`, `/assets/SiteLayout.CFYaBY6O.css` |
| Uncommitted at review end | `src/styles/record-theme.css`, `tests/browser/record-room.spec.ts` (concurrent build owner; **not** the reviewer) |

**`dist/` is not attributable to a commit.** It is listed in `.gitignore`, so no commit hash binds the built tree. Everything below that was measured in a browser was measured against the 19:44:25 tree served read-only on `127.0.0.1:8917`. The build landed twice *during* this review and `HEAD` advanced twice; the CSS hash did not change, so all CSS-derived findings are stable, and every structural finding below is independently source-backed. Findings that depend only on the built HTML were re-verified against the final 19:44:25 tree.

**Method.** Static reading of `src/`, plus read-only browser measurement with Playwright against the served `dist/`, plus WCAG relative-luminance arithmetic recomputed from the actual computed colours. No `pnpm run build`, `verify`, or `test:browser` was executed (explicitly forbidden — the build owner holds exclusive claim).

---

## 1. The critical trap — built-output isolation

**PASS.** Measured on the final built tree, at 1280px:

| Route | `<main>` | `<h1>` | `.site-header` | `.site-footer` | stylesheets |
|---|---|---|---|---|---|
| all 12 `/record/**` | 1 | 1 | 0 | 0 | `RecordDocument.rgIJ5VIG.css` only |
| `/index.html` | 1 | 1 | **1** | **1** | `index.CULWFlcj.css` + `SiteLayout.CFYaBY6O.css` |

The `/record/` shell is genuinely isolated: `RecordLayout.astro:1-3` imports only `bootstrap.min.css`, `record-theme.css`, and `record.css`, and never `global.css` or `tokens.css`. Zero `ClientRouter` on record pages. No marketing chrome leaks in, and no record chrome leaks into the 71 marketing pages.

**CSS isolation, both directions: PASS.**
- `--tw-` occurrences in `RecordDocument.rgIJ5VIG.css`: **0** (Bootstrap `--bs-` tokens: present as expected).
- `--bs-` occurrences in `SiteLayout.CFYaBY6O.css`: **0** (Tailwind `--tw-`: present as expected).
- `record-sidebar` / `record-document` occurrences in `SiteLayout.CFYaBY6O.css`: **0**.

The vendor layer is genuinely scoped. This is the strongest part of the work.

---

## 2. Per-route composition verdict (12 rows)

Verdict vocabulary: **coherent** (holds up), **needs work** (visible defect on that route), **mixed** (fine in one viewport, broken in another).

| # | Route | Section system | First-heading scale | Verdict | Why |
|---|---|---|---|---|---|
| 1 | `/record/` | `record-section` | 28px/700 | **needs work** | Dangling `aria-labelledby` (BLK-2); two cards missing `h-100` (SF-9); first section named by a `<p>` not a heading (SF-12) |
| 2 | `/record/leadership/` | Bootstrap `mb-5` | 40px/600 | **mixed** | Best-composed Group-B page, but horizontal overflow at 320px (SF-7); no content-width cap |
| 3 | `/record/marketing/` | Bootstrap `mb-5` | 40px/600 | **coherent** | Table-driven, consistent rhythm; no route-specific defect found |
| 4 | `/record/journeys/` | Bootstrap `mb-5` | 40px/600 | **needs work** | 11 `<h2>` (SF-3); heading order inverts h3→h2→h3 |
| 5 | `/record/federal/` | Bootstrap `mb-5` | 40px/600 | **needs work** | 8 `<h2>` (SF-3); densest page, longest single-line sections; no content-width cap |
| 6 | `/record/verify/` | `record-section` | 32px/700 | **coherent** | Short, well-structured; only the shell-level defects apply |
| 7 | `/record/files/` | `record-section` | 32px/700 | **coherent** | as above |
| 8 | `/record/nav/` | `record-section` | 28px/700 | **needs work** | Duplicate visible `<h2>Routes by family</h2>` (SF-3) |
| 9 | `/record/metrics/` | `record-section` | 28px/700 | **coherent** | Only shell-level defects; `h-100` used correctly here |
| 10 | `/record/screens/` | `record-section` | 32px/700 | **coherent** | as above |
| 11 | `/record/ops/` | `record-section` | 28px/700 | **needs work** | Publishes an internal repo path as the public source (SF-8); raw enum `empty`/`pending` surfaces |
| 12 | `/record/style/` | `record-section` | 32px/700 | **coherent** | as above |

**Score: 6 coherent, 1 mixed, 5 needing work.** No route is broken to the point of being unusable. The problem is not any single route — it is that the same shell renders three different heading scales and two mutually incompatible section systems (§4, SF-1 and SF-3).

---

## 3. Blocking defects

### BLK-1 — Pre-JS layout shift: the document jumps ~891px on every ≤991.98px load

**Severity: blocking.**

**Reproduction.** Six fresh browser contexts at 390×844 against `dist/record/leadership/`:

```
run 1  fcp 504  jsAt 151  CLS 0.08
run 2  fcp 376  jsAt 338  CLS 1.08   <- single shift entry value 1.0
run 3  fcp 360  jsAt 302  CLS 1.08   <- single shift entry value 1.0
run 4  fcp 288  jsAt  89  CLS 0.08
run 5  fcp 288  jsAt  83  CLS 0.08
run 6  fcp 320  jsAt 282  CLS 1.08   <- single shift entry value 1.0
```

3 of 6 loads. The 1.0 entry is attributed to `ARTICLE.record-document` and `NAV.record-sidebar__nav-wrap`. Google's "good" CLS threshold is 0.1; **1.08 is ten times over, and 1.0 is the maximum value a single layout-shift entry can carry.** The remaining 0.08 is a separate, consistent web-font reflow on `DIV.record-document__body` present in all 6 runs.

**Structural cause — deterministic, not timing-dependent.** With JavaScript disabled (the guaranteed pre-JS state) at 390×844:

```
.record-document   top = 891px
.record-sidebar    position: static, visibility: visible
.record-menu-toggle  display: none
nav links visible  12
```

With JavaScript enabled:

```
.record-document   top = 0px
```

The two layouts differ by **891px**. The post-JS layout is gated behind `[data-record-js]`, which is set *only* by the deferred module script:

- `src/layouts/RecordLayout.astro:39` — the script is authored as bare `<script>`, which Astro bundles and emits as `<script type="module">` (confirmed in `dist/record/index.html`).
- Module scripts are **always deferred**. They execute after HTML parsing, so the browser has already laid out and painted the in-flow no-JS state.
- `src/layouts/RecordLayout.astro:53` — `body.dataset.recordJs = 'true'` is the trigger for the entire desktop/mobile sidebar re-layout in `src/styles/record.css:1190-1215`.
- So wherever the module's style recalculation lands relative to first paint, the page either shifts (worst case, observed) or does not (best case). The 891px delta is invariant.

**Why it matters beyond the metric.** The visible symptom is that a phone user briefly sees the entire 12-item navigation list rendered inline, pushing the page title ~891px down, and then the list snaps away and the title jumps to the top. That is exactly the "messy, thrown all over" impression the originating complaint describes, and it fires on the *first* load of every page.

**Recommended fix.** There is no way to keep "the links are in-flow without JS" *and* avoid the shift if JS is what moves them. Pick one:

- **(a) Preferred — make the no-JS state the desktop state at every width.** Give `.record-sidebar.offcanvas-lg` the closed/fixed geometry unconditionally below 992px, and make the no-JS fallback a `<details>`/`<noscript>`-revealed copy of the nav rather than a re-layout of the same element. Nothing moves when the module runs.
- **(b) Cheapest — inline the flag before first paint.** Emit `<body data-record-js="true">` server-side (or a tiny synchronous inline script in `<head>`), and use `<noscript>` to remove it. This removes the race entirely, at the cost of the no-JS layout being unreachable by design rather than by degradation. Astro can do this at build time; it needs no client JS.
- **(c) Minimum-viable mitigation.** If neither is acceptable, reserve the space: constrain `.record-sidebar` to `position: fixed` from the start and give `main` a `padding-block-start` that matches the no-JS height. This bounds the shift rather than eliminating it.

Whichever is chosen, **add a CLS assertion to `tests/browser/record-room.spec.ts`** — there is currently none, which is why this shipped.

---

### BLK-2 — `/record/` names a section with an ID that does not exist

**Severity: blocking** (it is a WCAG 4.1.2 / 1.3.1 name-role-value failure, and it is a one-character-class fix).

**Evidence.**

- `src/pages/record/index.astro:68` — `<section class="record-section mt-5" aria-labelledby="record-inventory-title">`
- No element anywhere in `src/` or in `dist/` carries `id="record-inventory-title"`. Confirmed by enumerating every `[id]` against every `[aria-labelledby]` token on all 12 built routes: **`/record/` is the only page with a dangling reference, and this is its only one.**

**Impact.** The section has no accessible name. A screen reader announces an unnamed region; the `aria-labelledby` is silently discarded.

**Recommended fix.** Either add the missing heading inside the section, or point the attribute at an existing ID. The section's siblings use `record-use-title`, `record-operational-title`, `record-next-title` — the natural fix is `<h2 id="record-inventory-title" class="visually-hidden">Route inventory</h2>`, matching the pattern already used at `src/pages/record/index.astro:52`-style sibling sections and at `metrics/index.astro:25`.

---

## 4. Should-fix quality issues

### SF-1 — Two incompatible section systems, and header/body misalignment above ~1760px

**Evidence.**
- Group A (`index`, `ops`, `metrics`, `nav`, `verify`, `files`, `screens`, `style`) wraps content in `<section class="record-section …">`, which carries `max-inline-size: 90rem; margin-inline: auto` (`src/styles/record.css:250-253`).
- Group B (`leadership`, `marketing`, `journeys`, `federal`) wraps content in `<section class="mb-5">` with a bare `container-fluid px-0` parent — **no width cap at all**.
- `.record-document__header` has **no** `max-inline-size` in either layer (it is declared at `record.css:1094`, `1099`, and only ever given `padding-inline`).

**Measured consequence at 1920px.** Group A bodies cap at 1440px and centre (`secLeft` 368) while their own page header text starts at 288 — an **80px misalignment between a page's header and its body on the same page**. Group B bodies run to 1600px. The threshold where the two diverge is ≈1760px.

**Recommended fix.** One rule, both layers: give `.record-document__header` and `.record-document__body` the same `max-inline-size` and `margin-inline: auto` as `.record-section`, and retire `record-section` in favour of a single `stack`-style vertical-rhythm utility. Until the two systems are unified, every future page author has to guess which one to use — which is how a codebase ends up looking "thrown all over".

### SF-2 — Inconsistent vertical rhythm at the top of the document

`bodyPadTop` is a uniform 32px on all 12 routes — that part is correct. But the first *section* offset is not: Group A applies `mt-5` (48px) to its first section (`metrics/index.astro:24`, `nav/index.astro:19`, `ops`, `verify`, `files`, `screens`, `style`) while Group B applies `mb-5` with no top margin (`leadership/index.astro:40`, `marketing/index.astro:25`, `journeys`, `federal`). Measured distance from the header's bottom edge to the first visible heading: **63px on the four Group-B routes**, but **130-306px on the Group-A routes** (`/record/` 156, `nav` 130, `metrics` 306, `ops` 103). The first thing a reader sees sits at a different height on every route.

**Fix.** Move the first-section offset into the shell (one `margin-block-start` on `.record-document__body > :first-child`) and drop the per-page `mt-4`/`mt-5`/`mb-5` classes.

### SF-3 — Five components hard-code `<h2>`, producing duplicate and non-nested headings

**Evidence.** `<h2 id={…} class="record-viz__title">` is hard-coded in all five visual components:
- `src/components/record/viz/BarChart.astro:38`
- `src/components/record/viz/LineChart.astro:53`
- `src/components/record/viz/StatusMatrix.astro:36`
- `src/components/record/viz/FlowDiagram.astro:25`
- `src/components/record/ui/ChartPanel.astro:19`

Plus `MetricGrid.astro:22` emits `<h2 class="visually-hidden">`.

**Measured consequence.**
- `/record/nav/` renders **two visible `<h2>` elements both reading "Routes by family"** — `nav/index.astro:24` and the `BarChart` title at `BarChart.astro:38`.
- `/record/journeys/` inverts the outline: `h3 → h2 → h3`.
- `federal` and `ops` each render 8 `<h2>` elements.

There are **zero level skips** (no `h→h+>1`), so this is not a 1.3.1 failure in the strictest reading — but a flat, duplicated `<h2>` soup is what an "outline" view in a screen reader actually shows, and it makes a 12-page document unnavigable by heading.

**Fix.** Accept a `level` prop (`2 | 3`) defaulting to the current value, and set it per call site; or wrap every viz in the page's own section heading and render the component title as a `visually-hidden` `<span>` + `aria-labelledby`. The duplicate-title case additionally needs the component title suppressed when it repeats the section heading — `nav/index.astro:24` and `BarChart` at line 25 say the same words.

### SF-4 — The sidebar's surface token is inert at desktop widths

**Evidence.** Bootstrap emits, in the built bundle:

```css
@media (width>=992px){.offcanvas-lg{…background-color:#0000!important}}
```

`.record-sidebar { background: var(--color-surface) }` is declared at `src/styles/record.css:1048` (and again as a literal `#f7fafc` at `:31`) with **no `!important`**. Bootstrap's rule wins the cascade.

**Measured.** Computed `.record-sidebar` background at 1280px on all 12 routes: `rgba(0, 0, 0, 0)` — transparent. Below 992px it correctly resolves to `#f7fafc`.

**Honest impact.** `--color-surface` (#f7fafc) and the page ground (#edf3f8) differ by only ~4% luminance, so the *visible* delta today is small. The real cost is that the surface token is silently doing nothing at every desktop width: any future attempt to darken the sidebar, add a divider, or separate it from the content ground will appear to have no effect, and the author will "fix" it by reaching for `!important` — which is how the cascade gets worse.

**Fix.** Either raise specificity/`!important` deliberately with a comment explaining the Bootstrap override, or — better — set `--bs-offcanvas-bg: var(--color-surface)` on `.record-sidebar` at the record layer instead of fighting `background-color`.

### SF-5 — Focusable chart table wrappers with no role and no accessible name

**Evidence.** `<div class="record-viz__table-wrap" tabindex="0">` at:
- `src/components/record/viz/BarChart.astro:66`
- `src/components/record/viz/LineChart.astro:87`
- `src/components/record/viz/StatusMatrix.astro:44`

**Measured: 11 such elements across 9 of the 12 routes**, every one with `tabindex="0"` and no `role`, no `aria-label`, no `aria-labelledby`. Compare the sibling `.table-responsive` wrappers in the same pages, which correctly carry `role="region"` + `aria-label` (`leadership/index.astro:63`, `metrics/index.astro:53,72`, `nav/index.astro:58`).

**Impact.** `tabindex="0"` puts each of these in the tab order. A keyboard user lands on a focus target that announces nothing, with a visible focus ring around an unidentified box. It is a WCAG 2.4.6 / 4.1.2 problem and it is the most common keyboard annoyance on the site.

**Fix.** Mirror the pattern already in the codebase: add `role="region"` and `aria-label={title}` (or `aria-labelledby={`${chartId}-title`}`) to every `.record-viz__table-wrap`.

### SF-6 — `aria-modal="true"` is set without `inert` on the background

**Evidence.** `src/layouts/RecordLayout.astro:67` sets `sidebar.setAttribute('aria-modal', 'true')` when the offcanvas opens (removed at `:70`). No `inert` is applied to `main`, the backdrop, or the page wrapper.

**Measured** with the offcanvas open at 390px: `mainInert: false`.

**Impact.** `aria-modal="true"` tells assistive technology that everything outside the dialog is unavailable. It is not true. The custom focus trap does hold (verified: 0 of 30 Tab presses escaped the sidebar), so the practical exposure is limited to AT users who navigate by virtual cursor rather than by Tab — but the attribute is asserting something the DOM does not enforce.

**Fix.** When opening, set `inert` on the `main` element (and the backdrop) and remove it on close; keep `aria-modal="true"`. One line each, and it makes the existing focus trap a belt-and-braces guarantee rather than the only mechanism.

### SF-7 — `/record/leadership/` overflows horizontally at 320px, and the spec tolerates it

**Evidence.** At 320px, `document.documentElement.scrollWidth = 321` while `innerWidth = 320`. The culprit is isolated to a single element: `BUTTON.record-menu-toggle`, right edge 320.73px, width 119.39px.

**Root cause.** `src/styles/record.css:1104-1109`:

```css
.record-document__heading--with-menu {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
```

No `flex-wrap`, and the text child has no `min-width: 0`. A long title pushes the button past the viewport. The same cause produces the cramped four-line title sitting beside a vertically mid-air button at 390px.

**Why it shipped.** `tests/browser/record-room.spec.ts:21` asserts `scrollWidth <= width + 1`. 321 ≤ 320 + 1 passes. The tolerance was presumably added for sub-pixel rounding; it is exactly wide enough to hide this.

**Fix.** Add `flex-wrap: wrap` (or `min-width: 0` on the text child) to `.record-document__heading--with-menu`, narrow the breakpoint at `:1243`, and tighten the spec assertion to `scrollWidth <= width` (sub-pixel overflow can be handled with `Math.round` on both sides if genuinely needed).

### SF-8 — `/record/ops/` publishes an internal repository path as a public source

**Evidence.** `src/pages/record/ops/index.astro:19`:

```js
source: `${recordBiSnapshot.source.label} · ${recordBiSnapshot.source.locator}`
```

The snapshot (`src/data/record-bi/current.json`) carries `label: "No approved operational source"` and `locator: "plan/record-room-bootstrap-bi.md#rr-208"`.

**Confirmed in the built output:** `dist/record/ops/index.html` renders, three times, the literal string

```
No approved operational source · plan/record-room-bootstrap-bi.md#rr-208
```

This is the **only** record page that leaks it (verified across all 12). It is a plan-file path from the private repo, published on instarlab.org.

**Fix.** Do not render `source.locator` when there is no approved source. Either branch on `recordBiSnapshot.status`, or add a `publicLocator` field to the snapshot schema and render that. Note the related, separate issue: the page also surfaces the raw enum values `empty` and `pending` from `current.json` — fine for an operator, meaningless to the public.

### SF-9 — `/record/` cards omit `h-100`, producing ragged card bottoms

**Evidence.** `src/pages/record/index.astro:71` and `:78` use `<div class="card shadow-sm">`. The equivalent cards on `nav/index.astro:22,31` and `metrics/index.astro:37,49` use `<div class="card h-100 shadow-sm">`.

**Impact.** Inside a Bootstrap `.row`, cards in the same visual row end at different heights. This is the single most literal instance of the "messy" complaint.

**Fix.** Add `h-100` at `index.astro:71,78` (and audit every other `card` inside a `row`).

### SF-10 — Three card treatments and three heading scales for one document type

**Measured.**
- Card radii: 10.4px (`MetricGrid`, `ChartPanel`) vs 5.6px (Bootstrap `.card`).
- First-content heading, per route: **40px/600** (`leadership`, `marketing`, `journeys`, `federal`), **32px/700** (`verify`, `files`, `screens`, `style`), **28px/700** (`/record/`, `nav`, `metrics`, `ops`), and **20.48px** for viz titles — against a uniform `h1` of 44.8px everywhere.
- Mobile grid behaviour: `MetricGrid` is 1-up below 576px (`row-cols-1 row-cols-sm-2 …`) while `.record-stats` is 2-up.

**Impact.** These are the concrete, measurable forms of "the content just looks very messy thrown all over". A reader moving between `/record/leadership/` and `/record/verify/` sees a different typographic system.

**Fix.** Define one heading scale in `record-theme.css` (e.g. `--record-heading-1/2/3`) and use it everywhere; align `MetricGrid`'s radius to Bootstrap's card radius; pick one mobile card-grid behaviour.

### SF-11 — Build-clock-dependent content

**Evidence.** `src/components/record/RecordDocument.astro:12`:

```js
const snapshotDate = new Date().toISOString().slice(0, 10);
```

Rendered into the sidebar footer (`:82`). Confirmed in the built output: `Website snapshot 2026-09-13`.

**Impact.** Two problems. (1) The output is not reproducible: rebuild tomorrow and every page's text changes. (2) It conflates two different things — the *build* date and the *snapshot* date. `current.json` carries its own `refreshedAt`, so the page has a real snapshot date available and is ignoring it in favour of a build stamp.

**Fix.** Render `recordBiSnapshot.refreshedAt` (or an explicit `siteBuiltAt` from config) and label it accurately. If a build stamp is genuinely wanted, say "Built" rather than "Website snapshot".

Related: `recordBiIsStale` is also evaluated at build time, so a "Stale" badge is frozen into the HTML and can go stale itself between deploys.

### SF-12 — A section named by a paragraph, and other sectioning wrinkles

**Evidence.** `src/pages/record/index.astro:56` — `<section class="record-section mt-4" aria-labelledby="record-use-title">` where the target at `:58` is `<p id="record-use-title">`, not a heading. The accessible name resolves, so this is legal, but the outline has a region whose name is a sentence fragment, and the section has no heading of its own.

**Fix.** Promote `:58` to a heading (`<h2 class="h5">`) or drop the `<section>` and keep a `<div>`.

### SF-13 — Vestigial two-layer `record.css` (1306 lines, ~160 legacy rules)

**Evidence.** `src/styles/record.css` is structurally two files: lines 1-1034 written against the old marketing chrome, lines 1036-1306 ("Dedicated shell contract") overriding it. Concretely:

- **35 of 77 `record-*` classes are unreferenced** (0 hits in a full `dist/` sweep).
- **20 legacy declarations are re-declared** in the contract layer.
- `--layout-chrome-offset` is **undefined inside `/record/`** — used at `record.css:24,26,27` but defined only in `tokens.css:78` and `global.css:724,776`, neither of which the record shell imports. Those three declarations compute against `initial`/invalid.
- `record.css:367-368` — `.record-body .site-footer__panel h2, .record-body .site-footer__panel h3 { color: #fff !important }` — targets a marketing footer that cannot exist inside the record shell. Dead, and it is the only `!important` colour rule in the file.
- A dead reduced-motion block around `record.css:932-938`.
- `.record-document__status i` styles an `<i>` element that is rendered nowhere.
- `src/components/record/ui/ChartPanel.astro` is **referenced nowhere in `src/`** (verified by full-tree grep).
- `focus-target` (on `RecordDocument.astro:57`) is a Tailwind `@utility` from `global.css`, which the record shell never loads — **0 occurrences** in `RecordDocument.rgIJ5VIG.css`, so the class is inert.
- Five competing breakpoints in one file (`70rem`, `61.999rem`, `52rem`, `36rem`, `35.999rem`).
- `data-record-shell="true"` (`RecordLayout.astro:24`) is used by no CSS or JS.

**Impact.** This is the mechanism behind SF-1, SF-2 and SF-4: because two layers disagree, a maintainer cannot predict which declaration wins by reading. It is also why a 1306-line file yields 35 dead classes — nothing prunes it.

**Fix.** Delete the legacy layer and the dead selectors, and re-express the shell contract as the only layer. Verify with a `dist/` class-usage sweep. This is the single highest-leverage cleanup in the codebase: it is what makes the other spacing findings stop recurring.

---

## 5. Contrast — independent recomputation

I recomputed every ratio from the actual computed colours (WCAG 2.2 relative luminance). The in-flight fix by the build owner is **correct and sufficient for its declared scope.**

| Token / element | Colour | On `#edf3f8` (ground) | On `#ffffff` | Verdict |
|---|---|---|---|---|
| `--color-muted` **OLD** | `#667786` | **4.129 FAIL** | 4.617 pass | passes only on pure white; fails on every tint it is actually used on |
| `--color-muted` **NEW** | `#586775` | **5.199 pass** | 5.814 pass | **correct fix** |
| Bootstrap `.text-secondary` | `#6c757d` | **4.193 FAIL** | 4.689 pass | covered by the new `--bs-secondary-color` binding |
| Bootstrap inline `<code>` | `#d63384` | **4.024 FAIL** | 4.501 pass | covered by the new `--bs-code-color` binding |
| `--bs-link-color` | `#0d5d98` | 6.184 pass | 6.916 pass | fine |

Measured on the live page: `.text-body-secondary` at 14px resolves to `rgb(88, 103, 117)` on `rgb(237, 243, 248)` = **5.199:1** — i.e. the fix is live in the built output. My arithmetic independently reproduces the `4.129:1` figure in `docs/record-room-handoff.md`, which corroborates that document.

**Two residuals the in-flight fix does not cover:**

### SF-14 (latent) — `--bs-primary` clears AA by 0.038 ratio points

`#1072ba` measures **4.538:1** on the record ground `#edf3f8` — a pass, but by **0.8%**. It is used for the small uppercase section labels throughout (`leadership/index.astro:43`, `marketing/index.astro:27,35`, `federal`, `journeys`). On white card surfaces it is 5.075:1 and comfortable. **This is not a failure today.** It is a tripwire: any future darkening of the ground, or any nudge of the brand hex, silently converts every section label on the site into a WCAG failure — and it would not be caught, because there is no contrast assertion in the test suite.

**Fix.** Bind `--bs-primary` to `--color-brand-deep` (`#0d5d98`, 6.184:1) for *text* usage, keeping `#1072ba` for fills/borders only — the same split the fix already applies to `<code>`.

### Nit — `text-bg-success` white-on-`#198754` = 4.531:1

Passes by 0.031. Same tripwire class as SF-14, on the `/record/nav/` indexability badges (`nav/index.astro:68`) and the freshness badges on `/record/federal/`.

### Nit — `.record-viz__export` border `#9ebdcc` = 1.98:1 on white

Below the 3:1 of WCAG 1.4.11. It is a decorative border around a download control, so this is a judgement call rather than a hard failure — but if the border is the only thing identifying the control's boundary, 1.4.11 applies.

---

## 6. Kepler's 7 data-contract findings — closure status

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | Strict schema / importer validation (grain, temporal kind) | **CLOSED** | `scripts/record/bi-schema.mjs:39,72,82,108,141` (`hasOnlyKeys` at every level); `:92` period shape + ordering; `:154-155` `temporalKind` period↔asOf exclusivity; `:161-167` dimensions must equal `requiredDimensions` exactly; `:168-173` source/approval/reviewOwner/nextReviewDate; `:174` duplicate-key rejection |
| 2 | Temporal overlap rejection | **CLOSED** | `bi-schema.mjs:184-193` — pairwise `O(n²)` rejection: for period metrics with identical dimensions, `left.period.start <= right.period.end && right.period.start <= left.period.end` is an error. A true exclusive partition. |
| 3 | Chronology validation | **CLOSED** | `bi-schema.mjs:117-119` (period start ≤ end); `:176-179` retrieval / approval / period-end / asOf must all be `<= refreshedAt`; `:172` `nextReviewDate >= refreshedAt` |
| 4 | Mixed-source attribution — flagged PARTIALLY resolved | **NOT REPRODUCIBLE AS STATED** (see below) | per-row labels *are* aggregated correctly; the real adjacent defects are different |
| 5 | CSV quoting / formula injection | **CLOSED** | `src/components/record/viz/csv.mjs:8` `csvCell` always quotes, doubles embedded `"`, and prefixes `'` on `/^[\s\0-\x1f]*[=+\-@]/` — RFC-4180 plus formula-injection guarding that also covers leading whitespace and control characters |
| 6 | Selector `intervalGrain` calendar-span logic | **CLOSED** | `selectors.mjs:148-161` verified for same-month, cross-year, leap-year, and single-day spans. The residual `elapsed-days:NaN` path is unreachable — `validatePeriod` (`bi-schema.mjs:92`) gates on `isIsoDate` for both endpoints. |
| 7 | Null propagation / freshness | **CLOSED** (with a caveat) | `selectors.mjs:105-121` — `unavailable` yields `value: null`, never `0`; `:137` `latestMetricAggregate` propagates null if any member is null. Freshness derives from `nextReviewDate`. **Caveat:** `recordBiIsStale` and `snapshotDate` are evaluated at build time, so the rendered "Stale"/"Current" badge is frozen into the HTML and is not reproducible (§SF-11). |

### Finding 4 — investigate and state definitively

**Definitive finding: the reported defect does not exist as described, and I could not reproduce it.** The claim was that `/record/federal/` and `/record/ops/` cite snapshot-level source when per-row sources differ. That is not what the code does:

- `src/data/record-bi/selectors.mjs:35-61` — `uniqueSources` / `observationSourceLabel` walk every observation and every nested `sources` array, collecting per-row sources and joining distinct ones with `'; '`. Per-row attribution is genuinely implemented.
- The snapshot-level fallbacks are all guarded on **zero observations**:
  - `ops/index.astro:19` — fires only in the `items: []` empty-state branch.
  - `federal/index.astro:31` — `latestFundingObservations.length > 0 ? observationSourceLabel(…) : <snapshot label>`.
  - `federal/index.astro:49` — the `fundingObservations.length === 0` table row.

  When there are zero observations there are no per-row sources, so no divergence is possible. When there *are* observations, the per-row path is taken. The two branches are mutually exclusive by construction.

**Two genuine defects do exist in this area, and they are what the original report was probably reaching for:**

1. **`/record/ops/` publishes an internal repository path as the public source** (SF-8). This is real, reproducible in the built output, and the more serious of the two.
2. **Chart footers concatenate every per-row source into a single string with no bar→source mapping.** `observationSourceLabel` joins with `'; '`, so a bar chart with three categories from three different sources renders one undifferentiated source line. A reader cannot tell which bar came from which source. The *data* is correct; the *presentation* loses the mapping. This is a real attribution-quality gap and belongs on the backlog — but it is a presentation fix, not a data-contract fix.

**Recommendation.** Close finding 4 as not-reproducible with the above reasoning recorded, and open two new issues in its place: one for SF-8, one for the chart bar→source mapping.

---

## 7. What I could NOT verify, and why

I am stating these explicitly rather than implying coverage I do not have.

1. **`dist/` provenance.** `dist/` is `.gitignore`d, so the built tree is tied to no commit. `HEAD` advanced twice during this review (`aeaae35` → `e00090e` → `3199a3c`) and `dist/` was rebuilt at least twice (19:41:41 → 19:44:25). All browser measurements are against the 19:44:25 tree. The CSS bundle hash was identical in both rebuilds, so CSS findings are stable; HTML-level findings were re-verified against the final tree. **Any finding here should be re-confirmed if `dist/` changes again.** The build owner's edits to `record-theme.css` and `record-room.spec.ts` were **uncommitted** throughout, so my reading of those two files reflects a working tree, not a commit.
2. **I ran no build.** No `pnpm run build`, `pnpm run verify`, or `pnpm run test:browser`. I cannot say whether the suite passes, whether `astro check`/`tsc --noEmit` is clean, or whether the pipeline is green. The build owner holds that exclusively, by instruction.
3. **No axe / automated a11y run.** `record-room.spec.ts:1` imports `AxeBuilder`, but I did not execute it. My accessibility findings come from DOM enumeration, computed styles, and keyboard TAB-walking — strong for structural and naming issues, but an axe run may surface things I did not.
4. **Keyboard and AT testing is partial.** I verified the focus trap (0 of 30 Tabs escaped), Escape-to-close, and focus return to the trigger. I did **not** test with a real screen reader (NVDA/JAWS/VoiceOver), and did not verify the virtual-cursor reading order.
5. **CSV export was not exercised in-browser.** I read `csv.mjs` and verified its logic by inspection (finding 5, CLOSED on inspection). I did not click the export control, so I cannot confirm the `data:` / blob download path works in a real browser, nor what filename it produces. Note the Artifact sandbox blocks script-driven downloads, but this is a plain static site and should be unaffected — unverified either way.
6. **No dark-mode verification.** `RecordLayout.astro:31` sets `data-bs-theme="light"` on `<body>` and `record-theme.css` defines a light ground. I did not test `prefers-color-scheme: dark`, and I did not check whether any Bootstrap dark-mode rule leaks through under a system dark preference.
7. **Reduced-motion was spot-checked, not audited.** I confirmed the sidebar and skip-link transitions resolve to `0s` under `prefers-reduced-motion: reduce`. I did not enumerate every transition/animation in the bundle.
8. **No no-network / vendor-CDN verification.** I confirmed Bootstrap is bundled locally (`dist/assets/`), not CDN-linked, but did not test the site with network egress blocked.
9. **Two viewports I did not measure directly.** I have full measurements at 320, 390, 1280, and 1920. I did not measure 768px in isolation (it falls between the 992px offcanvas breakpoint and the 576px `row-cols-sm` breakpoint, and I relied on the 320/390 and 1280 passes to bracket it).
10. **Table overflow at 320px is contained but I did not verify every cell.** Several routes have tables whose cells extend past the viewport (federal, verify, files, metrics, ops, style, marketing, nav). Each sits inside an `overflow-x: auto` wrapper and the document itself does not overflow (`scrollWidth === innerWidth` on all of them except `leadership`), so these scroll rather than break the page. I did not audit whether every table is *legible* at 320px when scrolled.
11. **I did not evaluate content accuracy.** This review is about the shell: composition, accessibility, isolation, responsiveness, data-contract closure. I did not fact-check the editorial copy, and I made no attempt to populate, infer, or comment on INSTAR Lab's institutional data — the empty snapshot is correct and should stay that way.

---

## 8. Overall verdict

**The `/record/` shell does not yet meet the "proper spacing, proper containers, not messy" bar.**

What is genuinely good, and should not be lost in the criticism:

- **CSS isolation is airtight in both directions** — verified on the built tree, not just asserted.
- **No-JS degrades correctly**: 12/12 nav links visible on every route, the toggle stays `display: none`, no overflow.
- **Reduced motion is honoured**; the focus trap holds; Escape restores focus.
- **Charts provide real table equivalents** (`<details>`, `<caption>`, `<th scope>`), and `LineChart`'s SVG carries `role="img"` with `<title>`/`<desc>`. That is better than most data visualisation ships.
- **The BI data contract is solid.** Five of Kepler's seven findings are closed with real enforcement, and the two hardest — pairwise overlap rejection and RFC-4180 + formula-injection-safe CSV — are done properly. Finding 4 does not reproduce as reported.

Why the bar is nonetheless not met:

1. **The document visibly jumps ~891px on a phone.** Half of six measured loads produced a single layout-shift entry of **1.0** — the maximum possible — because the shell's pre-JS layout is written in-flow and re-laid-out by a deferred module script. The user's complaint was that content "looks very messy thrown all over"; this is that complaint, animated, on every first load.
2. **The same shell renders three heading scales and two incompatible section systems.** A reader moving between `/record/leadership/` (40px, Bootstrap cards, no width cap) and `/record/verify/` (32px, `record-section`, 90rem cap) is looking at two different designs. Above 1760px a page's header and its own body are misaligned by 80px.
3. **Two blocking accessibility defects.** A dangling `aria-labelledby` on `/record/` (the page's own landing route), and 11 focusable-but-unnamed chart wrappers in the tab order across 9 routes.
4. **The existing test suite cannot catch any of it.** No contrast assertion — which is why a defect at 4.129:1 shipped. `scrollWidth <= width + 1` — which is exactly wide enough to hide the 321px `leadership` overflow. `>= 15` on title spacing — which asserts almost nothing. The suite checks that the shell is *present*, not that it is *correct*, and that is the root cause of the RR-301 gap this review exists to close.

**Blocking: 2. Should-fix: 14 (including 1 latent). Nits: 3.**

The shortest credible path to the bar: fix BLK-1 and BLK-2, then do SF-13 (delete the legacy `record.css` layer) — that cleanup dissolves SF-1, SF-2 and SF-4 as a side effect — then unify the heading scale (SF-3, SF-10) and add the missing assertions to the spec. That is a small, well-bounded piece of work, and the foundation underneath it is sound.

---

*Reviewer's note: no source file was modified by this review. The two files showing as modified in `git status` (`src/styles/record-theme.css`, `tests/browser/record-room.spec.ts`) belong to the concurrent build owner, not to me.*
