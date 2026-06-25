# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The instarlab.org website: a **hand-authored static HTML/CSS/JS site** for INSTAR Lab, a real 501(c)(3) nonprofit. Old jQuery/Bootstrap template (Owl Carousel, Nivo Slider, MeanMenu, Magnific Popup, WOW.js). **No build system** — no package.json, no bundler, no task runner. Pages are raw `.html` edited by hand. No linters, formatters, or tests.

## Critical conventions (get these wrong and you break the live site)

- **Nav and footer are duplicated, inline, in every HTML file.** There is no include/partial/template mechanism and `main.js` does not inject them. Any nav or footer change must be propagated by hand across all ~63 `.html` files. Use `/propagate-nav` for this.
- **Images are AVIF-only.** Layout is `img/pages/<page>/{hero,inline-N,card-N,section-N}.avif`. Never introduce `.jpg`/`.jpeg`/`.png`/`.webp` image references — multiple past commits exist solely to fix pages pointing at missing JPGs.
- **Real nonprofit — never fabricate facts.** Do not invent EINs, financial figures, credentials, partner names, or statistics in generated content. INSTAR Lab is a verified 501(c)(3) public charity (170(b)(1)(A)(vi)); correct any site claim that says otherwise.

## CSS

`master.css` (repo root) is the single entry point — pages link it relatively (`href="master.css"` at root, `href="../../master.css"` two levels deep). It `@import`s the 13 `css/` stylesheets plus root `style.css` in a fixed order. `style.css` (root) = site-specific overrides; `css/main.css` = template base. Edit `style.css` for site overrides, not the vendored `css/` files.

The `switcher/` theme switcher is **dormant** — its `js/styleswitch.js` include is commented out in `index.html`. Don't wire it up unless asked.

## Structure

Root pages: `index`, `about`, `mission`, `contact-us`, `privacy`, `terms`, `accessibility`, `404`. Sectioned content uses clean-URL dirs (`<topic>/index.html`): `sciences/` (22 disciplines), `technology/` (7), `research/` (7), `community/`, `tech-transfer/`, `labs/`, `news/`, `fellowship/`. Assets: `css/`, `js/`, `fonts/`, `switcher/`, `img/`.

`nav-preview.html` and `issue-triage.html` are **gitignored local-only mockups** — not live pages. Do not treat them as production.

## Forms / mail

`mail.php` is a PHP contact mailer but **PHP does not run on GitHub Pages**, so it is dead on the live deploy. Live forms use JS: `js/ajax-mail.js`, `community/contact/intake.js`, `community/partner/partner-form.js`.

## Deploy

GitLab-first → mirror to GitHub Pages. `.gitlab-ci.yml` includes `DroidOpsInc/launch-sequence` (`/pipelines/static-site.yml`, `SITE_DIR="."`, `GITHUB_REPO="INSTARLab/Website"`); the pipeline publishes to GitHub, which serves the `gh-pages` branch at instarlab.org via `CNAME`. `sitemap.xml` and `robots.txt` are hand-maintained — update `sitemap.xml` when adding pages.
