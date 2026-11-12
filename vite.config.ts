import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * The browser gets `catalogs/locales.client.ts` (catalogs loaded on demand) instead of every
 * locale's catalog; the server and tests keep `catalogs/locales.ts`, which bundles them all.
 */
const lazyLocaleCatalogs: Plugin = {
  name: '1in8bn-lazy-locale-catalogs',
  enforce: 'pre',
  applyToEnvironment: (environment) => environment.name === 'client',
  resolveId(source, importer) {
    if (source === './catalogs/locales' && importer?.replace(/\\/g, '/').endsWith('/src/lib/i18n.ts')) return path.resolve(process.cwd(), 'src/lib/catalogs/locales.client.ts');
  },
};
export default defineConfig(() => {
  if (process.env.SITE_ID !== '1in8bn') throw new Error('Explicit SITE_ID=1in8bn is required');
  return {
    envDir: false as const,
    // Fonts stay separate files: inlined, 45 small subsets made the render-blocking stylesheet
    // ~160 KB compressed, and browsers only fetch the subsets a page actually uses.
    build: { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
    plugins: [lazyLocaleCatalogs, cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart({ server: { entry: './server.ts' }, client: { entry: './client.tsx' } }), react()],
  };
});
