# Astro foundation

This site is static-first and Astro-owned. The production artifact is built
from `src/pages/`, typed manifests, content collections, and shared Astro
components; the former root HTML/CSS/JS corpus is not part of the site.

## Verified package choices

The package versions below were checked against the npm registry on 2026-08-20
with `pnpm outdated` returning no pending updates, and are pinned by
`pnpm-lock.yaml`:

- Astro `7.2.4` with its Vite 8 toolchain
- Vite `8.2.1`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3` with `@tailwindcss/vite` `4.3.3`
- `@astrojs/sitemap` `3.7.3`
- `@astrojs/check` `0.9.10` (installed for the v7 toolchain; see the TypeScript 7 note below)
- Motion `13.1.0` (`motion`)
- Three.js `0.185.1` (`three`)

Tailwind 4 uses the official `@tailwindcss/vite` plugin. The deprecated
`@astrojs/tailwind` integration is deliberately not installed. The current
`@astrojs/check` release declares TypeScript 5/6 peers, so this foundation
keeps the requested TypeScript 7 and uses `tsc --noEmit` plus `astro build`
until the check package publishes TypeScript 7-compatible peer metadata.

21st.dev is treated as a component reference/registry rather than a runtime
dependency. The `@21st-dev/cli` `1.15.1` dev dependency and `.21st/` design
context make the registry available to the team; future components can be
ported into `src/components/` only when they provide a concrete reader benefit
and meet this project’s semantic, keyboard, reduced-motion, and no-JavaScript
requirements. Component retrieval requires a developer’s own 21st login or
token and is not performed during builds.

TypeScript 7 is intentionally retained. The current `@astrojs/check` language
server refuses TypeScript 7 because the native compiler no longer exposes the
programmatic API that `astro check` expects. `pnpm run check` therefore uses
TypeScript’s strict `tsc --noEmit` gate; keep `astro check` in the upgrade
matrix and re-enable it when the Astro language server supports TypeScript 7.

## URL and deployment policy

`astro.config.ts` uses `build.format: 'directory'` with
`trailingSlash: 'always'`. Astro therefore emits clean directory URLs such as
`/about/` and `/research/current-programs/`; the special static 404 document is
the only root `.html` output required by the host. `site` is set to
`https://instarlab.org`; there is no subpath `base`.

Astro-generated CSS and JavaScript use `dist/assets/` instead of the default
`dist/_astro/`, avoiding GitHub Pages/Jekyll underscore-path behavior. The
deployment copies in `public/` keep `CNAME`, `.nojekyll`, `robots.txt`, and
`llms.txt` available in both GitLab Pages and a future GitHub Pages publish.
The generated sitemap integration uses `sitemap-index.xml` and
`sitemap-0.xml`; `public/robots.txt` points to that index.

Route workstreams use nested `index.astro` files for clean directory URLs and
typed route keys rather than filesystem-era filenames. The route ledger and
production quality checks enforce the same policy.

## Source organization

- `src/pages/` — file-based Astro routes.
- `src/content.config.ts` — strict build-time article and author collections.
- `src/content/articles/` and `src/content/authors/` — future content entries.
- `src/data/` — typed route and editorial data; media assignments belong here.
- `src/styles/global.css` — Tailwind 4 entrypoint, tokens, and accessibility base.
- `public/` — exact-URL deployment files that should bypass Astro processing,
  including `.nojekyll`, `CNAME`, `robots.txt`, `llms.txt`, and media assets.
- `pnpm-workspace.yaml` — pnpm’s repository policy, including the explicit
  `esbuild` build-script allowlist required by this environment.

Route workstreams now build on this foundation through `SiteLayout`, typed
route manifests, and the shared chrome/primitives components.
