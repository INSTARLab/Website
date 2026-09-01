import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { siteOrigin } from './src/data/seo/site';

function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') return '/';

  const pathname = value.includes('://') ? new URL(value).pathname : value;
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

const basePath = normalizeBase(process.env.ASTRO_BASE);

export default defineConfig({
  site: siteOrigin,
  // GitLab project Pages is mounted at /Website/, while the custom domain
  // and local preview are mounted at /. The Pages job supplies ASTRO_BASE.
  base: basePath,
  output: 'static',
  trailingSlash: 'always',
  build: {
    // Clean directory URLs are the only supported public route policy.
    format: 'directory',
    // GitHub Pages/Jekyll can mishandle underscore-prefixed asset paths.
    assets: 'assets',
  },
  integrations: [
    sitemap({
      filter(page) {
        const pathname = new URL(page).pathname.replace(/\/+$/, '') || '/';
        const relativePath = basePath !== '/' && pathname.startsWith(basePath)
          ? pathname.slice(basePath.length - 1) || '/'
          : pathname;
        // Search is intentionally noindex and must not be advertised as a
        // crawl destination. Keep this filter beside the sitemap contract so
        // future noindex utility routes are considered at build time.
        return relativePath !== '/search';
      },
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
          url.pathname = `${url.pathname}/`;
        }
        return { ...item, url: url.href };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
