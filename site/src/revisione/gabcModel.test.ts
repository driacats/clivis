import { describe, expect, it } from 'vitest';
import {
  deleteNote, editNote, getAccidental, setAccidental, getBarAfter, insertNoteAfter, insertSyllableAfter, joinAfter, joinFile, movePitch,
  noteLiquescence, noteRefs, noteShape, parseBody, serializeBody, setBarAfter, setFirstClef, setHeaderField,
  setJoinAfter, setLiquescence, setShape, splitFile, splitNote, toggleSign, wordOf, hasSign,
} from './gabcModel';

const chants = import.meta.glob<string>('../../../gabc/chants/*.gabc', { query: '?raw', import: 'default', eager: true });
const files = Object.keys(chants);

describe('gabc model', () => {
  it('reads and writes back every chant of the database unchanged', () => {
    expect(files.length).toBeGreaterThan(200);
    for (const f of files) {
      const raw = chants[f];
      const file = splitFile(raw);
      expect(joinFile(file)).toBe(raw);
      expect(serializeBody(parseBody(file.body)), f).toBe(file.body);
      expect(noteRefs(parseBody(file.body)).length, f).toBeGreaterThan(0);
    }
  });

  const body = '(c4) CA(g)ro(e) me(g_0//hig)a(g.) *(,) re(g)qui(e\')é(f)scet(d) in(ed) spe.(c.) (::)';

  it('moves, reshapes and marks a note', () => {
    const b = parseBody(body);
    const refs = noteRefs(b);
    expect(refs.length).toBe(14);
    const r = refs[3]; // h of hig
    let out = editNote(b, r, (p) => movePitch(p, 1));
    expect(serializeBody(out)).toContain('me(g_0//iig)');
    out = editNote(out, r, (p) => setShape(p, 'virga'));
    expect(serializeBody(out)).toContain('(g_0//ivig)');
    out = editNote(out, r, (p) => setShape(p, 'inclinatum'));
    expect(serializeBody(out)).toContain('(g_0//Iig)');
    out = editNote(out, refs[0], (p) => toggleSign(p, 'mora'));
    expect(serializeBody(out)).toContain('CA(g.)');
    out = editNote(out, refs[2], (p) => toggleSign(p, 'episema'));
    expect(serializeBody(out)).toContain('me(g//');
    out = editNote(out, refs[1], (p) => setLiquescence(p, 'deminutus'));
    expect(serializeBody(out)).toContain('ro(e~)');
  });

  it('keeps modifiers in gabc order', () => {
    const p = toggleSign(setShape(splitNote('g.'), 'virga'), 'episema');
    expect(noteShape(p)).toBe('virga');
    expect(hasSign(p, 'mora')).toBe(true);
    expect(noteLiquescence(splitNote('f~'))).toBe('deminutus');
    expect(splitNote("e'").mods).toEqual(["'"]);
  });

  it('adds and removes notes, keeping one per syllable', () => {
    const b = parseBody(body);
    const refs = noteRefs(b);
    expect(deleteNote(b, refs[0])).toBeNull();
    const { body: added, ref } = insertNoteAfter(b, refs[0], 'vicina');
    expect(serializeBody(added)).toContain('CA(g/g)');
    expect(noteRefs(added).length).toBe(15);
    expect(serializeBody(deleteNote(added, ref)!)).toContain('CA(g)');
    expect(serializeBody(deleteNote(b, refs[3])!)).toContain('me(g_0//ig)');
    expect(serializeBody(deleteNote(parseBody('a(gsss)'), { syl: 0, atom: 0, sub: 2 })!)).toBe('a(gss)');
  });

  it('changes how notes are joined', () => {
    const b = parseBody(body);
    const refs = noteRefs(b);
    expect(joinAfter(b, refs[2])).toBe('staccata');
    expect(joinAfter(b, refs[3])).toBe('unita');
    expect(joinAfter(b, refs[0])).toBeNull();
    expect(serializeBody(setJoinAfter(b, refs[2], 'unita'))).toContain('me(g_0hig)');
    expect(serializeBody(setJoinAfter(b, refs[3], 'separata'))).toContain('me(g_0//h ig)');
  });

  it('edits bars, syllables and the clef', () => {
    const b = parseBody(body);
    expect(getBarAfter(b, 4)).toBe(',');
    expect(serializeBody(setBarAfter(b, 4, ';'))).toContain('a(g.) *(;)');
    expect(serializeBody(setBarAfter(b, 4, 'nessuna'))).toContain('a(g.) re(g)');
    expect(serializeBody(setBarAfter(b, 1, ','))).toContain('CA(g) (,)ro(e)');
    expect(getBarAfter(b, 12)).toBe('::');
    expect(serializeBody(setFirstClef(b, 'c3'))).toMatch(/^\(c3\)/);
    expect(serializeBody(insertSyllableAfter(b, 2, 'xx', 'f', true))).toContain('ro(e) xx(f) me');
    expect(wordOf(b, 4)).toEqual({ before: 'me', syllable: 'a', after: '' });
    expect(wordOf(b, 8)).toEqual({ before: 'requi', syllable: 'é', after: 'scet' });
  });

  it('adds, changes and removes a flat, which follows its note', () => {
    const b = parseBody('(c4) Al(hiji)le(h)');
    const refs = noteRefs(b);
    let out = setAccidental(b, refs[1], 'x');
    expect(serializeBody(out)).toBe('(c4) Al(hixiji)le(h)');
    expect(noteRefs(out).length).toBe(5);
    const r = noteRefs(out)[1];
    expect(getAccidental(out, r)).toBe('x');
    out = editNote(out, r, (p) => movePitch(p, -1));
    expect(serializeBody(out)).toBe('(c4) Al(hhxhji)le(h)');
    out = setAccidental(out, noteRefs(out)[1], 'y');
    expect(serializeBody(out)).toBe('(c4) Al(hhyhji)le(h)');
    out = setAccidental(out, noteRefs(out)[1], 'nessuna');
    expect(serializeBody(out)).toBe('(c4) Al(hhji)le(h)');
    expect(getAccidental(b, refs[0])).toBe('nessuna');
  });

  it('edits header fields', () => {
    expect(setHeaderField('name:x;\nmode:7;\n%%\n', 'mode', '8')).toBe('name:x;\nmode:8;\n%%\n');
    expect(setHeaderField('name:x;\n%%\n', 'mode', '2')).toBe('name:x;\nmode:2;\n%%\n');
  });
});
