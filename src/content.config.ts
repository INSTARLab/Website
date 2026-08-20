import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string().min(1),
    role: z.string().min(1).optional(),
    bio: z.string().min(1).optional(),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: () =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      authors: z.array(reference('authors')).min(1),
      topics: z.array(z.string().min(1)).default([]),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
      hero: z
        .object({
          src: z.string().min(1),
          alt: z.string().min(1),
          caption: z.string().min(1).optional(),
          credit: z.string().min(1).optional(),
          focalPoint: z.string().min(1).optional(),
        })
        .optional(),
      readingMap: z
        .array(
          z.object({
            label: z.string().min(1),
            summary: z.string().min(1),
            anchor: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
          }),
        )
        .default([]),
      takeaways: z.array(z.string().min(1)).default([]),
      limitations: z.array(z.string().min(1)).default([]),
      sources: z
        .array(
          z.object({
            label: z.string().min(1),
            url: z.string().url(),
            publisher: z.string().min(1).optional(),
            accessedAt: z.coerce.date().optional(),
          }),
        )
        .default([]),
      canonicalUrl: z.string().url().optional(),
      noindex: z.boolean().default(false),
    }),
});

export const collections = { articles, authors };
