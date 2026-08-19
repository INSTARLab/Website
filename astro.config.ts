import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const legacyHtmlRoutes = new Set([
  '/about',
  '/accessibility',
  '/contact-us',
  '/mission',
  '/privacy',
  '/terms',
]);

export default defineConfig({
  site: 'https://instarlab.org',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // Preserve legacy .html pages and directory index pages in one build.
    format: 'preserve',
    // GitHub Pages/Jekyll can mishandle underscore-prefixed asset paths.
    assets: 'assets',
  },
  integrations: [
    sitemap({
      serialize(item) {
        const url = new URL(item.url);
        if (legacyHtmlRoutes.has(url.pathname)) {
          url.pathname = `${url.pathname}.html`;
        } else if (url.pathname !== '/' && !url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) {
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
