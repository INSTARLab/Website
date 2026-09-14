# INSTAR Lab Website

The public website for [INSTAR Lab](https://www.instarlab.org) (INSTAR Lab Inc.,
a 501(c)(3) nonprofit research institute): an **Astro v7 static-first site**
with TypeScript, Tailwind CSS 4 (via Vite), and Pagefind client-side search.

## Local workflow

Requires Node >= 22.12 and pnpm >= 12.4.1.

```sh
pnpm install      # install dependencies
pnpm run dev      # local dev server
pnpm run check    # strict tsc --noEmit (the enforced type gate)
pnpm run verify   # full gate: types, unit tests, build, route/link/sitemap/
                  # media/provenance/base checks, then Playwright e2e
```

`astro check` is unavailable under the TypeScript 7 compiler API, so `tsc
--noEmit` is the type gate until Astro adds support. Never run production
builds as a substitute for CI; the pipeline builds with BuildKit on K8s.

## Deploy

GitLab-first, in stages:

1. Work lands on the GitLab `demo` branch
   (`git.developerdojo.org/INSTARLab/Website`) — the staging gate.
2. `demo` merges to `gh-pages` — the production-promotion step.
3. `gh-pages` is push-mirrored to GitHub (`INSTARLab/Website`), which serves
   the site at instarlab.org via `CNAME`.

Astro generates `sitemap-index.xml` and route metadata during `pnpm run
build`; do not hand-edit generated output. Keep `public/robots.txt` aligned
with the generated sitemap.

## Conventions

- **Shared chrome lives in Astro.** Navigation, skip links, SEO, and footer
  changes go in `src/components/chrome/` and `src/layouts/SiteLayout.astro`.
  Never hand-author a second header or footer.
- **Images are AVIF-only** (`img/pages/<page>/...avif`). Never introduce
  `.jpg`/`.jpeg`/`.png`/`.webp` references. Open Graph tags intentionally
  reuse the per-page AVIF heroes with explicit dimensions (see `Seo.astro`).
- **Real facts only.** INSTAR Lab is a verified 501(c)(3) public charity
  (IRC 170(b)(1)(A)(vi)), EIN 85-0845517. Never invent EINs, financial
  figures, credentials, partner names, UEI/CAGE identifiers, or statistics.
  Unverifiable identifiers stay out of the public site.
- **Org facts are single-sourced** in `src/data/seo/site.ts`
  (`siteIdentity`) and consumed by the SEO component and footer — correct a
  fact once, not per page.
- **Contact is mailto/tel.** No live intake forms or third-party form
  endpoints exist in `src/`; the footer newsletter panel falls back to an
  email link until a signup endpoint is configured.
- **Content security.** Every page ships a same-origin CSP meta tag plus a
  referrer policy from `src/components/seo/Seo.astro`. The build has zero
  external scripts, stylesheets, fonts, or fetch targets — keep it that way,
  or widen the policy explicitly with a comment.
