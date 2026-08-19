# Astro route ledger

This is the route-family ledger for the migration. The machine-readable
ledger is produced from rendered HTML, not from `src/pages/` alone:

```bash
node scripts/quality/route-ledger.mjs \
  --dist dist \
  --out artifacts/quality/route-ledger.json \
  --strict
```

The strict audit expects every indexable route to have one title, one
description, one canonical URL, one primary `h1`, and one `main` landmark.
404, 500, offline, and explicit `noindex` documents are recorded but are not
treated as indexable content.

The current production build passes this audit with 70 rendered documents.
Root compatibility pages intentionally retain `.html` URLs (`about.html`,
`mission.html`, legal pages, and `404.html`); migrated section pages use clean
trailing-slash URLs such as `/research/consortium/`. The historical
`/community/fellowship/` path is emitted as an explicit noindex redirect to
`/fellowship/` and is not added as a second indexable content page.

## Legacy baseline and Astro ownership

The legacy baseline at the start of this workstream contained 70 HTML
documents across these route families. Root `.html` URLs are listed as the
current source shape; the migration owner must decide and test whether each
becomes a clean route, a redirect, or an intentional compatibility URL.

| Family | Current source set | Reader job | Proposed Astro ownership | Page signature / visual modes | Responsive risk |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | Establish INSTAR Lab's point of view and offer a path into the work. | `src/pages/index.astro` plus shared shell | orientation → evidence → observation → action | Hero crop, dense navigation, first viewport |
| Core | `/about.html`, `/mission.html`, `/contact-us.html` | Understand identity, mission, and how to begin contact. | Explicit core pages with shared content data | thesis → proof/values → invitation | Long inline legacy markup and forms |
| Legal / utility | `/privacy.html`, `/terms.html`, `/accessibility.html`, `/404.html` | Complete a compliance or recovery task with minimal friction. | Legal templates plus `src/pages/404.astro` | summary → stable anchors → return path | Readability, focus, print, no-JS behavior |
| Fellowship | `/fellowship/`, `/community/fellowship/` | Decide whether the fellowship path is relevant and what to do next. | One canonical route plus explicit redirect/alias policy | orientation → requirements → action | Duplicate URL intent and sitemap coverage |
| Community | `/community/*` (8 routes) | Find a people, participation, support, or contact path. | Community route family and typed data | wayfinding → field note → participation → action | Forms, menu depth, touch targets |
| Research | `/research/*` (8 routes) | Understand research practice, programs, facilities, funding, or opportunity. | Research route family and editorial evidence modules | thesis → method/sequence → evidence → next question | Diagrams/tables and long copy |
| Sciences | `/sciences/*` (22 routes) | Explore a discipline and discover related work. | Typed discipline collection and index/detail routes | tension → landscape → related questions | Repetitive templates and route differentiation |
| Technology | `/technology/*` (7 routes) | Understand a technical capability and its implications. | Typed capability collection | mechanism → evidence → counterpoint → invitation | Technical terms, diagrams, narrow widths |
| Tech transfer | `/tech-transfer/*` (4 routes) | Evaluate commercialization, portfolio, STTR, or event pathways. | Tech-transfer route family | decision prompt → process → proof → contact | Tables, forms, external links |
| Labs | `/labs/*` (3 routes) | Inspect a focused lab thesis and find a credible next step. | Lab collection and detail template | documentary opening → system view → practitioner note | Media crop and dense metadata |
| News | `/news/` plus 8 article routes | Read current work and move to conceptually related coverage. | Article collection, index, and reading template | deck → reading map → observation → source notes | Long-form reading, source/caption treatment |

## Required ledger fields

Each generated route must record:

- route path and rendered HTML file;
- route family, reader question, primary action, and early-stage action;
- shared template and section order;
- at least three visual modes;
- primary media role and media IDs;
- canonical, indexability, title, description, and primary heading status;
- responsive breakpoints and known risk;
- last audit date, owner, and accepted exceptions.

The JSON output is the source for CI counts and browser-test parameterization.
Keep editorial judgments in this document or the handoff, not in a hidden
script heuristic.
