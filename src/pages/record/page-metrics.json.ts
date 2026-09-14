import { recordGraph, recordJourneys, recordStats, sitePageRecords } from '../../data/record';

export const prerender = true;

export function GET() {
  const families = [...new Set(sitePageRecords.map((entry) => entry.family))].map((family) => ({
    family,
    routes: sitePageRecords.filter((entry) => entry.family === family).length,
    indexable: sitePageRecords.filter((entry) => entry.family === family && entry.indexable).length,
  }));

  // Per-route connectivity rows: manifest-derived identity plus indegree over
  // the recorded journey-step edges. These are the only per-route measures
  // the build can state honestly. The route ledger
  // (`scripts/quality/route-ledger.mjs`) reads rendered `dist/` HTML, which
  // does not exist at build time, and its measurement fields belong to the
  // quality gate — so no ledger, SEO, keyword, or landmark figures are
  // promoted here. Next-action terminal edges are excluded from `inbound`,
  // matching the Top-inbound leaderboard on `/record/nav/`.
  const inbound = new Map<string, { count: number; journeys: Set<string> }>();
  for (const edge of recordGraph.edges) {
    const entry = inbound.get(edge.target) ?? { count: 0, journeys: new Set<string>() };
    entry.count += 1;
    entry.journeys.add(edge.journey);
    inbound.set(edge.target, entry);
  }
  const routes = sitePageRecords.map((entry) => ({
    path: entry.path,
    title: entry.title,
    family: entry.family,
    kind: entry.kind,
    indexable: entry.indexable,
    inbound: inbound.get(entry.path)?.count ?? 0,
    journeys: [...(inbound.get(entry.path)?.journeys ?? [])].sort(),
  }));

  return new Response(JSON.stringify({ ...recordStats, families, routes, journeyCount: recordJourneys.length }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
