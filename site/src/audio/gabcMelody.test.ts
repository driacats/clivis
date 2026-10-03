import { describe, it, expect } from 'vitest';
import { melodyToMidi, parseGabcMelody } from './gabcMelody';

const pitches = (gabc: string) => parseGabcMelody(gabc).map((e) => e.pitch);

describe('parseGabcMelody', () => {
  it('reads pitches relative to a C clef (do = C4)', () => {
    // c4: j = do, h = la, g = sol, f = fa
    expect(pitches('(c4) A(j)b(h)c(g)d(f)')).toEqual([60, 57, 55, 53]);
    // c3: h = do
    expect(pitches('(c3) A(h)b(i)c(g)')).toEqual([60, 62, 59]);
  });

  it('reads an F clef', () => {
    // f3: h = fa
    expect(pitches('(f3) A(h)b(i)c(f)')).toEqual([65, 67, 62]);
  });

  it('applies a flat until the next bar', () => {
    // c4: i = si, "ix" makes it si bemolle
    expect(pitches('(c4) A(ixi)b(i) (,) c(i)')).toEqual([58, 58, null, 59]);
  });

  it('lengthens dotted notes and episemata, rests at bars', () => {
    const ev = parseGabcMelody('(c4) A(g.)b(h_)c(j) (::)');
    expect(ev.map((e) => e.beats)).toEqual([2, 1.5, 1]);
  });

  it('ignores lyrics, custodes, rhombi shapes and verbatim parts', () => {
    expect(pitches('(c4) <sp>V/</sp>. Mit(ixhi)tet(h) Dó(jIG) (::h+Z) x(h[ob:1;6mm])')).toEqual([57, 58, 57, 60, 58, 55, null, 57]);
  });

  it('writes a valid MIDI header', () => {
    const midi = melodyToMidi(parseGabcMelody('(c4) A(j)'));
    expect(String.fromCharCode(...midi.slice(0, 4))).toBe('MThd');
    expect(String.fromCharCode(...midi.slice(14, 18))).toBe('MTrk');
  });
});
