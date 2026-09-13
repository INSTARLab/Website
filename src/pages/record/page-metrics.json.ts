import { recordStats, sitePageRecords } from '../../data/record';

export const prerender = true;

export function GET() {
  const families = [...new Set(sitePageRecords.map((entry) => entry.family))].map((family) => ({
    family,
    routes: sitePageRecords.filter((entry) => entry.family === family).length,
    indexable: sitePageRecords.filter((entry) => entry.family === family && entry.indexable).length,
  }));

  return new Response(JSON.stringify({ ...recordStats, families }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
