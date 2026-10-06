import { describe, expect, it } from 'vitest';
import { joinFile, noteRefs, parseBody, serializeBody, splitFile } from 'exsurge';

// The gabc model lives in exsurge (Exsurge.Model, with its own tests); here it
// is checked on the whole database of the breviary.
const chants = import.meta.glob<string>('../../../gabc/chants/*.gabc', { query: '?raw', import: 'default', eager: true });
const files = Object.keys(chants);

describe('gabc model on the database', () => {
  it('reads and writes back every chant unchanged', () => {
    expect(files.length).toBeGreaterThan(200);
    for (const f of files) {
      const raw = chants[f];
      const file = splitFile(raw);
      expect(joinFile(file)).toBe(raw);
      expect(serializeBody(parseBody(file.body)), f).toBe(file.body);
      expect(noteRefs(parseBody(file.body)).length, f).toBeGreaterThan(0);
    }
  });
});
