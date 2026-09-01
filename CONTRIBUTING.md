# Contributing to instarlab.org

This repo is the source for [instarlab.org](https://www.instarlab.org), the
website of INSTAR Lab Inc., a real 501(c)(3) nonprofit research
institute. It is an **Astro v7 static-first site** with a typed shared shell
and a staged legacy-content bridge — please read this whole document before
opening a PR, since several of its conventions are easy to violate by
accident.

## Build and verification

Install Node 22.12+ and pnpm 11+, then run `pnpm install`.

- `pnpm run dev` starts Astro's development server.
- `pnpm run check` runs strict TypeScript 7 checking.
- `pnpm run build` creates the static `dist/` deployment output.
- `pnpm run verify` runs the build, route/link/sitemap/media audits, and
  mobile/desktop Playwright + Axe coverage.

`astro check` is not currently usable with TypeScript 7's native compiler
API; keep `pnpm run check` green until Astro supports it. The copied
`public/master.css` and legacy `css/`, `js/`, `fonts/`, and `img/` assets are
compatibility inputs for approved legacy content, not the authoring surface
for new routes.

## Shared chrome and routes

Astro owns navigation, skip links, SEO, and footer through
`src/layouts/SiteLayout.astro` and `src/components/chrome/`. Edit those
components once; do not duplicate chrome in route files. Migrated route
families use typed data in `src/data/` and pages under `src/pages/`.
The root `.html` files remain approved copy/media source for bridge
components and retain compatibility URLs where the route ledger specifies.

## Images are AVIF-only

All page imagery follows the layout
`img/pages/<page>/{hero,inline-N,card-N,section-N}.avif`. Never add a
new `.jpg`, `.jpeg`, `.png`, or `.webp` image reference — several past
commits in this repo's history exist solely to fix pages that ended
up pointing at missing JPGs. If you're adding imagery for a new page
or section, convert it to AVIF and follow the existing naming
pattern.

## This is a real nonprofit — don't fabricate facts

INSTAR Lab Inc. is a verified 501(c)(3) public charity
(170(b)(1)(A)(vi)). Do not invent EINs, financial figures,
credentials, partner names, statistics, or other factual claims when
writing or editing copy. If a claim needs a fact you can't verify
from existing site content or a linked/cited source, leave it out or
flag it in the PR rather than guessing.

## CSS

Tailwind 4 is integrated through `@tailwindcss/vite`. New styles belong in
`src/styles/tokens.css`, `src/styles/global.css`, or a component stylesheet.
The public legacy stylesheet is retained only for approved extracted HTML.
Do not hand-edit generated `dist/` output; use a scoped Astro component rule
when a legacy selector needs an accessibility or layout correction.

The `switcher/` theme switcher is **dormant** — its
`js/styleswitch.js` include is commented out on the homepage. Don't
wire it up unless a task explicitly asks for it.

## Structure

- Root compatibility pages retain `/about.html`, `/mission.html`,
  `/contact-us.html`, `/privacy.html`, `/terms.html`,
  `/accessibility.html`, and `/404.html`.
- Migrated content uses clean trailing-slash routes under `research/`,
  `sciences/`, `technology/`, `community/`, `tech-transfer/`, `labs/`,
  `news/`, and `fellowship/`.
- Shared Astro source lives in `src/components/`, `src/layouts/`,
  `src/styles/`, and `src/data/`; approved legacy assets are served from
  `public/`.
- `nav-preview.html` and `issue-triage.html`, if present locally, are
  **gitignored local-only mockups** — never treat them as production
  pages or commit them.

If you add a new page, add typed route metadata and make sure it is reachable
from the nav/footer when appropriate. Astro generates the sitemap during the
production build; run `pnpm run verify` instead of hand-editing generated
output.

## Forms and mail

Live, working forms on the site are plain JavaScript (for example the
site's own `contact-us.js`, `community/contact/intake.js`, and
`community/partner/partner-form.js`) — check the relevant page/form
directory for the current script before assuming a form's wiring.
GitHub Pages does not run PHP. Keep new submissions on the existing JSON
Logic App endpoints and preserve the form action/topic contracts documented
in the relevant source files.

## Deploy

This repo is **GitLab-first**, mirrored to GitHub Pages.
`.gitlab-ci.yml` includes the `DroidOpsInc/launch-sequence` pipeline
(`/pipelines/static-site.yml`, `SITE_DIR="."`,
`GITHUB_REPO="INSTARLab/Website"`), which publishes to GitHub. GitHub
Pages then serves the `gh-pages` branch at instarlab.org via `CNAME`.
Astro generates `sitemap-index.xml` and `sitemap-0.xml`; the production build
also publishes `sitemap.xml` as a conventional compatibility alias. Keep
`public/robots.txt` pointed at the generated sitemap index.

## Opening an issue or PR

- Use the issue templates under `.github/ISSUE_TEMPLATE/` — they
  enforce a Problem / Evidence / Acceptance-criteria format so
  reviewers (human or agent) have a concrete checklist to close
  against.
- Use the PR template under `.github/PULL_REQUEST_TEMPLATE.md` and
  work through its checklist (AVIF-first imagery, shared Astro chrome,
  no fabricated facts, route-ledger and `pnpm run verify`) before
  requesting review.
- Review is routed via `.github/CODEOWNERS`.

## Questions

If something in this document is unclear or seems out of date versus
what you find in the codebase, open an issue rather than guessing —
this file should track the site's actual conventions, not the other
way around.
