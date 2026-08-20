# Interaction and design-system contract

This site stays server-first and static on the `demo` baseline. The HTML
rendered by Astro is the complete reading and navigation experience; client
behavior is an enhancement with a documented fallback.

## ClientRouter behavior

`src/layouts/SiteLayout.astro` owns the cross-route contract:

- `#main-content` has `tabindex="-1"` so client-routed navigation can move focus
  to a meaningful landmark without adding it to the normal tab order.
- `astro:before-preparation` and `astro:after-swap` mark the main landmark as
  busy while the new document is being prepared.
- `astro:page-load` clears the busy state, focuses a hash target when one is
  present, or focuses `#main-content` after a client navigation.
- the initial page load does not steal focus from the skip link.
- the behavior is additive: disabling JavaScript leaves ordinary links, forms,
  fragments, and the static page structure intact.

The bundled layout script is installed once and listens to Astro lifecycle
events rather than relying on `DOMContentLoaded`, so interactive components
must use the same lifecycle when they need to reinitialize after navigation.

## Prefetch policy

Astro's built-in prefetching is deliberately limited at runtime:

- same-origin links in the site header opt into `data-astro-prefetch="hover"`;
- components may opt in a high-intent link with `data-prefetch-intent`;
- other same-origin links receive `data-astro-prefetch="false"` because
  speculative fetching is not valuable for every editorial link;
- explicit `data-astro-prefetch` values authored by a component are preserved;
- downloads, external links, new-window links, and same-document behavior are
  never treated as navigation prefetch candidates.

When adding a prominent next-step link, use the semantic `data-prefetch-intent`
attribute only if the destination is a likely next decision for the reader.
Do not add it to every card or footer link.

## Motion.dev interaction rules

`ResearchConstellation.astro` uses Motion's `hover()` and `press()` helpers for
the four pathway links. Hover nudges only the arrow; press gives the link a
small tactile scale response. Both are enhancement-only and are skipped when
`prefers-reduced-motion: reduce` matches. The CSS hover and focus states still
communicate the interaction without Motion, and the links remain ordinary
anchors.

All new interactions must:

1. communicate state, relationship, or navigation;
2. animate transform or opacity rather than layout geometry;
3. have a reduced-motion treatment;
4. remain usable by keyboard, touch, and no-JavaScript readers;
5. clean up on `astro:before-swap` and reinitialize on `astro:page-load`.

## Tailwind 4 primitives

`src/styles/tokens.css` is the CSS-first Tailwind theme contract. The
`--container-*`, `--spacing-touch`, timing, and chrome-offset tokens are
available to utilities and authored CSS. `global.css` adds only the small
semantic utilities that benefit from reuse:

- `focus-target` for route landmarks and fragment-safe scroll offsets;
- `reading-measure` for readable text blocks;
- `touch-target` for minimum interactive sizing.

Reusable components may use Tailwind's `@container` marker and container
variants. Route-specific editorial geometry remains in scoped Astro CSS so the
design system does not flatten authored page composition into utility markup.
