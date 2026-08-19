# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The instarlab.org website: an **Astro v7 static-first site** for INSTAR Lab,
a real 501(c)(3) nonprofit. The migrated shell uses TypeScript 7, Tailwind 4
through Vite, Motion, and Three.js; approved legacy HTML remains the content
source for the staged route families. Use pnpm and the production build in
`dist/` as the deployment surface.

## Critical conventions (get these wrong and you break the live site)

- **Astro owns shared chrome.** Edit `src/components/chrome/` and
  `src/layouts/SiteLayout.astro` for navigation, skip links, SEO, and footer
  changes. Legacy root HTML is read at build time through explicit bridge
  components; do not add a second hand-authored header or footer.
- **Images are AVIF-only.** Layout is `img/pages/<page>/{hero,inline-N,card-N,section-N}.avif`. Never introduce `.jpg`/`.jpeg`/`.png`/`.webp` image references — multiple past commits exist solely to fix pages pointing at missing JPGs.
- **Real nonprofit — never fabricate facts.** Do not invent EINs, financial figures, credentials, partner names, or statistics in generated content. INSTAR Lab is a verified 501(c)(3) public charity (170(b)(1)(A)(vi)); correct any site claim that says otherwise.

## CSS

Tailwind 4 is configured through `@tailwindcss/vite`; new design-system CSS
belongs in `src/styles/tokens.css` and `src/styles/global.css`. The copied
`public/master.css` and legacy assets are a deliberate compatibility layer for
approved `set:html` content. Do not add new pages that depend on its vendor
selectors.

The `switcher/` theme switcher is **dormant** — its `js/styleswitch.js` include is commented out in `index.html`. Don't wire it up unless asked.

## Structure

Astro routes live under `src/pages/`, with typed data under `src/data/` and
shared UI in `src/components/`. Root compatibility pages preserve
`/about.html`, `/mission.html`, `/contact-us.html`, `/privacy.html`,
`/terms.html`, `/accessibility.html`, and `/404.html`. Migrated section pages
use clean trailing-slash paths: `research/`, `sciences/`, `technology/`,
`community/`, `tech-transfer/`, `labs/`, `news/`, and `fellowship/`. Approved
legacy assets are copied to `public/` for the static build.

`nav-preview.html` and `issue-triage.html` are **gitignored local-only mockups** — not live pages. Do not treat them as production.

## Forms / mail

All live forms POST as JSON to the shared Tao Learning `door.taolearning.org` Logic App endpoint, distinguished by a `topic` field — not PHP (GitHub Pages can't run PHP): `contact-us.js`, `js/newsletter.js`, `community/contact/intake.js`, `community/partner/partner-form.js`, and the inline handler in `fellowship/index.html`. The old orphaned `mail.php` mailer and the old direct Azure Logic Apps SAS-signed URLs were both removed (gh#249, gh#269) — don't reintroduce a PHP-based form handler or a raw Logic Apps URL in client JS.

## Deploy

Static GitHub Pages site with microservices via Azure Logic Apps for dynamic-region functionality (see Forms/mail above). GitLab-first, gated in stages:

1. Work lands on GitLab (`git.developerdojo.org/INSTARLab/Website`) `demo` branch — the safe staging gate. Pushing here does not go live.
2. `demo` gets a GitLab merge request over to `gh-pages` — this is the production-promotion step.
3. `gh-pages` is automatically push-mirrored from GitLab to GitHub (`INSTARLab/Website`).
4. `.gitlab-ci.yml` includes `DroidOpsInc/launch-sequence` (`/pipelines/static-site.yml`, `SITE_DIR="."`, `GITHUB_REPO="INSTARLab/Website"`); GitHub Pages serves the `gh-pages` branch at instarlab.org via `CNAME`.

Astro generates `sitemap-index.xml` and route metadata during `pnpm run build`;
do not hand-edit generated output. Keep `public/robots.txt` aligned with the
generated sitemap and run `pnpm run verify` before deployment. The root legacy
HTML files remain source content for the migration and should not be removed
without an explicit URL-compatibility decision.

## Local workflow

Use `pnpm install`, `pnpm run dev`, `pnpm run check`, and `pnpm run verify`.
`astro check` is currently unavailable with TypeScript 7's compiler API, so
the enforced type gate is strict `tsc --noEmit` until Astro adds support.
