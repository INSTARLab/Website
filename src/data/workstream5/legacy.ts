import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dedupeCreativeImages } from '../../utils/legacy-markup';

const projectRoot = process.cwd();

/**
 * The legacy pages are the approved copy/media source for this migration.
 * This bridge is build-time only: it extracts the semantic main content,
 * drops the duplicated legacy chrome/scripts, and lets Astro own the document.
 */
export function legacyMainMarkup(sourceFile: string): string {
  const source = readFileSync(resolve(projectRoot, sourceFile), 'utf8');
  const mainMatch = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return '';

  return dedupeCreativeImages(mainMatch[1])
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/(?:\.\.\/)+img\//g, '/img/')
    .replace(/<h1(\s[^>]*)?>/i, '<h1 id="route-title"$1>')
    .replace(/<p class="form-messege"/gi, '<p class="form-messege" role="status" aria-live="polite"')
    .trim();
}

export function legacyRedirectMarkup(destination: `/${string}/`): string {
  return `<article class="w5-redirect" aria-labelledby="route-title">
    <p class="w5-kicker">Community</p>
    <h1 id="route-title">Research Fellowship</h1>
    <p>This page has moved. <a href="${destination}">Click here if you are not redirected automatically.</a></p>
  </article>`;
}
