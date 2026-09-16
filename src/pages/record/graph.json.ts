import { recordGraph } from '../../data/record';

export const prerender = true;

// RRP-203 versioning contract: this endpoint emits the compatibility payload
// (schemaVersion 1: inventory nodes plus journey-step edges) for the existing
// consumers that read those keys. `pnpm run build:link-graph`
// (`scripts/quality/build-link-graph.mjs`, last step of `pnpm run build`)
// merges the observed actual-link graph beside them as `linkGraph` and bumps
// the envelope to schemaVersion 2 — never by editing this endpoint, so a
// plain `astro build` can never silently change a served meaning.
export function GET() {
  return new Response(JSON.stringify(recordGraph), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
