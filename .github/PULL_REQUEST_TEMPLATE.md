## What changed

<!-- Summarize the change. Which file(s)/page(s) does this touch? -->

## Why

<!-- Link the issue this closes, e.g. "Closes #123", and/or explain the motivation. -->

## Checklist

- [ ] No `.jpg`/`.jpeg`/`.png`/`.webp` image references were introduced — this site is AVIF-only (`img/pages/<page>/{hero,inline-N,card-N,section-N}.avif`).
- [ ] If nav or footer markup changed, it was propagated by hand to every affected `.html` file (there is no include/partial mechanism).
- [ ] No fabricated facts about INSTAR Lab (EINs, financial figures, credentials, partner names, statistics) were introduced.
- [ ] `sitemap.xml` was updated if this adds/removes/moves a page.
- [ ] Changes were verified by opening the affected page(s) directly (no test suite exists for this repo).
- [ ] If `css/`, `style.css`, or the site's own hand-authored `js/` files changed, `master.css` / `.min.js` siblings were regenerated per `scripts/build-css.sh` / `scripts/build-js.sh` where applicable.

## Notes for reviewers

<!-- Anything a reviewer should know: screenshots, pages to spot-check, deploy considerations (GitLab-first, mirrors to GitHub Pages via `gh-pages`). -->
