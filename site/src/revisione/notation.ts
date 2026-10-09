// Names, explanations and pictures of the notation options, shared by the
// editor's buttons and the guide.
import type { Bar, Join, Liquescence, NoteAccidental, Shape, Sign } from 'exsurge';

type Option = { name: string; help: string };

export const SHAPE: Record<Shape, Option> = {
  punctum: { name: 'Punctum', help: 'la nota quadrata normale.' },
  virga: { name: 'Virga', help: 'nota con il gambo a destra.' },
  inclinatum: { name: 'Rombo', help: 'punctum inclinatum, le note a losanga nelle discese.' },
  quilisma: { name: 'Quilisma', help: 'la nota dentellata, «a zig zag».' },
  oriscus: { name: 'Oriscus', help: 'la nota ondulata.' },
  stropha: { name: 'Stropha', help: 'la nota con la piccola coda, ripetuta nelle bistrophae e tristrophae.' },
  cavum: { name: 'Cavum', help: 'nota vuota (rara).' },
};

export const LIQUESCENCE: Record<Liquescence, Option & { short?: string }> = {
  none: { name: 'Nessuna', help: 'nota normale.' },
  deminutus: { name: 'Deminutus', help: 'l’ultima nota di un neuma più piccola (il segno ~).' },
  ascending: { name: 'Ascendente', short: 'Ascend.', help: 'liquescente verso l’alto, come nell’epiphonus.' },
  descending: { name: 'Discendente', short: 'Discend.', help: 'liquescente verso il basso, come nel cephalicus.' },
};

export const ACCIDENTAL: Record<NoteAccidental, Option> = {
  none: { name: 'Nessuna', help: 'nessun segno prima della nota.' },
  flat: { name: 'Bemolle', help: 'il bemolle prima della nota (di solito sul si). Vale fino alla fine della parola o alla prossima stanghetta.' },
  natural: { name: 'Bequadro', help: 'annulla un bemolle precedente.' },
};

export const SIGN: Record<Sign | 'debilis', Option> = {
  mora: { name: 'Mora', help: 'il punto dopo la nota (raddoppia la durata).' },
  episema: { name: 'Episema', help: 'la lineetta orizzontale sopra la nota.' },
  ictus: { name: 'Ictus', help: 'la lineetta verticale sotto la nota.' },
  debilis: { name: 'Debilis', help: 'initio debilis: la prima nota del neuma più piccola.' },
};

export const JOIN: Record<Join, Option> = {
  joined: { name: 'Unita', help: 'stesso neuma.' },
  close: { name: 'Vicina', help: 'un piccolo spazio.' },
  spaced: { name: 'Staccata', help: 'uno spazio medio.' },
  separate: { name: 'Separata', help: 'neumi distinti.' },
};

export const BAR: Record<Bar, Option> = {
  none: { name: 'Nessuna', help: '' },
  '`': { name: 'Virgula', help: 'un respiro breve.' },
  ',': { name: 'Quarto', help: 'la divisione minima (quarto di stanghetta).' },
  ';': { name: 'Mezza', help: 'mezza stanghetta.' },
  ':': { name: 'Intera', help: 'stanghetta intera, fine di frase.' },
  '::': { name: 'Doppia', help: 'doppia stanghetta, fine del canto o di una strofa.' },
};

/** Key of the little picture of an option (exsurge notationIcon). */
export const ICON = {
  shape: (v: Shape) => v,
  liquescence: (v: Liquescence) => `liq-${v}`,
  accidental: (v: NoteAccidental) => `acc-${v}`,
  sign: (v: Sign | 'debilis') => v,
  join: (v: Join) => v,
  bar: (v: Bar) => `bar-${v}`,
};
