// Psalm-tone intonation: how to sing the first verse of the psalm after an
// antiphon. The first half of the verse (intonation, reciting note, mediant)
// comes from the eight tones printed in the libretto ("Toni dei salmi",
// Lodi complete pp. 303-308); the second half is the antiphon's own EUOUAE,
// which is exactly the termination ("differentia") to use with it.

import { parseGabcMelody, splitEuouae, type MelodyEvent } from 'exsurge';

interface Tone {
  clef: string;
  intonation: string[];
  tenor: string;
  mediant: string[];
}

/** First half of each tone as printed in the libretto ("…sic incípitur … et sic mediátur"). */
const TONES: Record<string, Tone> = {
  '1': { clef: 'c4', intonation: ['f', 'g', 'h'], tenor: 'h', mediant: ['ixi', 'h', 'g', 'h'] },
  '2': { clef: 'f3', intonation: ['e', 'f'], tenor: 'h', mediant: ['i', 'h'] },
  '3': { clef: 'c4', intonation: ['g', 'h'], tenor: 'i', mediant: ['k', 'j', 'i', 'h', 'j'] },
  '4': { clef: 'c4', intonation: ['e', 'g'], tenor: 'h', mediant: ['g', 'h', 'i', 'h'] },
  '5': { clef: 'c4', intonation: ['f', 'h'], tenor: 'j', mediant: ['k', 'j'] },
  '6': { clef: 'c4', intonation: ['f', 'g'], tenor: 'h', mediant: ['ixi', 'h', 'g', 'h'] },
  '7': { clef: 'c4', intonation: ['j', 'i', 'j'], tenor: 'k', mediant: ['m', 'l', 'k', 'l'] },
  '8': { clef: 'c4', intonation: ['g', 'h'], tenor: 'j', mediant: ['k', 'j'] },
};

const RECITING_NOTES = 4;

/**
 * The melody of a model first verse for an antiphon (gabc body + its mode), or
 * null when the tone can't be determined (no EUOUAE, or a mode not in the table).
 */
export function psalmToneFor(gabcBody: string, mode: string | null): MelodyEvent[] | null {
  const tone = mode ? TONES[mode.trim().charAt(0)] : undefined;
  const eu = splitEuouae(gabcBody).euouae;
  if (!tone || !eu) return null;

  const termination = parseGabcMelody(eu).filter((e) => e.pitch !== null);
  if (termination.length === 0) return null;

  const notes = [
    ...tone.intonation,
    ...Array(RECITING_NOTES).fill(tone.tenor),
    ...tone.mediant.slice(0, -1),
    tone.mediant[tone.mediant.length - 1] + '.',
  ];
  const firstHalf = parseGabcMelody(`(${tone.clef}) ${notes.map((n) => `(${n})`).join('')} (:)`);
  const tenorPitch = parseGabcMelody(`(${tone.clef}) (${tone.tenor})`)[0].pitch!;

  // The termination starts on the reciting note: move the first half to its
  // pitch (an octave shift, or a transposition for antiphons written transposed).
  const start = termination[0].pitch!;
  if (mode === '3' && (start - tenorPitch + 120) % 12 !== 0) return null; // tenor "recentior" (do): not in the table
  const shift = start - tenorPitch;
  const shifted = firstHalf.map((e) => ({ ...e, pitch: e.pitch === null ? null : e.pitch + shift }));

  return [
    ...shifted,
    { pitch: null, beats: 1 },
    { pitch: start, beats: 1 },
    { pitch: start, beats: 1 },
    ...termination,
  ];
}
