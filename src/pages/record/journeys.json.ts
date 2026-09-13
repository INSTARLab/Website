import { recordJourneys } from '../../data/record';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(recordJourneys), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
