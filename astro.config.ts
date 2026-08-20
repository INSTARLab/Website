import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://instarlab.org',
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
