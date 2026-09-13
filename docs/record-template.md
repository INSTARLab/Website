# Record room template contract

The `/record/` document shell is based on the official Bootstrap 5 Dashboard and
Sidebar examples, adapted to keep INSTAR Lab's existing typefaces and palette.
Bootstrap is pinned to `5.3.8` in `package.json` so the shell has a reviewable,
repeatable dependency contract. This is a 2026 adaptation of the official
examples, using the Bootstrap release published on August 25, 2025; it is not
represented as a template first released in 2026.

Official references:

- [Bootstrap Dashboard example](https://getbootstrap.com/docs/5.3/examples/dashboard/)
- [Bootstrap Sidebars example](https://getbootstrap.com/docs/5.3/examples/sidebars/)
- [Bootstrap grid and containers](https://getbootstrap.com/docs/5.3/layout/grid/)
- [Bootstrap offcanvas component](https://getbootstrap.com/docs/5.3/components/offcanvas/)
- [Bootstrap 5.3.8 release notes](https://blog.getbootstrap.com/2025/08/25/bootstrap-5-3-8/)

Bootstrap is distributed under the MIT License. See the [official license
file](https://github.com/twbs/bootstrap/blob/main/LICENSE) for the complete
notice.

## Shell rules

- `RecordLayout.astro` is a complete HTML document that renders `Seo` and
  `SkipLink` but deliberately does not import `SiteLayout`, `SiteHeader`,
  `SiteFooter`, `global.css`, Tailwind, or `ClientRouter`.
- `RecordDocument.astro` preserves the existing `{ route: RecordRoute }` prop
  contract used by every `/record/` page.
- The sidebar is the only Record navigation. At `>= 992px` it is a 16rem,
  full-height sticky rail. Below that breakpoint, JavaScript enhances the same
  links into an offcanvas panel. Without JavaScript, the links stay visible in
  document flow.
- Main content uses 32px desktop padding, 24px tablet padding, and 16px mobile
  padding. The existing record component classes remain available to route
  workers and are loaded after Bootstrap so they can express the established
  Record presentation.
- Navigation remains ordinary document navigation. Links work with JavaScript
  disabled and the Record shell does not opt into the marketing site's
  client-router behavior.
