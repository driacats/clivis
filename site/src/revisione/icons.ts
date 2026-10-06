// Little pictures of square notation for the buttons of the editor and the
// guide. They are drawn with exsurge's own glyphs, the ones of the scores, so a
// button shows exactly the sign it puts on the staff. Drawn in currentColor:
// they follow the theme and the pressed state.
import { Glyphs } from 'exsurge';

// In glyph units a staff position (line to space) is 100, the width of a punctum;
// the lines are at the odd positions. y grows downwards.
const STEP = 100;
const LINE = 16; // weight of the staff lines and of the neume lines

/** The path data of an exsurge glyph (all its paths: the cavum's inner one is its hole, with even-odd). */
function glyphData(name: string): string {
  return [...Glyphs[name].svgSrc.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
}

/** A glyph with its origin at (x, staff position). */
const g = (name: string, x: number, pos: number) =>
  `<path transform="translate(${x} ${-pos * STEP})"${name === 'PunctumCavum' ? ' fill-rule="evenodd"' : ''} d="${glyphData(name)}"/>`;

const bar = (x: number, y1: number, y2: number) => `<rect x="${x - LINE / 2}" y="${y1}" width="${LINE}" height="${y2 - y1}"/>`;

/** The two notes of a pes, the upper one on the right with the joining line. */
const pes = (lower: string, x: number, from: number, to: number) =>
  g(lower, x, from) + g('PodatusUpper', x + 50, to) + bar(x + 50 - LINE / 2, -to * STEP, -from * STEP);

// small icons: two staff lines around the note; bars: the whole staff
const SMALL = { lines: [-1, 1], box: [-185, -185, 370, 370] };
const STAFF4 = { lines: [-3, -1, 1, 3], box: [-230, -360, 460, 720] };

const ICONS: Record<string, [string, typeof SMALL]> = {
  // shapes
  punctum: [g('PunctumQuadratum', 0, 0), SMALL],
  virga: [g('VirgaShort', 0, 0), SMALL],
  inclinatum: [g('PunctumInclinatum', 0, 0), SMALL],
  quilisma: [g('Quilisma', 0, 0), SMALL],
  oriscus: [g('OriscusDes', 0, 0), SMALL],
  stropha: [g('Stropha', 0, 0), SMALL],
  cavum: [g('PunctumCavum', 0, 0), SMALL],

  // liquescence
  'liq-none': [g('PunctumQuadratum', 0, 0), SMALL],
  // a clivis deminuta, as exsurge draws it: stem on the left, upper note, small lower note
  'liq-deminutus': [bar(-42, -100, 156) + g('PunctumQuadratum', 0, 1) + bar(42, -100, 100) + g('TerminatingDesLiquescent', 50, -1), SMALL],
  'liq-ascendente': [g('PunctumQuadratumAscLiquescent', 0, 0), SMALL],
  'liq-discendente': [g('PunctumQuadratumDesLiquescent', 0, 0), SMALL],

  // flat and natural before the note
  'acc-nessuna': [g('PunctumQuadratum', 0, 0), SMALL],
  'acc-x': [g('Flat', -135, -0.4) + g('PunctumQuadratum', 60, -0.4), SMALL],
  'acc-y': [g('Natural', -115, 0) + g('PunctumQuadratum', 50, 0), SMALL],

  // signs
  mora: [g('PunctumQuadratum', -40, 0) + g('Mora', 10, 0), SMALL],
  episema: [g('PunctumQuadratum', 0, 0) + `<rect x="-50" y="-112" width="100" height="${LINE}" rx="3"/>`, SMALL],
  ictus: [g('PunctumQuadratum', 0, 0) + g('VerticalEpisemaBelow', 0, -0.75), SMALL],
  // a pes initio debilis, built as exsurge builds it: small first note, line, upper note
  debilis: [g('TerminatingDesLiquescent', -17, -1) + bar(-25, -100, 100) + g('PunctumQuadratum', 17, 1), SMALL],

  // spacing to the next note
  unita: [pes('PodatusLower', -25, -1, 1), SMALL],
  vicina: [g('PunctumQuadratum', -56, 0) + g('PunctumQuadratum', 56, 0), SMALL],
  staccata: [g('PunctumQuadratum', -90, 0) + g('PunctumQuadratum', 90, 0), SMALL],
  separata: [g('PunctumQuadratum', -128, 0) + g('PunctumQuadratum', 128, 0), SMALL],

  // bars
  'bar-nessuna': ['', STAFF4],
  'bar-`': [g('Virgula', -45, 2.6), STAFF4],
  'bar-,': [bar(0, -340, -170), STAFF4],
  'bar-;': [bar(0, -200, 200), STAFF4],
  'bar-:': [bar(0, -300, 300), STAFF4],
  'bar-::': [bar(-30, -300, 300) + bar(30, -300, 300), STAFF4],
};

/** The icon for an option, or null when there is none. */
export function icon(key: string): string | null {
  const def = ICONS[key];
  if (!def) return null;
  const [body, { lines, box }] = def;
  const staff = lines.map((p) => `<rect class="ic-staff" x="${box[0]}" y="${-p * STEP - LINE / 2}" width="${box[2]}" height="${LINE}"/>`).join('');
  return `<svg class="ic" viewBox="${box.join(' ')}" aria-hidden="true" focusable="false">${staff}<g fill="currentColor">${body}</g></svg>`;
}
