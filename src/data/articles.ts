import type { CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;
export type AuthorEntry = CollectionEntry<'authors'>;

export function articleSlug(article: ArticleEntry): string {
  return article.data.slug ?? article.id;
}

export function articlePath(article: ArticleEntry): string {
  return `/news/${articleSlug(article)}/`;
}

export function publishedArticles(articles: readonly ArticleEntry[]): ArticleEntry[] {
  return articles
    .filter((article) => !article.data.draft)
    .sort((left, right) => right.data.publishedAt.getTime() - left.data.publishedAt.getTime());
}

export function authorNames(
  article: ArticleEntry,
  authors: readonly AuthorEntry[],
): string[] {
  const names = new Map(authors.map((author) => [author.id, author.data.name]));
  return article.data.authors.map((authorReference) => {
    const authorId = typeof authorReference === 'string' ? authorReference : authorReference.id;
    return names.get(authorId) ?? authorId;
  });
}

export function relatedArticles(
  article: ArticleEntry,
  articles: readonly ArticleEntry[],
  limit = 3,
): ArticleEntry[] {
  const topics = new Set(article.data.topics.map((topic) => topic.toLocaleLowerCase()));

  return publishedArticles(articles)
    .filter((candidate) => candidate.id !== article.id)
    .map((candidate) => ({
      article: candidate,
      overlap: candidate.data.topics.reduce(
        (score, topic) => score + (topics.has(topic.toLocaleLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .sort((left, right) => right.overlap - left.overlap || right.article.data.publishedAt.getTime() - left.article.data.publishedAt.getTime())
    .slice(0, limit)
    .map(({ article: candidate }) => candidate);
}

export function readingTimeMinutes(article: ArticleEntry): number {
  const words = (article.body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function formatArticleDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(value);
}

export function articleIsoDate(value: Date): string {
  return value.toISOString();
}
