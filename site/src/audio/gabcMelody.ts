// Turns the notation of a GABC body into a list of notes with MIDI pitches and
// relative durations, for playback. It reads only the pitches and the few signs
// that change duration or add breath; the lyrics and the neume shapes are ignored.

export interface MelodyEvent {
  /** MIDI note number, or null for a rest (bar line). */
  pitch: number | null;
  /** Duration in beats (1 = an ordinary punctum). */
  beats: number;
}

const LETTERS = 'abcdefghijklm';
/** Semitones above do for each scale degree do re mi fa sol la si. */
const SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Staff position of the clef line: line 1 = d, line 2 = f, line 3 = h, line 4 = j. */
const LINE_POS = [0, 3, 5, 7, 9];

/** MIDI pitch of "do" when the melody is sung: C4. Mode transposition is left to the singer. */
const DO_PITCH = 60;

const BAR_RESTS: Record<string, number> = { ',': 0.5, '`': 0.25, ';': 0.75, ':': 1, '::': 1.5 };

interface Clef {
  /** staff position (0 = letter a) of do */
  doPos: number;
}

function clefFromToken(tok: string): Clef | null {
  const m = /^([cf])(b?)([1-4])$/.exec(tok);
  if (!m) return null;
  const linePos = LINE_POS[Number(m[3])];
  // a C clef marks do on its line, an F clef marks fa (3 degrees above do)
  return { doPos: m[1] === 'c' ? linePos : linePos - 3 };
}

function pitchAt(pos: number, clef: Clef, flats: Set<number>): number {
  const degree = pos - clef.doPos;
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  let pitch = DO_PITCH + 12 * octave + SCALE[step];
  if (flats.has(pos)) pitch -= 1;
  return pitch;
}

/** All "( ... )" groups of the body, in order, with verbatim "[...]" parts removed. */
function notationGroups(body: string): string[] {
  const groups: string[] = [];
  const re = /\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) groups.push(m[1].replace(/\[[^\]]*\]/g, ''));
  return groups;
}

export function parseGabcMelody(body: string): MelodyEvent[] {
  const events: MelodyEvent[] = [];
  let clef: Clef = { doPos: LINE_POS[4] }; // c4 until told otherwise
  const flats = new Set<number>();

  const rest = (beats: number) => {
    const last = events[events.length - 1];
    if (!last) return;
    if (last.pitch === null) last.beats = Math.max(last.beats, beats);
    else events.push({ pitch: null, beats });
  };

  for (const group of notationGroups(body)) {
    const g = group.trim();
    const asClef = clefFromToken(g);
    if (asClef) {
      clef = asClef;
      flats.clear();
      if (/^cb|^fb/.test(g)) flats.add(clef.doPos - 1); // "cb3": b-flat built into the clef
      continue;
    }

    let i = 0;
    while (i < g.length) {
      const ch = g[i];

      // bars
      if (ch === ':' && g[i + 1] === ':') { rest(BAR_RESTS['::']); flats.clear(); i += 2; continue; }
      if (ch === ',' || ch === ';' || ch === ':' || ch === '`') {
        rest(BAR_RESTS[ch]);
        flats.clear();
        i++;
        while (i < g.length && /[0-9]/.test(g[i])) i++; // ";1", ",3"…
        continue;
      }

      // clef change in the middle of a group: "c3", "f4", "cb3"
      const clefMatch = /^([cf]b?[1-4])/.exec(g.slice(i));
      if (clefMatch && (i === 0 || /[\s/!]/.test(g[i - 1]))) {
        const c = clefFromToken(clefMatch[1]);
        if (c) { clef = c; flats.clear(); i += clefMatch[1].length; continue; }
      }

      const lower = ch.toLowerCase();
      const pos = LETTERS.indexOf(lower);
      if (pos < 0) { i++; continue; }

      const next = g[i + 1];
      // accidentals: "ix" flat, "iy" natural, "i#" sharp (treated as natural)
      if (next === 'x') { flats.add(pos); i += 2; continue; }
      if (next === 'y' || next === '#') { flats.delete(pos); i += 2; continue; }
      // custos: "h+"
      if (next === '+') { i += 2; continue; }

      // a note: read its modifiers
      let j = i + 1;
      let beats = 1;
      let dots = 0;
      let episema = false;
      while (j < g.length && /[vVoOwWsSrR~<>q.'_0-9-]/.test(g[j])) {
        if (g[j] === '.') dots++;
        if (g[j] === '_') episema = true;
        j++;
      }
      if (dots) beats = 2;
      else if (episema) beats = 1.5;
      events.push({ pitch: pitchAt(pos, clef, flats), beats });
      i = j;
    }
  }

  // no trailing rest
  while (events.length && events[events.length - 1].pitch === null) events.pop();
  return events;
}

// --- antiphon / EUOUAE ------------------------------------------------------------

/**
 * Splits off the EUOUAE (the psalm-tone ending printed after an antiphon) so the
 * two can be played separately. Returns null for `euouae` when there is none.
 * The EUOUAE part starts with the clef in force where it begins.
 */
export function splitEuouae(body: string): { main: string; euouae: string | null } {
  const tag = body.search(/<eu>/i);
  const syll = body.search(/E\s*\([^)]*\)\s*u\s*\([^)]*\)\s*o\s*\([^)]*\)\s*u\s*\([^)]*\)\s*a\s*\(/);
  const at = tag >= 0 ? tag : syll;
  if (at <= 0) return { main: body, euouae: null };
  const main = body.slice(0, at);
  const clefs = [...main.matchAll(/\(\s*([cf]b?[1-4])/g)];
  const clef = clefs.length ? clefs[clefs.length - 1][1] : 'c4';
  return { main, euouae: `(${clef}) ${body.slice(at)}` };
}

// --- standard MIDI file ----------------------------------------------------------

/** A type-0 MIDI file of the melody (choir "aahs", 1 beat = an eighth at 240 bpm). */
export function melodyToMidi(events: MelodyEvent[], secondsPerBeat = 0.45): Uint8Array {
  const TPQ = 480;
  const usPerQuarter = Math.round(secondsPerBeat * 1e6);
  const track: number[] = [];
  const varLen = (n: number) => {
    const bytes = [n & 0x7f];
    while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
    return bytes;
  };
  track.push(0, 0xff, 0x51, 3, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff);
  track.push(0, 0xc0, 52); // program: choir aahs
  let pending = 0;
  for (const e of events) {
    const ticks = Math.round(e.beats * TPQ);
    if (e.pitch === null) { pending += ticks; continue; }
    track.push(...varLen(pending), 0x90, e.pitch, 80);
    track.push(...varLen(ticks), 0x80, e.pitch, 0);
    pending = 0;
  }
  track.push(...varLen(pending), 0xff, 0x2f, 0);

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (TPQ >> 8) & 0xff, TPQ & 0xff];
  const len = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}
