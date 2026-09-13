import { recordBi } from '../../data/record-bi';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(recordBi), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
