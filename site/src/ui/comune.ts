// Lodi of a saint (or of Our Lady, or of a dedication) celebrated with a Comune
// of the libretto (pp. 203-299). The libretto has no Proprio dei Santi: every
// celebration takes its parts from a Comune.
//   festa (solemnities and feasts): everything from the Comune, psalms of
//     Sunday of week I;
//   memoria: psalmody of the weekday, the other parts from the Comune.
// Pieces whose melody is not transcribed yet show the Italian text printed in
// the libretto.

import { isLent, WEEKDAY_NAMES, type LiturgicalDay } from '../calendar/calendar';
import { comuneBenedicamus, paterNosterTone, solemnBlessing, type CelebrationMode } from '../calendar/plan';
import { getEntry, getTexts } from '../data/loader';
import type { Comune, ComunePart, ComuneVariant, LiturgyData, LodiConclusion } from '../data/types';
import { h, notice } from './dom';
import { lodiOpening } from './opening';
import {
  antiphonFrame, antiphonWithPsalm, benedictus as benedictusText, chant, choice, finalBlessing, hymnVerses, invocations,
  lectioTone, paterNoster, psalm, psalmFile, psalterDay, rubric, rubricText, section, SLOT_LABEL, translation,
} from './pieces';

type Scope = 'tp' | 'quaresima' | 'avvento' | 'natale' | 'ordinario' | null;

function getComune(id: string): Comune | undefined {
  return getTexts().comuni.find((c) => c.id === id);
}

/** Season a variant belongs to, from its rubric ("oppure" keeps the previous one). */
function scopes(variants: ComuneVariant[]): Scope[] {
  let last: Scope = null;
  return variants.map((v) => {
    const r = v.rubrica ?? '';
    let s: Scope = null;
    if (v.tp || /fuori dal Tempo Pasquale/i.test(r) === false && /pasqu/i.test(r)) s = 'tp';
    else if (/quaresima/i.test(r)) s = 'quaresima';
    else if (/avvento/i.test(r)) s = 'avvento';
    else if (/natale/i.test(r)) s = 'natale';
    else if (/tempo ordinario/i.test(r)) s = 'ordinario';
    else if (/^oppure/i.test(r)) s = last;
    last = s;
    return s;
  });
}

function seasonScope(day: LiturgicalDay): Exclude<Scope, null> {
  if (day.season === 'pasqua') return 'tp';
  if (isLent(day.season)) return 'quaresima';
  if (day.season === 'avvento') return 'avvento';
  if (day.season === 'natale') return 'natale';
  return 'ordinario';
}

/**
 * The variants of a part valid today: Eastertide variants in Eastertide (when
 * there are any), the others outside it; seasonal orations by season.
 */
function variantsFor(comune: Comune, part: ComunePart, day: LiturgicalDay): { from: Comune; list: ComuneVariant[] } {
  let from = comune;
  // Eastertide parts of the martyrs
  if (day.season === 'pasqua' && comune.tempoPasquale) {
    const tp = getComune(comune.tempoPasquale);
    if (tp?.parti[part]?.length) from = tp;
  }
  let all = from.parti[part];
  if (!all?.length && part === 'orazione' && from.orazione) {
    from = getComune(from.orazione) ?? from; all = from.parti[part];
  }
  if (!all?.length && from.eredita?.[part]) {
    const other = getComune(from.eredita[part]!);
    if (other) { from = other; all = other.parti[part]; }
  }
  if (!all?.length) return { from, list: [] };
  // "see the same part of another Comune"
  const resolved: ComuneVariant[] = all.flatMap((v) => {
    if (!v.vedi) return [v];
    const other = getComune(v.vedi)?.parti[part] ?? [];
    return other.map((o, i) => ({ ...o, rubrica: i === 0 ? `${v.rubrica ?? 'Oppure'} (dal ${getComune(v.vedi!)?.titolo})` : o.rubrica }));
  });
  const sc = scopes(resolved);
  const now = seasonScope(day);
  const seasonal = resolved.filter((_, i) => sc[i] === now);
  const general = resolved.filter((_, i) => sc[i] === null);
  if (now === 'tp' && seasonal.length) return { from, list: seasonal };
  // seasonal orations of Our Lady: the season's ones; otherwise the general ones
  if (seasonal.length) return { from, list: seasonal };
  return { from, list: general.length ? general : resolved.filter((_, i) => sc[i] !== 'tp' && sc[i] !== 'quaresima') };
}

const MISSING = 'Melodia non ancora trascritta: qui c’è il testo del libretto.';

function textBlock(it: string, missing = true): HTMLElement {
  return h('div', { class: 'comune-text' },
    h('p', { class: 'comune-text__it' }, it),
    missing ? h('p', { class: 'comune-text__tag' }, MISSING) : null);
}

/** A sung piece: the melody (with the translation) or the Italian text. */
function piece(v: ComuneVariant, opts: { hymn?: boolean; repeat?: boolean } = {}): HTMLElement {
  const it = typeof v.it === 'string' ? v.it : null;
  if (v.canto && getEntry(v.canto)?.status === 'found') {
    return h('div', {}, chant(v.canto, { repeat: opts.repeat }), opts.repeat ? null : translation(it, { hymn: opts.hymn }));
  }
  if (!it) return notice('Il libretto riporta qui solo la melodia, non ancora trascritta.', 'gap');
  return textBlock(opts.hymn ? hymnVerses(it) : it, !opts.repeat);
}

/** Variants with buttons labelled by their rubric. */
function variants(list: ComuneVariant[], build: (v: ComuneVariant) => Node, label: string): Node {
  if (list.length === 1) {
    const v = list[0];
    return h('div', {}, v.rubrica && !/^oppure$/i.test(v.rubrica) ? rubric(v.rubrica) : null, build(v));
  }
  let n = 0;
  const many = list.filter((v) => v.rubrica && /^oppure/i.test(v.rubrica)).length > 1;
  return choice(label, list.map((v) => ({
    label: !v.rubrica ? 'Testo' : !/^oppure/i.test(v.rubrica) ? v.rubrica : `Oppure${many ? ` (${++n})` : ''}`,
    build: () => build(v),
  })));
}

const SLOTS: { part: ComunePart; label: string }[] = [
  { part: 'ant1', label: SLOT_LABEL['1a'] }, { part: 'ant2', label: SLOT_LABEL['2a'] }, { part: 'ant3', label: SLOT_LABEL['3a'] },
];

/** Psalmody of a feast: the Comune's antiphons with the psalms of Sunday of week I. */
function festalPsalmody(comune: Comune, day: LiturgicalDay, liturgy: LiturgyData): Node[] {
  const sunday = psalterDay(liturgy, 1, WEEKDAY_NAMES[0]);
  return SLOTS.map(({ part, label }, i) => {
    const file = sunday ? psalmFile(sunday.psalmAntiphons[i].primary) : undefined;
    const { list } = variantsFor(comune, part, day);
    const unit = (v: ComuneVariant) => {
      if (v.canto && getEntry(v.canto)?.status === 'found') return antiphonWithPsalm(v.canto, label);
      return h('div', { class: 'psalmody-unit' },
        rubric(label), piece(v),
        file ? psalm(file) : null,
        file ? rubric(label) : null, file ? piece(v, { repeat: true }) : null);
    };
    if (!list.length) return notice(`${label}: non è nel libretto.`, 'gap');
    return variants(list, unit, label);
  });
}

function lettura(v: ComuneVariant): HTMLElement {
  return h('div', {},
    h('div', { class: 'lettura' },
      v.rif ? h('p', { class: 'lettura__ref' }, v.rif) : null,
      h('p', { class: 'lettura__it' }, typeof v.it === 'string' ? v.it : '')),
    lectioTone());
}

function responsory(v: ComuneVariant, others: ComuneVariant[]): HTMLElement {
  if (v.it || v.canto) return piece(v);
  // Eastertide responsory printed only as a melody: the text is the ordinary one with alleluia
  const base = others.map((o) => o.it).find((it): it is string => typeof it === 'string');
  return h('div', {},
    notice('Nel Tempo pasquale il libretto dà solo la melodia di questo responsorio (con l’alleluia), non ancora trascritta: qui c’è il testo ordinario.', 'gap'),
    base ? textBlock(base, false) : null);
}

function benedictus(v: ComuneVariant): HTMLElement {
  return h('div', {}, ...antiphonFrame('Antifona al Benedictus', piece(v), benedictusText(), piece(v, { repeat: true })));
}

function oration(v: ComuneVariant, name: string | null): HTMLElement {
  const text = typeof v.it === 'string' ? v.it : '';
  return h('div', {},
    h('p', { class: 'prayer__single' }, text),
    /\bN\./.test(text) && name ? rubricText(`Al posto di N. si dice il nome: ${name}.`) : null);
}

/** Notes of the Comune (what is taken from elsewhere), in the libretto's words. */
function comuneNotes(comune: Comune): Node[] {
  return comune.note.map((n) => rubricText(n));
}

/** The Lodi of a celebration with its Comune. `psalter` renders the weekday psalmody (memorials). */
export function renderComuneLodi(day: LiturgicalDay, liturgy: LiturgyData, opts: {
  mode: Exclude<CelebrationMode, 'feria'>;
  name: string | null;
  comune: string;
  psalter: () => Node[];
  /** Invocations of the weekday, used when the Comune has none. */
  ferialInvocations: LodiConclusion['invocazioni'] | null;
}): HTMLElement {
  const comune = getComune(opts.comune);
  if (!comune) return notice(`Comune sconosciuto: ${opts.comune}`, 'error');
  const part = (p: ComunePart) => variantsFor(comune, p, day).list;
  const festal = opts.mode === 'festa' && comune.salmodia !== 'feria';

  const hymns = part('inno');
  const lett = part('lettura');
  const resp = part('responsorio');
  const bened = part('benedictus');
  const invoc = part('invocazioni');
  const orat = part('orazione');
  const allResp = comune.parti.responsorio ?? [];

  return h('div', { class: 'office' },
    notice(`${opts.mode === 'festa' ? 'Si celebra' : 'Memoria'}${opts.name ? ': ' + opts.name : ''}. Il libretto non ha il Proprio dei Santi: le Lodi si prendono dal libretto, «${comune.titolo}» (${comune.pagine})${festal ? ', con i salmi della Domenica della I settimana' : opts.mode === 'memoria' ? '; la salmodia è quella del giorno' : ''}.`, 'info'),
    ...comuneNotes(comune),
    section('Introduzione', lodiOpening(day)),
    section('Inno', hymns.length ? variants(hymns, (v) => piece(v, { hymn: true }), 'Inno')
      : notice('Il libretto non riporta l’inno per questo tempo.', 'gap')),
    section('Salmodia', ...(festal ? festalPsalmody(comune, day, liturgy) : opts.psalter())),
    section('Lettura breve', lett.length ? variants(lett, lettura, 'Lettura breve') : notice('Lettura breve non presente nel libretto.', 'gap')),
    section('Responsorio breve', resp.length ? variants(resp, (v) => responsory(v, allResp), 'Responsorio breve')
      : notice('Responsorio non presente nel libretto.', 'gap')),
    section('Cantico di Zaccaria', bened.length ? variants(bened, benedictus, 'Antifona al Benedictus')
      : notice('Antifona al Benedictus non presente nel libretto.', 'gap')),
    section('Invocazioni', invoc.length
      ? variants(invoc, (v) => v.it && typeof v.it !== 'string' ? invocations(v.it) : notice('Invocazioni non presenti.', 'gap'), 'Invocazioni')
      : opts.ferialInvocations ? invocations(opts.ferialInvocations) : notice('Invocazioni non presenti nel libretto.', 'gap')),
    section('Padre nostro', paterNoster(paterNosterTone(day))),
    section('Orazione', orat.length ? variants(orat, (v) => oration(v, opts.name), 'Orazione')
      : notice('Orazione non presente nel libretto.', 'gap')),
    section('Benedizione', finalBlessing(comuneBenedicamus(day, opts.mode, opts.comune), opts.mode === 'festa' && solemnBlessing(day))),
  );
}

/** Titles of the Comuni, for the choice between several of them. */
export function comuneTitle(id: string): string {
  return getComune(id)?.titolo.replace(/^Comune (dei|degli|delle|della|di) /, '') ?? id;
}
