import { recordCaptureSummary, recordMeta } from '../../data/record';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify({ ...recordMeta, capture: recordCaptureSummary }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
