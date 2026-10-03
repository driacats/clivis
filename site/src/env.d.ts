/// <reference types="vite/client" />

// exsurge is aliased to its TypeScript sources in vite.config.ts; the site only
// imports it for its side effect (registering the <chant-visual> element).
declare module 'exsurge';
