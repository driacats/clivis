/// <reference types="vite/client" />

// exsurge is aliased to its TypeScript sources in vite.config.ts. Importing it
// registers the <chant-visual> element; the declarations below cover what the
// site uses directly (its own sources are not type-checked with the site's
// stricter settings).
declare module 'exsurge' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Glyphs: any;

  export interface MelodyEvent {
    /** MIDI note number, or null for a rest (bar line). */
    pitch: number | null;
    /** Duration in beats (1 = an ordinary punctum). */
    beats: number;
  }
  export interface PlayOptions {
    secondsPerBeat?: number;
    onEnd?: () => void;
    onNote?: (index: number | null) => void;
    volume?: number;
  }
  export interface Follower {
    show(index: number | null): void;
    clear(): void;
  }
  export function parseGabcMelody(body: string): MelodyEvent[];
  export function splitEuouae(body: string): { main: string; euouae: string | null };
  export function melodyToMidi(events: MelodyEvent[], secondsPerBeat?: number): Uint8Array;
  export function playMelody(events: MelodyEvent[], options?: PlayOptions): () => void;
  export function stopMelody(): void;
  export function followScore(score: Element, offset?: number, total?: number): Follower;
}
