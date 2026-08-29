# CI quality gates

The repository is GitLab-first and is mirrored to GitHub Pages. GitLab
`gh-pages` is the release authority: CI builds and validates the generated
`dist/` artifact there, and the mirror publishes that artifact rather than
the source checkout.

## Migration pipeline shape

Run the quality job alongside the existing include. The route, link, sitemap,
and browser gates are blocking; the media audit remains non-strict while
legacy metadata warnings are enriched.

```yaml
astro:quality:
  stage: .pre
  image: node:22
  needs: []
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm run verify
  artifacts:
    when: always
    expire_in: 30 days
    paths:
      - artifacts/quality/
      - artifacts/playwright-report/
      - test-results/
```

Install Chromium in the CI image before `pnpm run verify` (for example,
`pnpm exec playwright install chromium`). If the included pipeline does not
expose `.pre`, use its documented quality stage rather than guessing at the
stage list.

## Gates and ownership

- Route ledger: build coverage, unique route paths, metadata, canonical URLs,
  and indexability. Owner: route/content migration lead.
- Media audit: local output existence, alt decisions, intrinsic dimensions,
  provenance, license, and intentional reuse. Owner: editorial/media lead.
- Dist links: internal links, `src` references, form actions, and fragments.
  Owner: route migration lead.
- Dist sitemap: generated sitemap versus indexable rendered routes, including
  sitemap index files and duplicates. Owner: SEO/deployment lead.
- Browser/Axe tests: route smoke, title/h1, overflow, keyboard focus, and
  WCAG 2.2 AA automation at mobile and desktop viewports. Owner: QA lead.

## Deployment checks

Before promoting to the GitHub Pages mirror, verify the canonical domain and
the actual CDN responses. If Astro uses an assets directory beginning with an
underscore, configure a non-underscore build asset directory and ship the
deployment's `.nojekyll` marker according to the deployment owner’s plan.
Assert that CSS returns `200` with `text/css`, media requests do not fail, and
the browser console has no MIME-type errors. A matching commit SHA is not
proof that the CDN has served the new asset paths.

The `mirror` job runs only for the GitLab `gh-pages` pipeline. It confirms that
the authoritative GitLab ref still equals the pipeline SHA, clones the
existing GitHub `gh-pages` history, replaces that worktree with `dist/`, and
compares file manifests before committing. It rechecks both remotes and uses a
normal fast-forward push, so a concurrent GitHub update or GitLab promotion
fails closed. GitLab and GitHub commit IDs intentionally differ because the
GitHub commit contains the generated artifact.

## Required browser matrix

Run Chromium at approximately 390px and 1440px in CI. Review the production
build manually at 320px, 768px, 1280px, 1920px, 200% zoom, keyboard-only,
reduced-motion, and forced-colors where supported. Keep screenshots and the
route contact sheet in CI artifacts, not in `src/`.
