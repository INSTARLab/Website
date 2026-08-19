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
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      authors: z.array(reference('authors')).min(1),
      topics: z.array(z.string().min(1)).default([]),
      hero: z
        .object({
          src: image(),
          alt: z.string().min(1),
          caption: z.string().min(1).optional(),
          credit: z.string().min(1).optional(),
          focalPoint: z.string().min(1).optional(),
        })
        .optional(),
      canonicalUrl: z.string().url().optional(),
      noindex: z.boolean().default(false),
    }),
});

export const collections = { articles, authors };
