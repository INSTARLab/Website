import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { articlePath, publishedArticles } from '../data/articles';

export const prerender = true;

export async function GET(context: APIContext) {
  const articles = publishedArticles(await getCollection('articles', ({ data }) => !data.draft && !data.noindex));

  return rss({
    title: 'INSTAR Lab News',
    description: 'Research briefs, methods, and public-benefit questions from INSTAR Lab.',
    site: context.site ?? new URL('https://instarlab.org/'),
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishedAt,
      link: articlePath(article),
    })),
    customData: '<language>en-us</language>',
  });
}
