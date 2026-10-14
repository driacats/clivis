import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { composeSite } from '../calendaria/compone';

// exsurge (the chant renderer) lives next to this repository as a sibling
// checkout: ../../exsurge. It is compiled from source, no build step needed.
const exsurgeSrc = fileURLToPath(new URL('../../exsurge/src/index.ts', import.meta.url));

/**
 * The liturgical calendar (calendaria/compone.ts), generated from the layers
 * in calendaria/ for the current year (or ANNUS): written into the build as
 * calendarium/…, served from memory by `npm run dev`. A mistake in a layer
 * stops the build with its message.
 */
function calendarium(): Plugin {
  return {
    name: 'calendarium',
    configureServer(server) {
      server.middlewares.use('/calendarium/', (req, res, next) => {
        const file = composeSite().get(decodeURIComponent((req.url ?? '').replace(/^\//, '').split('?')[0]));
        if (file === undefined) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(file);
      });
    },
    generateBundle() {
      for (const [path, source] of composeSite()) this.emitFile({ type: 'asset', fileName: `calendarium/${path}`, source });
    },
  };
}

export default defineConfig({
  plugins: [calendarium()],
  // relative base so the built site works from any folder (e.g. GitHub Pages)
  base: './',
  resolve: {
    alias: { exsurge: exsurgeSrc },
  },
  // exsurge's classes rely on the pre-ES2022 class field semantics
  esbuild: {
    tsconfigRaw: { compilerOptions: { useDefineForClassFields: false } },
  },
  server: {
    fs: { allow: ['..', '../../exsurge'] },
    // the review service (../server/revisione.mjs) in development, on its PORTA
    proxy: { '/api': `http://localhost:${process.env.PORTA ?? 3000}` },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        revisione: fileURLToPath(new URL('./revisione.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
