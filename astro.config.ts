import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
