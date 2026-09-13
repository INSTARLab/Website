import { recordGraph } from '../../data/record';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(recordGraph), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
