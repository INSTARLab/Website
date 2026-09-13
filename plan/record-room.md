> ## SUPERSEDED — HISTORICAL EVIDENCE ONLY
>
> **This plan is superseded. Do not implement against it.** It is retained
> unaltered below as historical evidence of the pre-Bootstrap Record Room
> workstream. An agent that reads it as live specification will build the wrong
> thing.
>
> **The authoritative plan is [`plan/record-room-bootstrap-bi.md`](record-room-bootstrap-bi.md).**
> Read that document before touching `/record/`. Do not use the acceptance
> criteria, the RR-01…RR-05 issue IDs, or the RICE table below as current
> specification.
>
> **Superseded:** 2026-09-13, at commit `aeaae35` (branch `gh-pages`), by the
> approved Bootstrap + Business Intelligence redesign.
>
> ### Acceptance criteria below that are now factually FALSE
>
> | Stale claim in this document | Current truth |
> | --- | --- |
> | "12 Record Room HTML routes and **five** Record Room JSON endpoints" (lines 36–38, 62, 64) | **Six** JSON endpoints. RR-201 added `/record/bi.json`. The set is `bi`, `graph`, `journeys`, `manifest`, `meta`, `page-metrics`. |
> | "desktop shared-header height **132px**, mobile 76px" (lines 44–45) | **Desktop header is 0px — it was removed.** RR-102 gave `/record/` a standalone `RecordLayout.astro` with a 16rem sidebar and no marketing header or footer on any `/record/` route. The 76px mobile figure is stale for the same reason. |
> | "Preserve the logo … shared header/footer semantics" / the protected-shell contract (lines 21–27, 63, 71) | **Reversed for `/record/` only.** The Bootstrap plan explicitly authorizes replacing the shared shell inside `/record/`. The ordinary site shell remains protected everywhere outside `/record/`. |
> | Issue IDs RR-01…RR-05 and the RICE table (lines 53–164) | Replaced by **RR-101…RR-302**; the live tracker is GitLab issues #9–#21 (umbrella #8). |
>
> Recorded measurements and checkpoint evidence produced under this plan — for
> example `.astro-magazine/checkpoints/record-room-candidate-20260913.json` and
> `.astro-magazine/reviews/record-room-visual-evidence.json` — describe the
> **pre-Bootstrap** build (5 endpoints, 132px header) and must not be cited as
> evidence for the current tree.
>
> Everything below this banner is unaltered historical record.

---

# INSTAR Lab Record Room — SOTA continuation plan

> Superseded for the Record Room redesign by [the approved Bootstrap and BI plan](record-room-bootstrap-bi.md). The candidate results below are historical. The current authorization removes marketing header/footer within `/record/` and adds approved-snapshot BI.

Status: candidate implementation complete; local gates verified
Owner: primary agent / Record Room workstream
Scope: `/record/`, the shared navigation spacing/interaction correction required to make it discoverable, and project dependency upgrades
Created: 2026-09-12
Last verified: 2026-09-13
GitLab milestone: [Record Room — layout, navigation, evidence and current toolchain](https://git.developerdojo.org/INSTARLab/Website/-/milestones/2)
GitLab plan issue: [Record Room SOTA continuation](https://git.developerdojo.org/INSTARLab/Website/-/work_items/8)

## Thesis and protected contract

The Record Room is an inspectable public index: a source-conscious place to
understand INSTAR Lab's public identity, route graph, evidence boundaries, and
asset lineage before making a decision. It should feel like a working archive
or reading room—numbered, legible, cross-referenced, and calm—not like a second
marketing homepage.

The existing INSTAR shell remains the visual authority. Preserve the logo,
blue/white/charcoal palette, self-hosted fonts, shared header/footer semantics,
public URLs, static-first delivery, AVIF-only policy, and existing navigation
labels/destinations. The shared navigation change is a functional/layout
correction only: improve spacing, focus/escape behavior, and no-overflow
resilience without replacing the shell or collapsing its information
architecture.

Ravonics-Website is inspiration for record-room qualities only: a strong
visual sitemap, clear archive/index framing, deliberate metadata, and a
confident dark/light evidence rhythm. Do not copy its assets, code, brand,
claims, fonts, or color system.

## Evidence at intake

- Adoption reconciliation on 2026-09-12 found 37 source routes, 83 rendered
  HTML pages, 484 public media assets, 12 Record Room HTML routes, and five
  Record Room JSON endpoints. Imported work remains `unknown` until current
  evidence earns a gate.
- Current baseline captures are in
  `test-results/record-visuals/baseline/` (ignored): `/record/`, `/record/nav/`,
  `/record/screens/` at 1440×900 and 390×844, plus open desktop/mobile nav.
- Baseline browser measurements: no document overflow at either viewport;
  desktop shared-header height 132px, mobile 76px. `/record/` body heights
  were 1,932px desktop and 3,858px mobile. Desktop nav labels read as a
  compressed run; the first Record Room viewport has competing sidebar,
  heading/folio, metadata, and body-label columns.
- Baseline validation currently passes `pnpm run check` and the fresh
  `pnpm run build`. The previous checkpoint's 18 browser tests and strict
  route/media/link/sitemap checks must be rerun after integration; the prior
  checkpoint is evidence of an earlier build, not today's release verdict.

## Workstream milestone: Record Room SOTA

### RR-01 — Reconcile and preserve the record surface (P0)

Files: `.astro-magazine/`, `plan/record-room.md`, record route/data/style
inventory.

Acceptance:

- Current route and adoption records identify the 12 HTML routes and five JSON
  endpoints without changing URL authority.
- The protected shell and authorized corrections are explicit in studio state.
- No unrelated working-tree change is reverted or overwritten.

Dependency: none. Owner: primary.

### RR-02 — Fix shared navigation density and disclosure behavior (P0)

Files: `src/styles/global.css`, `src/components/chrome/PrimaryNavigation.astro`,
`tests/browser/site-quality.spec.ts` (navigation tests only).

Acceptance:

- At 1440px, primary labels have a visible, consistent rhythm and no visual
  collisions or unexpected wrapping; Donate remains legible.
- At 390px, the menu panel remains within the viewport, has comfortable touch
  targets, and does not create horizontal document overflow.
- Native `details`/`summary` remains useful with JavaScript disabled.
- Sibling disclosures close, Escape closes the active disclosure and returns
  focus to its summary, outside focus/click closes without trapping focus, and
  route navigation leaves no stale open state.
- Existing top-level labels, links, and business actions are preserved.

Dependency: RR-01. Owner: navigation worker; reviewer: independent reviewer.

### RR-03 — Refine Record Room document geometry (P0)

Files: `src/components/record/RecordDocument.astro`,
`src/styles/record.css`, and only route-local markup where required for
semantic structure.

Acceptance:

- The first viewport identifies the room, states the reader promise, exposes a
  clear next action, and presents one authored evidence/media beat without
  competing folio/sidebar/header collisions.
- The sidebar/index remains a useful persistent table of contents on desktop
  and a usable, clearly scrollable/keyboard-reachable index on mobile.
- Heading hierarchy, reading measure, frame ratios, caption proximity, and
  section rhythm remain legible at 320/390/768/1280/1440/1920px and 200% zoom.
- All 12 routes retain their distinct content and at least three visual modes;
  no generic wrapper or duplicate global chrome is introduced.
- Reduced motion, forced colors, print behavior, and no-JavaScript reading
  remain valid.

Dependency: RR-01. Owner: Record Room worker; reviewer: creative/accessibility
review.

### RR-04 — Upgrade project dependencies to current registry releases (P0)

Files: `package.json`, `pnpm-lock.yaml`.

Registry snapshot on 2026-09-12: `astro` 7.3.2, `vite` 8.3.0, `motion` 13.2.0,
`@astrojs/sitemap` 3.7.4, `@21st-dev/cli` 1.17.1, and `@playwright/test`
1.63.0 are newer than the checkout. `@astrojs/rss` 4.0.19,
`@astrojs/check` 0.9.10, `@axe-core/playwright` 4.13.0,
`@tailwindcss/vite` 4.3.3, `pagefind` 1.5.2, `tailwindcss` 4.3.3, and
`typescript` 7.0.2 are current in the registry snapshot.

Acceptance:

- Upgrade only declared project dependencies with `pnpm update --latest` or
  an equivalent reproducible command; do not install unrelated frameworks or
  replace the TypeScript 7 `tsc --noEmit` project gate.
- Lockfile and manifests agree; no deprecated or vulnerable package is
  introduced; package engines remain compatible with Node ≥22.12.
- `pnpm run check`, `pnpm run build`, route/media/link/sitemap checks, SEO
  tests, and browser QA pass after the upgrade.

Dependency: none for source edits; integrate before final verification. Owner:
package worker.

### RR-05 — Rendered visual and runtime verification (P0)

Files: `scripts/quality/capture-record-visuals.mjs`, ignored evidence under
`test-results/record-visuals/`, `.astro-magazine/` evidence/checkpoint files.

Acceptance:

- Candidate captures exist for the same routes/states/viewports as the
  baseline, with measurements and a zoomed-out inspection of the full route.
- Browser checks exercise desktop/mobile closed/open nav, sibling closing,
  Escape/focus return, outside click/focus, no overflow, route navigation,
  200% zoom, reduced motion, and no-JS static reading where practical.
- Full release validation distinguishes local build evidence from deployed
  GitLab/GitHub Pages evidence; no deployment is claimed without external
  artifact proof.

Dependency: RR-02, RR-03, RR-04. Owner: verifier.

## RICE for follow-on polish

| Task | Reach | Impact | Confidence | Effort | Score | Disposition |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| RR-02 nav spacing/disclosure | 10 | 3 | 0.95 | 1.5 | 19.0 | Complete in candidate |
| RR-03 first-view geometry | 10 | 3 | 0.90 | 2 | 13.5 | Complete in candidate |
| RR-04 dependency refresh | 10 | 2 | 0.95 | 1 | 19.0 | Complete in candidate |
| RR-05 rendered evidence | 10 | 3 | 0.90 | 2 | 13.5 | Complete in candidate |
| Record-room micro-polish beyond these gates | 7 | 1 | 0.70 | 2 | 2.45 | Defer until visual review |

RICE is sequencing evidence, not permission to alter URLs, tracking, privacy,
deployment, or external services.

## Integrated candidate

The Luna implementation swarm completed RR-02, RR-03, and RR-04 in the shared
working tree. The primary integration pass also corrected server-rendered
disclosure state, added Record Room structure/no-JavaScript regression tests,
updated the Pages CI package-manager pin, and refreshed the studio scope. The
candidate visual evidence is captured under the ignored
`test-results/record-visuals/candidate-final/` directory, with durable
measurements in `.astro-magazine/reviews/record-room-visual-evidence.json`.

Local verification on 2026-09-13: `pnpm run check`, `pnpm run build` (Astro
7.3.2, 83 pages), `pnpm outdated --format json` (`{}`), `pnpm audit
--audit-level high`, strict route/media/link/sitemap/metadata/SEO checks, full
browser QA (28 passed, 2 viewport skips), Record Room regression coverage and
navigation cleanup (9 passed, 1 viewport skip), `/Website/` base-path artifact checks, and the
Launch Sequence consumer lint all passed. The consumer lint resolved pinned
`v0.2.5` to commit `93ddb4fc6f469d0346173216ca0d3df5a365680e`; its parser
emitted existing `!reference` warnings for unrelated shared templates but
reported no consumer issues.

Independent reviewer handoff was attempted but the workspace credit ceiling
prevented the reviewer from returning a report. Primary review therefore
covered the final diff, rendered states, and acceptance checks; this remains a
review-process limitation, not a release failure.

## Package and validation commands

```sh
pnpm outdated --format json
pnpm update --latest
pnpm run check
pnpm run build
pnpm run quality:routes
pnpm run quality:media
pnpm run quality:links
pnpm run quality:sitemap
node tests/seo/structured-data.test.mjs
pnpm run test:browser
```

For the base-path contract, repeat the build and artifact checks with
`ASTRO_BASE=/Website/`. The existing Launch Sequence consumer lint remains a
separate CI/release gate.

## Risks and explicit boundaries

- The repository is intentionally dirty from the previous Record Room pass.
  Preserve those changes and review the final diff by path.
- Existing public media has unresolved provenance fields; visual polish does
  not upgrade those fields to verified rights.
- The static build does not prove GitLab Pages/GitHub mirror behavior or live
  form delivery. Those require their normal release evidence.
- No analytics or personal data is added. No private source corpus is exposed.
