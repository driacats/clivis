// A lossless model of a gabc body for the visual editor of the review page.
//
// The body is split into syllables (lyric text + the notation in brackets) and
// every notation into atoms with the same regular expression exsurge uses, so
// the n-th note of the model is the n-th note exsurge draws (noteBoxes()).
// Anything the model does not understand is kept as it is: serialize(parse(x))
// is always x.

// same as __notationsRegex in exsurge/src/Exsurge.Gabc.ts
const ATOM = /z0|z|Z|::|:|;|,|`|c1|c2|c3|c4|f3|f4|cb3|cb4|\/\/|\/| |!|-?[a-mA-M][oOwWvVrRsxy#~+><_.'012345]*(?:\[[^\]]*\]?)*/y;

export type AtomKind = 'note' | 'custos' | 'accidental' | 'clef' | 'bar' | 'space' | 'break' | 'raw';

export interface Atom { kind: AtomKind; s: string }

export interface Syllable {
  /** whitespace before the syllable: a new word starts when it is not empty */
  lead: string;
  text: string;
  /** what is inside the brackets; null when the syllable has no brackets */
  notation: Atom[] | null;
}

export interface GabcBody {
  syllables: Syllable[];
  /** whatever follows the last bracket (usually nothing or a newline) */
  tail: string;
}

/** Where a drawn note comes from: its atom, and which note of the atom (gsss = 3 notes). */
export interface NoteRef { syl: number; atom: number; sub: number }

const CLEFS = new Set(['c1', 'c2', 'c3', 'c4', 'f3', 'f4', 'cb3', 'cb4']);
const BARS = new Set([',', '`', ';', ':', '::']);
const SPACES = new Set(['/', '//', ' ', '!']);
const BREAKS = new Set(['z', 'Z', 'z0']);

function classify(s: string): AtomKind {
  if (CLEFS.has(s)) return 'clef';
  if (BARS.has(s)) return 'bar';
  if (SPACES.has(s)) return 'space';
  if (BREAKS.has(s)) return 'break';
  if (/^-?[a-mA-M]/.test(s)) {
    // as exsurge does: the second character of the atom decides
    if (s[1] === '+') return 'custos';
    if (s[1] === 'x' || s[1] === 'y' || s[1] === '#') return 'accidental';
    return 'note';
  }
  return 'raw';
}

export function parseNotation(data: string): Atom[] {
  const atoms: Atom[] = [];
  let i = 0;
  let raw = '';
  while (i < data.length) {
    ATOM.lastIndex = i;
    const m = ATOM.exec(data);
    if (m && m[0].length > 0) {
      if (raw) { atoms.push({ kind: 'raw', s: raw }); raw = ''; }
      atoms.push({ kind: classify(m[0]), s: m[0] });
      i += m[0].length;
    } else {
      raw += data[i++];
    }
  }
  if (raw) atoms.push({ kind: 'raw', s: raw });
  return atoms;
}

export function parseBody(body: string): GabcBody {
  const syllables: Syllable[] = [];
  const re = /([^(]*)\(([^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const pre = m[1];
    const lead = /^\s*/.exec(pre)![0];
    syllables.push({ lead, text: pre.slice(lead.length), notation: parseNotation(m[2]) });
    last = re.lastIndex;
  }
  return { syllables, tail: body.slice(last) };
}

export const serializeNotation = (atoms: Atom[]): string => atoms.map((a) => a.s).join('');

export function serializeBody(b: GabcBody): string {
  return b.syllables.map((s) => s.lead + s.text + (s.notation ? `(${serializeNotation(s.notation)})` : '')).join('') + b.tail;
}

// --- whole files ---------------------------------------------------------------

export interface GabcFile { header: string; body: string }

/** Splits a .gabc file at its last "%%" line (some GregoBase files repeat the header). */
export function splitFile(raw: string): GabcFile {
  const seps = [...raw.matchAll(/^%%[ \t]*\r?\n?/gm)];
  const last = seps[seps.length - 1];
  if (!last) return { header: '', body: raw };
  const end = last.index! + last[0].length;
  return { header: raw.slice(0, end), body: raw.slice(end) };
}

export const joinFile = (f: GabcFile): string => f.header + f.body;

export function headerField(header: string, name: string): string | null {
  const m = new RegExp(`^${name}:\\s*([^;\\n]*);?`, 'm').exec(header);
  return m ? m[1].trim() : null;
}

/** Sets (or adds, before the first "%%") a header field. */
export function setHeaderField(header: string, name: string, value: string): string {
  const re = new RegExp(`^${name}:[^\\n]*$`, 'm');
  const line = `${name}:${value};`;
  if (re.test(header)) return header.replace(re, line);
  const i = header.search(/^%%/m);
  if (i < 0) return header + line + '\n';
  return header.slice(0, i) + line + '\n' + header.slice(i);
}

// --- notes -------------------------------------------------------------------------

/** How many notes exsurge makes of a note atom: "gsss" is three strophae, "gvv" a bivirga. */
export function notesInAtom(s: string): number {
  const d = s.replace(/^-/, '');
  let shape: 'v' | 's' | 'other' | null = d[0] === d[0].toUpperCase() ? 'other' : null;
  let n = 1;
  for (let i = 1; i < d.length; i++) {
    const c = d[i];
    if (c === '[') { while (i < d.length && d[i] !== ']') i++; continue; }
    if (c === 's') { if (shape === 's') n++; shape = 's'; }
    else if (c === 'v') { if (shape === 'v') n++; shape = 'v'; }
    else if (c === 'w' || c === 'o' || c === 'O') shape = 'other';
  }
  return n;
}

/** Every drawn note, in the order exsurge draws them. */
export function noteRefs(b: GabcBody): NoteRef[] {
  const refs: NoteRef[] = [];
  b.syllables.forEach((syl, si) => {
    syl.notation?.forEach((a, ai) => {
      if (a.kind !== 'note') return;
      const n = notesInAtom(a.s);
      for (let k = 0; k < n; k++) refs.push({ syl: si, atom: ai, sub: k });
    });
  });
  return refs;
}

// A note atom split into parts: [-]pitch, then modifier tokens.
export interface NoteParts { debilis: boolean; pitch: string; mods: string[] }

const MOD = /o[<>]|O[<>]|r1|_[0-5]*|\.[01]?|'[01]?|\[[^\]]*\]?|./gy;

export function splitNote(s: string): NoteParts {
  const debilis = s.startsWith('-');
  const d = debilis ? s.slice(1) : s;
  const mods: string[] = [];
  const rest = d.slice(1);
  MOD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (MOD.lastIndex < rest.length && (m = MOD.exec(rest))) mods.push(m[0]);
  return { debilis, pitch: d[0], mods };
}

const SHAPE_ORDER = (t: string) =>
  /^[vwosOV]|^o[<>]|^O[<>]|^[rR]$/.test(t) ? 0 :
  /^[~<>]$/.test(t) ? 1 :
  /^[xy#]$/.test(t) ? 2 :
  /^[._']/.test(t) ? 3 : 4;

export function joinNote(p: NoteParts): string {
  // keep the order gabc writers use: shape, liquescence, then rhythmic signs, then [..]
  const mods = p.mods.map((t, i) => ({ t, i })).sort((a, b) => SHAPE_ORDER(a.t) - SHAPE_ORDER(b.t) || a.i - b.i).map((x) => x.t);
  return (p.debilis ? '-' : '') + p.pitch + mods.join('');
}

export type Shape = 'punctum' | 'inclinatum' | 'virga' | 'quilisma' | 'oriscus' | 'stropha' | 'cavum';
export type Liquescence = 'none' | 'deminutus' | 'ascendente' | 'discendente';

export const SHAPES: [Shape, string][] = [
  ['punctum', 'Punctum'], ['virga', 'Virga'], ['inclinatum', 'Rombo'], ['quilisma', 'Quilisma'],
  ['oriscus', 'Oriscus'], ['stropha', 'Stropha'], ['cavum', 'Cavum'],
];
export const LIQUESCENCES: [Liquescence, string][] = [
  ['none', 'Nessuna'], ['deminutus', 'Deminutus (~)'], ['ascendente', 'Ascendente (<)'], ['discendente', 'Discendente (>)'],
];

const isShapeMod = (t: string) => /^(v|V|w|W|s|o|O|o[<>]|O[<>]|r|R)$/.test(t);

export function noteShape(p: NoteParts): Shape {
  if (p.pitch === p.pitch.toUpperCase()) return 'inclinatum';
  for (const t of p.mods) {
    if (t === 'v' || t === 'V') return 'virga';
    if (t === 'w' || t === 'W') return 'quilisma';
    if (t.startsWith('o') || t.startsWith('O')) return 'oriscus';
    if (t === 's') return 'stropha';
    if (t === 'r') return 'cavum';
  }
  return 'punctum';
}

export function setShape(p: NoteParts, shape: Shape): NoteParts {
  const mods = p.mods.filter((t) => !isShapeMod(t));
  const pitch = shape === 'inclinatum' ? p.pitch.toUpperCase() : p.pitch.toLowerCase();
  const add: Record<Shape, string | null> = {
    punctum: null, inclinatum: null, virga: 'v', quilisma: 'w', oriscus: 'o', stropha: 's', cavum: 'r',
  };
  const t = add[shape];
  return { ...p, pitch, mods: t ? [t, ...mods] : mods };
}

export function noteLiquescence(p: NoteParts): Liquescence {
  if (p.mods.includes('~')) return 'deminutus';
  if (p.mods.includes('<')) return 'ascendente';
  if (p.mods.includes('>')) return 'discendente';
  return 'none';
}

export function setLiquescence(p: NoteParts, l: Liquescence): NoteParts {
  const mods = p.mods.filter((t) => t !== '~' && t !== '<' && t !== '>');
  const t = { none: null, deminutus: '~', ascendente: '<', discendente: '>' }[l];
  return { ...p, mods: t ? [...mods, t] : mods };
}

export type Sign = 'mora' | 'episema' | 'ictus';
const SIGN_PREFIX: Record<Sign, string> = { mora: '.', episema: '_', ictus: "'" };

export const hasSign = (p: NoteParts, sign: Sign): boolean => p.mods.some((t) => t.startsWith(SIGN_PREFIX[sign]));

export function toggleSign(p: NoteParts, sign: Sign): NoteParts {
  const pre = SIGN_PREFIX[sign];
  if (hasSign(p, sign)) return { ...p, mods: p.mods.filter((t) => !t.startsWith(pre)) };
  return { ...p, mods: [...p.mods, pre] };
}

const PITCHES = 'abcdefghijklm';

/** Moves a note by `steps` positions on the staff (keeps it inside a–m). */
export function movePitch(p: NoteParts, steps: number): NoteParts {
  const upper = p.pitch === p.pitch.toUpperCase();
  const i = PITCHES.indexOf(p.pitch.toLowerCase());
  const j = Math.min(Math.max(i + steps, 0), PITCHES.length - 1);
  const c = PITCHES[j];
  return { ...p, pitch: upper ? c.toUpperCase() : c };
}

export const setDebilis = (p: NoteParts, on: boolean): NoteParts => ({ ...p, debilis: on });

// --- editing the body (pure: every function returns a new body) ----------------------

const clone = (b: GabcBody): GabcBody => ({
  tail: b.tail,
  syllables: b.syllables.map((s) => ({ ...s, notation: s.notation ? s.notation.map((a) => ({ ...a })) : null })),
});

/** Applies `f` to the note atom of `ref`. */
export function editNote(b: GabcBody, ref: NoteRef, f: (p: NoteParts) => NoteParts): GabcBody {
  const out = clone(b);
  const n = out.syllables[ref.syl].notation!;
  const atom = n[ref.atom];
  const before = splitNote(atom.s);
  // a flat or natural written just before the note moves with it
  const acc = accidentalBefore(n, ref.atom);
  const after = f(before);
  atom.s = joinNote(after);
  atom.kind = classify(atom.s);
  if (acc !== null && after.pitch.toLowerCase() !== before.pitch.toLowerCase()) {
    n[acc].s = after.pitch.toLowerCase() + n[acc].s.slice(1);
  }
  return out;
}

// --- accidentals -----------------------------------------------------------------------

export type Accidental = 'nessuna' | 'x' | 'y';
export const ACCIDENTALS: [Accidental, string][] = [['nessuna', 'Nessuna'], ['x', 'Bemolle'], ['y', 'Bequadro']];

/** The index of the flat/natural written right before a note atom, on the note's own pitch. */
function accidentalBefore(n: Atom[], atom: number): number | null {
  const prev = n[atom - 1];
  if (!prev || prev.kind !== 'accidental') return null;
  const pitch = splitNote(n[atom].s).pitch.toLowerCase();
  return prev.s[0].toLowerCase() === pitch ? atom - 1 : null;
}

export function getAccidental(b: GabcBody, ref: NoteRef): Accidental {
  const n = b.syllables[ref.syl].notation!;
  const i = accidentalBefore(n, ref.atom);
  if (i === null) return 'nessuna';
  const c = n[i].s[1];
  return c === 'x' || c === 'y' ? c : 'nessuna';
}

/**
 * Puts a flat or a natural before a note (gabc "ix" before "i"), or takes it away.
 * The note keeps its position among the notes; its atom index moves by one.
 */
export function setAccidental(b: GabcBody, ref: NoteRef, acc: Accidental): GabcBody {
  const out = clone(b);
  const n = out.syllables[ref.syl].notation!;
  const i = accidentalBefore(n, ref.atom);
  const pitch = splitNote(n[ref.atom].s).pitch.toLowerCase();
  if (i !== null) {
    if (acc === 'nessuna') n.splice(i, 1);
    else n[i].s = pitch + acc;
  } else if (acc !== 'nessuna') {
    n.splice(ref.atom, 0, { kind: 'accidental', s: pitch + acc });
  }
  return out;
}

export type Join = 'unita' | 'vicina' | 'staccata' | 'separata';
export const JOINS: [Join, string, string][] = [
  ['unita', 'Unita', ''], ['vicina', 'Vicina', '/'], ['staccata', 'Staccata', '//'], ['separata', 'Separata', ' '],
];

/** The atoms between a note atom and the next note atom of the same syllable (null: it is the last one). */
function gapAfter(syl: Syllable, atom: number): [number, number] | null {
  const n = syl.notation!;
  let j = atom + 1;
  while (j < n.length && n[j].kind === 'space') j++;
  if (j >= n.length || n[j].kind !== 'note') return null;
  return [atom + 1, j];
}

export function joinAfter(b: GabcBody, ref: NoteRef): Join | null {
  const syl = b.syllables[ref.syl];
  const g = gapAfter(syl, ref.atom);
  if (!g) return null;
  const s = syl.notation!.slice(g[0], g[1]).map((a) => a.s).join('');
  if (s === '') return 'unita';
  if (s === '/') return 'vicina';
  if (s === '//') return 'staccata';
  return 'separata';
}

export function setJoinAfter(b: GabcBody, ref: NoteRef, join: Join): GabcBody {
  const out = clone(b);
  const syl = out.syllables[ref.syl];
  const g = gapAfter(syl, ref.atom);
  if (!g) return out;
  const sep = JOINS.find((j) => j[0] === join)![2];
  syl.notation!.splice(g[0], g[1] - g[0], ...(sep ? [{ kind: 'space' as const, s: sep }] : []));
  return out;
}

/** Adds a plain note after `ref` (same pitch), joined to it or set apart; returns the body and the new note. */
export function insertNoteAfter(b: GabcBody, ref: NoteRef, join: Join = 'unita'): { body: GabcBody; ref: NoteRef } {
  const out = clone(b);
  const n = out.syllables[ref.syl].notation!;
  const p = splitNote(n[ref.atom].s);
  const note: Atom = { kind: 'note', s: p.pitch.toLowerCase() };
  const sep = JOINS.find((j) => j[0] === join)![2];
  const add: Atom[] = sep ? [{ kind: 'space', s: sep }, note] : [note];
  n.splice(ref.atom + 1, 0, ...add);
  return { body: out, ref: { syl: ref.syl, atom: ref.atom + add.length, sub: 0 } };
}

export const notesInSyllable = (syl: Syllable): number =>
  (syl.notation ?? []).filter((a) => a.kind === 'note').reduce((t, a) => t + notesInAtom(a.s), 0);

/** Removes a note; a syllable keeps at least one note (null when it is the only one). */
export function deleteNote(b: GabcBody, ref: NoteRef): GabcBody | null {
  if (notesInSyllable(b.syllables[ref.syl]) <= 1) return null;
  const out = clone(b);
  const n = out.syllables[ref.syl].notation!;
  const a = n[ref.atom];
  if (notesInAtom(a.s) > 1) {
    // one stropha / virga less: drop the last repeated letter
    const i = Math.max(a.s.lastIndexOf('s'), a.s.lastIndexOf('v'));
    a.s = a.s.slice(0, i) + a.s.slice(i + 1);
    return out;
  }
  // also drop the spacing next to it, so the neighbours keep their own spacing
  // (the space before it stays between its neighbours, unless it was the last note)
  let from = ref.atom, to = ref.atom + 1;
  const noteAfter = n.slice(to).some((x) => x.kind === 'note');
  if (to < n.length && n[to].kind === 'space') to++;
  else if (!noteAfter && from > 0 && n[from - 1].kind === 'space') from--;
  n.splice(from, to - from);
  return out;
}

// --- syllables, bars, clef -----------------------------------------------------------

export function setSyllableText(b: GabcBody, syl: number, text: string): GabcBody {
  const out = clone(b);
  // brackets would break the gabc
  out.syllables[syl].text = text.replace(/[()]/g, '');
  return out;
}

/** Adds a syllable after `syl` with one note at `pitch`: in the same word or as a new word. */
export function insertSyllableAfter(b: GabcBody, syl: number, text: string, pitch: string, newWord: boolean): GabcBody {
  const out = clone(b);
  out.syllables.splice(syl + 1, 0, {
    lead: newWord ? ' ' : '',
    text: text.replace(/[()]/g, ''),
    notation: [{ kind: 'note', s: pitch.toLowerCase() }],
  });
  return out;
}

export function deleteSyllable(b: GabcBody, syl: number): GabcBody {
  const out = clone(b);
  const [gone] = out.syllables.splice(syl, 1);
  // the next syllable starts a word if the removed one did
  const next = out.syllables[syl];
  if (next && gone.lead && !next.lead) next.lead = gone.lead;
  return out;
}

/** A syllable that holds only a bar (with spacing), like " *(;)" or " (::)". */
const isBarSyllable = (s: Syllable) =>
  !!s.notation && s.notation.some((a) => a.kind === 'bar') && s.notation.every((a) => a.kind === 'bar' || a.kind === 'space' || a.kind === 'break' || a.kind === 'custos');

export type Bar = 'nessuna' | '`' | ',' | ';' | ':' | '::';
export const BAR_LABELS: [Bar, string][] = [
  ['nessuna', 'Nessuna'], ['`', 'Virgula'], [',', 'Quarto'], [';', 'Mezza'], [':', 'Intera'], ['::', 'Doppia'],
];

/** Where the bar after a syllable is: at the end of its own notation, or in the bar syllable that follows. */
function barAfter(b: GabcBody, syl: number): { syl: number; atom: number } | null {
  const own = b.syllables[syl].notation ?? [];
  for (let i = own.length - 1; i >= 0; i--) {
    if (own[i].kind === 'bar') return { syl, atom: i };
    if (own[i].kind === 'note') break;
  }
  const next = b.syllables[syl + 1];
  if (next && isBarSyllable(next)) return { syl: syl + 1, atom: next.notation!.findIndex((a) => a.kind === 'bar') };
  return null;
}

export function getBarAfter(b: GabcBody, syl: number): Bar {
  const at = barAfter(b, syl);
  return at ? (b.syllables[at.syl].notation![at.atom].s as Bar) : 'nessuna';
}

export function setBarAfter(b: GabcBody, syl: number, bar: Bar): GabcBody {
  const out = clone(b);
  const at = barAfter(out, syl);
  if (at) {
    const s = out.syllables[at.syl];
    if (bar !== 'nessuna') {
      s.notation![at.atom].s = bar;
    } else if (at.syl !== syl) {
      // the whole bar syllable goes, with its text (an asterisk) if any
      out.syllables.splice(at.syl, 1);
    } else {
      s.notation!.splice(at.atom, 1);
    }
    return out;
  }
  if (bar !== 'nessuna') out.syllables.splice(syl + 1, 0, { lead: ' ', text: '', notation: [{ kind: 'bar', s: bar }] });
  return out;
}

/** The first clef of the piece. */
export function firstClef(b: GabcBody): { syl: number; atom: number; clef: string } | null {
  for (let si = 0; si < b.syllables.length; si++) {
    const n = b.syllables[si].notation ?? [];
    const ai = n.findIndex((a) => a.kind === 'clef');
    if (ai >= 0) return { syl: si, atom: ai, clef: n[ai].s };
  }
  return null;
}

export const CLEF_LIST = ['c1', 'c2', 'c3', 'c4', 'cb3', 'cb4', 'f3', 'f4'];

export function setFirstClef(b: GabcBody, clef: string): GabcBody {
  const out = clone(b);
  const at = firstClef(out);
  if (at) out.syllables[at.syl].notation![at.atom].s = clef;
  else out.syllables.unshift({ lead: '', text: '', notation: [{ kind: 'clef', s: clef }] });
  return out;
}

/** The syllable of a note, for labels: the word it belongs to, with the syllable marked. */
export function wordOf(b: GabcBody, syl: number): { before: string; syllable: string; after: string } {
  let start = syl;
  while (start > 0 && !b.syllables[start].lead && b.syllables[start - 1].notation) start--;
  let end = syl;
  while (end + 1 < b.syllables.length && !b.syllables[end + 1].lead) end++;
  const t = (i: number) => plainText(b.syllables[i].text);
  let before = '', after = '';
  for (let i = start; i < syl; i++) before += t(i);
  for (let i = syl + 1; i <= end; i++) after += t(i);
  return { before, syllable: t(syl), after };
}

/** Lyric text without gabc markup (<i>, <sp>, {centering}). */
export const plainText = (s: string): string =>
  s.replace(/<sp>R\/<\/sp>/g, '℟').replace(/<sp>V\/<\/sp>/g, '℣').replace(/<[^>]+>/g, '').replace(/[{}]/g, '');
