# Package scripts in use

The Astro package foundation is now checked in with pnpm and a frozen
lockfile. The current scripts are the quality contract for local development
and CI:

```json
{
  "scripts": {
    "check": "tsc --noEmit",
    "build": "astro build",
    "quality:routes": "node scripts/quality/route-ledger.mjs --dist dist --strict",
    "quality:media": "node scripts/quality/media-audit.mjs --dist dist",
    "quality:links": "node scripts/quality/check-dist-links.mjs --dist dist",
    "quality:sitemap": "node scripts/quality/check-dist-sitemap.mjs --dist dist --origin https://instarlab.org",
    "quality:browser": "pnpm run test:browser",
    "verify": "pnpm run check && pnpm run build && pnpm run quality:routes && pnpm run quality:media && pnpm run quality:links && pnpm run quality:sitemap && pnpm run quality:browser"
  }
}
```

`pnpm run check` intentionally uses strict TypeScript 7 compiler checking.
Astro's checker is not used until its programmatic API supports TypeScript 7.
The media audit is currently non-strict because the legacy bridge still emits
metadata warnings; it already fails on missing media or missing alt decisions.

The package pins Astro 7.2.4, TypeScript 7.0.2, Tailwind 4.3.3, Motion
13.1.0, Three.js 0.185.1, the 21st.dev CLI 1.15.1, and the current browser
quality packages in `pnpm-lock.yaml`. Refresh versions together with the
lockfile rather than editing this note independently.
