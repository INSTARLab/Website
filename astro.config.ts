import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') return '/';

  const pathname = value.includes('://') ? new URL(value).pathname : value;
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export default defineConfig({
  site: 'https://instarlab.org',
  // GitLab project Pages is mounted at /Website/, while the custom domain
  // and local preview are mounted at /. The Pages job supplies ASTRO_BASE.
  base: normalizeBase(process.env.ASTRO_BASE),
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
