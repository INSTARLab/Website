import type { MediaId } from '../../data/media/types';

export function normalizeMediaUrl(value: string): string {
  const withoutFragment = value.split('#', 1)[0] ?? value;
  const withoutQuery = withoutFragment.split('?', 1)[0] ?? withoutFragment;
  if (/^https?:\/\//i.test(withoutQuery)) return withoutQuery;
  const path = withoutQuery.replace(/^\.\//, '').replace(/^dist\//, '/');
  return path.startsWith('/') ? path : `/${path}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stableMediaId(sourceUrl: string, prefix = 'media:'): MediaId {
  const normalized = normalizeMediaUrl(sourceUrl);
  const basename = normalized.split('/').filter(Boolean).at(-1) ?? 'asset';
  const safePrefix = prefix.endsWith('-') || prefix.endsWith(':') ? prefix : `${prefix}-`;
  return `${safePrefix}${slug(basename)}` as MediaId;
}
