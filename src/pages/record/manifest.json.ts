import { recordMeta, recordRoutes } from '../../data/record';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify({ ...recordMeta, routes: recordRoutes }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
