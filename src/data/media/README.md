# Editorial media pipeline

`src/data/media/` is the source of truth for media metadata that is safe to
render and safe to audit. `public-media-policy.json` covers the intentional
exact-URL assets currently rendered by the site. It does not claim provenance
that is not recorded in the repository.

## Add an Astro-processed asset

Keep a processable editorial image under `src/assets/`, import it in a route
or content entry, and create a typed record with `createAstroMedia()`:

```ts
import image from '../../assets/field-study.jpg';
import { createAstroMedia } from '../../utils/media/records';

const hero = createAstroMedia({
  id: 'media:research-field-study',
  image,
  type: 'photography-or-illustration',
  role: 'hero',
  alt: {
    kind: 'descriptive',
    status: 'approved',
    text: 'A researcher examines a field instrument beside a marked sample tray.',
  },
  sizes: '(min-width: 58rem) 54vw, 100vw',
  focalPoint: '58% 42%',
  provenance: {
    status: 'verified',
    source: 'INSTAR Lab field archive, 2026-08-20',
    license: 'INSTAR Lab internal editorial license',
  },
});
```

Render records with `EditorialMedia.astro`. It chooses `Picture` by default
for Astro imports, can opt down to `Image`, and uses a plain `<img>` for
`public/` URLs so exact URLs remain stable. Missing contextual alt text fails
the component at build time.

## Existing public assets

Public assets stay public when their URL is part of the current deployment
contract: logos, icons, verification files, and inherited image URLs. Use
`publicMediaFor('/img/banners/example.avif')` for a policy-backed record when a
route is migrated. Add a narrow policy before using a new public asset; do not
use a broad fallback that silently invents source or license information.

The current banner, 404, and home-field policies are marked
`provenance.status: "unverified"` because their original source and license
are not recorded. The media audit reports these as explicit exceptions with a
stable ID and next-step note rather than pretending that the provenance is
known. Replace those values with verified records when the media owner reviews
the assets.

Run:

```bash
pnpm run quality:media
pnpm run quality:media -- --strict
```

`--strict` fails on missing metadata, broken media, or unexplained reuse. The
report's `exceptions` array is intentionally non-blocking and lists inherited
public assets that still need provenance review or route-component adoption.
