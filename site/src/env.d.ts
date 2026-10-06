/// <reference types="vite/client" />

// exsurge is aliased to its TypeScript sources in vite.config.ts. Importing it
// registers <chant-visual> and <chant-editor>. Its modules written for strict
// TypeScript (listening, the gabc model, the editor) are type-checked with the
// site; the rest of exsurge is not, so the drawing code is declared by hand.
declare module 'exsurge' {
  export * from 'exsurge/src/Exsurge.Audio';
  export * from 'exsurge/src/Exsurge.Follow';
  export * from 'exsurge/src/Exsurge.Model';
  export * from 'exsurge/src/Exsurge.Editor';
  /** SVG markup of the little picture of a sign, for the editor's buttons (Exsurge.Icons). */
  export function notationIcon(key: string): string | null;
}
