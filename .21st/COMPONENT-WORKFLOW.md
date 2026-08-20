# 21st.dev component workflow for INSTAR Lab

21st.dev is a source registry and design reference for this project, not a
runtime framework. Every copied component must be adapted into an Astro-owned
component before it is considered complete.

## Before copying

1. State the reader task the component improves and the route family where it
   belongs.
2. Confirm that semantic HTML and CSS cannot already solve the task.
3. Check the current tokens in `src/styles/tokens.css` and the primitives in
   `src/components/primitives/` before introducing a new pattern.
4. Confirm that the component can render useful HTML without client JavaScript.
5. Record the source URL and license/provenance in the implementation note.

## Astro-native adaptation

- Prefer `.astro` components with typed props and slots.
- Keep page copy and editorial data in Astro content collections or typed data
  modules, not inside a client-rendered component.
- Remove React, Next, router, and browser-only assumptions unless a concrete
  interactive requirement justifies an island.
- Use the least eager hydration directive: `client:visible`, `client:idle`, or
  `client:load` only when the interaction needs it immediately.
- Keep a no-JavaScript fallback for every interactive or visual component.
- Reinitialize page-scoped behavior on Astro's documented client-navigation
  lifecycle when `<ClientRouter />` is present.
- Do not ship a component that requires a new UI framework or a global store
  for static editorial content.

## Accessible by construction

- Use native controls before ARIA widgets; preserve keyboard behavior and
  visible focus.
- Give every control an accessible name and every meaningful image a useful
  alt decision. Decorative images use `alt=""`.
- Preserve heading order, landmarks, reduced-motion behavior, forced-colors
  resilience, and 200%/400% reflow.
- Provide a semantic alternative for diagrams, WebGL, animation, and other
  non-text experiences.
- Test the copied component at narrow mobile and desktop widths, keyboard-only,
  reduced motion, and with JavaScript disabled.

## Tailwind CSS 4 compatibility

- Use the existing CSS-first `@theme` tokens; do not add a legacy
  `tailwind.config.js` just to consume a copied component.
- Prefer semantic utilities and existing project tokens over arbitrary values.
- Use container queries for component-local responsive behavior when the
  component is placed in different editorial grids.
- Keep component styles scoped or colocated; avoid global selectors and
  specificity escalation.
- Do not mix Tailwind sizing utilities with Astro responsive image styles
  without choosing one system as the owner of image sizing.
- Keep class strings readable. If a pattern repeats, create a small semantic
  Astro primitive rather than copying a long utility string across routes.

## Motion and performance

Motion is progressive enhancement. Animate opacity, transform, or other
compositor-friendly properties; never block reading or hijack scrolling. Honor
`prefers-reduced-motion` in both CSS and JavaScript, and keep below-the-fold
visualizations lazy. Measure the route impact before accepting a new client
bundle.

## Acceptance checklist

- [ ] The component has a documented reader benefit and route owner.
- [ ] The source/provenance is recorded.
- [ ] Props use strict TypeScript types; finite maps use `satisfies`.
- [ ] The default output is semantic and useful without JavaScript.
- [ ] Keyboard, focus, screen-reader name, reduced-motion, and reflow behavior
      are verified.
- [ ] Tailwind 4 tokens/utilities are used without a legacy config.
- [ ] Any island uses the least eager justified `client:*` directive.
- [ ] The production build, route checks, and browser quality suite pass.
