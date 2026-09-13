import { recordMeta } from '../../data/record';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(recordMeta), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
