/** Keep the first authored occurrence of an exact creative image per route. */
export function dedupeCreativeImages(markup: string): string {
  const seen = new Set<string>();

  return markup.replace(/<img\b[^>]*>/gi, (tag) => {
    const source = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!source) return tag;

    const key = source.split(/[?#]/, 1)[0].replace(/^\.\.\//, '/');
    if (seen.has(key)) return '';
    seen.add(key);
    return tag;
  });
}
