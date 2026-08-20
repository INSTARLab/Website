# SEO and discovery contract

`src/components/seo/Seo.astro` is the single head-level SEO contract. It preserves the configured `https://instarlab.org` canonical URL and directory-style trailing slash policy, emits `noindex, nofollow` for routes that explicitly pass `noindex`, and links crawlers to the generated sitemap index.

The component emits one JSON-LD document containing:

- the factual INSTAR Lab `Organization` identity and public contact details;
- the `WebSite` entity and publisher relationship;
- a page-aware `WebPage` or `Article` entity;
- a `BreadcrumbList` for indexable nested routes;
- any caller-supplied JSON-LD nodes, without allowing a second `@context` to create an invalid document.

Dates, authors, sections, keywords, and social-image dimensions are optional. Add them only when the visible page has the corresponding verified information. The SEO component does not infer publication dates, authorship, ratings, reviews, FAQs, search actions, or social profiles.

`src/components/chrome/Breadcrumbs.astro` is the reusable accessible renderer for future route chrome. It accepts the same typed breadcrumb items used to generate structured data. It intentionally is not mounted globally: route composition owners should place it where the visual hierarchy and responsive treatment are appropriate.

Run the focused validation after a production build:

```bash
pnpm exec astro build
node --test tests/seo/structured-data.test.mjs
```
