import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// exsurge (the chant renderer) lives next to this repository as a sibling
// checkout: ../../exsurge. It is compiled from source, no build step needed.
const exsurgeSrc = fileURLToPath(new URL('../../exsurge/src/index.ts', import.meta.url));

export default defineConfig({
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
    // the review service (../server/revisione.mjs) in development
    proxy: { '/api': 'http://localhost:3000' },
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
