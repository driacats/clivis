import { describe, it, expect } from 'vitest';
import { psalmToneFor } from './psalmTone';

const pitches = (e: ReturnType<typeof psalmToneFor>) => e!.filter((x) => x.pitch !== null).map((x) => x.pitch);

describe('psalmToneFor', () => {
  it('builds tone 8 G: intonation sol la, tenor do, mediant re do, then the EUOUAE', () => {
    const body = '(c4) BE(g)á(h)ti(j) (::) E(j)u(j)o(i)u(j)a(h)e.(g.) (::)';
    expect(pitches(psalmToneFor(body, '8'))).toEqual([
      55, 57, 60, 60, 60, 60, 62, 60, // sol la | do do do do | re do
      60, 60, 60, 60, 59, 60, 57, 55, // do do | e u o u a e
    ]);
  });
  it('follows a transposed antiphon (same clef letters, different do)', () => {
    const body = '(c3) A(f)b(h) (::) E(h)u(h)o(g)u(h)a(f)e.(e.) (::)';
    expect(pitches(psalmToneFor(body, '8'))!.slice(0, 3)).toEqual([55, 57, 60]);
  });
  it('returns null without EUOUAE or with an unknown mode', () => {
    expect(psalmToneFor('(c4) A(g)', '8')).toBeNull();
    expect(psalmToneFor('(c4) A(g) (::) E(h)u(h)o(g)u(h)a(f)e(e) (::)', 'p')).toBeNull();
  });
});
