# TypeScript quality contract

This project keeps TypeScript 7 and uses the compiler as the authoritative
static gate:

```sh
pnpm run check
```

That command is `tsc --noEmit` with Astro's strict base configuration. It is
deliberately separate from `@astrojs/check` until the Astro language tooling
publishes TypeScript 7-compatible peer metadata.

## Boundary types

Reusable data contracts live in `src/types/`:

- `editorial-contracts.ts` defines site paths, editorial families, visual
  modes, author records, content records, and media provenance.
- `json-ld.ts` defines the supported Schema.org graph nodes used by the
  publication: organizations, people, webpages, articles, images, and
  breadcrumbs.
- Runtime checks live in `src/utils/validation/guards.ts` and are re-exported
  from `src/utils/validation/index.ts`.

These contracts are intentionally independent of Astro components. Content
loaders, route manifests, API adapters, and future CMS integrations can adopt
them without importing presentation code.

## TypeScript conventions

Use `satisfies` for finite registries and configuration maps so literals retain
their narrow types while missing keys or invalid values fail at compile time.
Use discriminated unions (`kind`, `role`, or `family`) when branches have
different required fields. Prefer `readonly` data at module boundaries and
derive unions from `as const` registries rather than duplicating string lists.

Do not replace a runtime boundary check with a type assertion. Values loaded
from Markdown frontmatter, JSON, a CMS, or a JSON-LD script are `unknown`
until validated. Use the guards for those boundaries and keep validation
errors close to the input source.

## Static metadata validation

After a production build, run:

```sh
node scripts/quality/validate-dist-metadata.mjs --dist dist --origin https://www.instarlab.org
```

The validator deterministically checks every generated HTML document for a
title, description, canonical URL, robots directive, Open Graph/Twitter
metadata, and parseable JSON-LD when present. It reports the current absence
of JSON-LD as a warning while the site is being migrated. Once structured data
is emitted for every indexable route, make it blocking with:

```sh
node scripts/quality/validate-dist-metadata.mjs --dist dist --origin https://www.instarlab.org --require-jsonld --strict
```

The validator uses only Node's standard library and is safe to run against a
static artifact without a browser, network access, or a framework runtime.
