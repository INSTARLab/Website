# Astro foundation

This migration foundation is intentionally static-first. Existing root HTML
and directory URLs remain the source of truth while the remaining routes move
into `src/pages/`.

## Verified package choices

The package versions below were checked against the npm registry on 2026-08-19
and are pinned by `pnpm-lock.yaml` after installation:

- Astro `7.2.4` with its Vite 8 toolchain
- Vite `8.2.1`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3` with `@tailwindcss/vite` `4.3.3`
- `@astrojs/sitemap` `3.7.3`
- Motion `13.1.0` (`motion`)
- Three.js `0.185.1` (`three`)

Tailwind 4 uses the official `@tailwindcss/vite` plugin. The deprecated
`@astrojs/tailwind` integration is deliberately not installed. The current
`@astrojs/check` release declares TypeScript 5/6 peers, so this foundation
keeps the requested TypeScript 7 and uses `tsc --noEmit` plus `astro build`
until the check package publishes TypeScript 7-compatible peer metadata.

21st.dev is treated as a component reference/registry rather than a runtime
dependency. Future components can be ported into `src/components/` only when
they provide a concrete reader benefit and meet this project’s semantic,
keyboard, reduced-motion, and no-JavaScript requirements.

## URL and deployment policy

`astro.config.ts` uses `build.format: 'preserve'`. This lets Astro keep both
legacy root files (`src/pages/about.html.astro` → `/about.html`) and clean
directory routes (`src/pages/community/about-us/index.astro` →
`/community/about-us/index.html`). `site` is set to `https://instarlab.org`;
there is no subpath `base`.

Astro-generated CSS and JavaScript use `dist/assets/` instead of the default
`dist/_astro/`, avoiding GitHub Pages/Jekyll underscore-path behavior. The
deployment copies in `public/` keep `CNAME`, `.nojekyll`, and `robots.txt`
available in a future `dist/` deployment. The original root `CNAME`, sitemap,
and robots files remain untouched during this foundation pass.

## Source organization

- `src/pages/` — file-based routes; existing route work remains untouched.
- `src/content.config.ts` — strict build-time article and author collections.
- `src/content/articles/` and `src/content/authors/` — future content entries.
- `src/data/` — typed route and editorial data; media assignments belong here.
- `src/styles/global.css` — Tailwind 4 entrypoint, tokens, and accessibility base.
- `public/` — exact-URL deployment files that should bypass Astro processing.
- `pnpm-workspace.yaml` — pnpm’s repository policy, including the explicit
  `esbuild` build-script allowlist required by this environment.

No route or shared UI component is introduced by the foundation workstream.
