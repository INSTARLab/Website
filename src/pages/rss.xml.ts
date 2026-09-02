import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { articlePath, publishedArticles } from '../data/articles';
import { siteOrigin } from '../data/seo/site';

export const prerender = true;

export async function GET(context: APIContext) {
  const articles = publishedArticles(await getCollection('articles', (entry: CollectionEntry<'articles'>) => !entry.data.draft && !entry.data.noindex));

  return rss({
    title: 'INSTAR Lab News',
    description: 'Research briefs, methods, and evidence from INSTAR Lab’s work in AI, quantum science, computing, health, energy, space, and the sciences.',
    site: context.site ?? new URL(`${siteOrigin}/`),
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishedAt,
      link: articlePath(article),
    })),
    customData: '<language>en-us</language>',
  });
}
