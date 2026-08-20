# Search

The public search page lives at `/search/` and uses Pagefind 1.5.2. Astro
generates the static HTML first; `scripts/search/build-pagefind.mjs` then marks
editorial `<main>` elements and writes the browser index to `dist/pagefind/`.

## Build and index policy

`pnpm run build` runs `astro build` followed by `pnpm run build:search`.
Editorial routes are indexed from the built HTML. The search page, 404 page,
privacy policy, terms, and accessibility statement are deliberately excluded
as utility or legal noise. Navigation, footer, and form controls are skipped
by Pagefind’s normal HTML indexing behavior.

The page renders a browseable research index in server HTML. That list is the
no-JavaScript fallback: the search form remains semantic and usable, while
readers without JavaScript can still reach every indexed destination.

## Adding content safely

New editorial routes are included automatically when they produce a built HTML
page with a `<main>` element. Add newly introduced utility or legal routes to
the `excludedRoutes` set in `scripts/search/build-pagefind.mjs` before release.

Run the focused checks with:

```bash
pnpm run build:astro
pnpm run build:search
test -s dist/pagefind/pagefind.js
```

## 21st.dev-compatible component workflow

The search surface uses semantic HTML, the existing design tokens, and a small
Astro-scoped style block; it has no React or Svelte runtime dependency. If a
future 21st.dev reference is useful, port only its accessible interaction
pattern into `src/components/search/` and keep the behavior framework-free.
