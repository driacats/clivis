import { fetchGabc, fetchLettura, fetchPsalm, getEntry, getTexts } from '../data/loader';
import type { Bilingual, LetturaDoc, LodiConclusion, PsalmDoc, SlotRef } from '../data/types';
import { deferred, h, notice } from './dom';
import { playerControls } from '../audio/controls';
import { splitEuouae } from '../audio/gabcMelody';

/** A section of an office: rubric-red heading and its content. */
export function section(title: string, ...content: (Node | null)[]): HTMLElement {
  return h('section', { class: 'office-section' }, h('h2', { class: 'rubric' }, title), ...content);
}

/** Small rubric label inside a section ("1ª antifona", "oppure"…). */
export const rubric = (text: string) => h('p', { class: 'rubric rubric--small' }, text);

async function buildChant(id: string, repeat = false): Promise<Node> {
  const entry = getEntry(id);
  if (!entry) return notice(`Canto sconosciuto: ${id}`, 'error');
  if (entry.status !== 'found') {
    return notice(entry.notFoundReason ?? entry.notApplicableReason ?? 'Melodia non disponibile.', 'gap');
  }
  const { mode, body: full } = await fetchGabc(id);
  // the antiphon repeated after the psalm is sung without the EUOUAE
  const body = repeat ? splitEuouae(full).main.trimEnd() : full;
  // <chant-visual> reads its source and attributes when it is connected
  const cv = document.createElement('chant-visual');
  if (mode) cv.setAttribute('annotation', modeLabel(mode));
  cv.textContent = body;
  return h('div', { class: 'score' }, h('div', {}, cv), playerControls(body, (entry.file ?? id).split('/').pop() ?? id, mode, repeat));
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function modeLabel(mode: string): string {
  const n = Number(mode);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
}

/** The chant of a gabc/index.json id. */
export const chant = (id: string, opts: { repeat?: boolean } = {}): HTMLElement =>
  deferred(() => buildChant(id, opts.repeat ?? false));

export function psalmText(doc: PsalmDoc): HTMLElement {
  const bilingual = doc.verses.some((v) => v.la);
  return h('div', { class: `psalm${bilingual ? ' psalm--bilingual' : ''}` },
    h('h3', { class: 'psalm__title' }, doc.ref, h('span', { class: 'psalm__subtitle' }, doc.title)),
    doc.epigraph ? h('p', { class: 'psalm__epigraph' }, doc.epigraph) : null,
    h('div', { class: 'psalm__verses' },
      ...doc.verses.map((v) => h('div', { class: 'psalm__verse' },
        verseLines(v.it, 'psalm__it'),
        v.la ? verseLines(v.la, 'psalm__la', 'la') : null))),
  );
}

/**
 * A verse laid out as in the libretto: the first half ends with the mediant
 * asterisk (or the flex †), the rest goes on indented lines.
 */
function verseLines(text: string, cls: string, lang?: string): HTMLElement {
  const parts = text.split(/(?<=[*†])\s+/);
  return h('p', { class: cls, lang },
    ...parts.map((part, i) => h('span', { class: i === 0 ? 'psalm__line' : 'psalm__line psalm__line--cont' }, part)));
}

/**
 * Antiphon, the psalm or canticle it belongs to, and the antiphon again after
 * it, written out exactly as above. `repeat`/`repeatLabel` are for the Nunc
 * dimittis, where the chant above the text is the canticle tone and the one
 * after it is the antiphon.
 */
export function antiphonWithPsalm(id: string, label: string, repeat: string = id, repeatLabel: string = label): HTMLElement {
  const psalm = getEntry(id)?.psalm;
  return h('div', { class: 'psalmody-unit' },
    rubric(label),
    chant(id),
    psalm ? deferred(async () => psalmText(await fetchPsalm(psalm.file))) : null,
    psalm ? rubric(repeatLabel) : null,
    psalm ? chant(repeat, { repeat: true }) : null,
  );
}

function lettura(doc: LetturaDoc): HTMLElement {
  return h('div', { class: 'lettura' },
    h('p', { class: 'lettura__ref' }, doc.ref),
    h('p', { class: 'lettura__it' }, doc.it),
    doc.la ? h('p', { class: 'lettura__la', lang: 'la' }, doc.la) : null,
  );
}

export function letturaBreve(ref: SlotRef): HTMLElement {
  if (ref.kind === 'gap') return notice(ref.note, 'gap');
  const file = ref.file;
  return deferred(async () => lettura(await fetchLettura(file)));
}

/**
 * A two-or-more-way choice (e.g. hymn text, Marian tone): buttons on top,
 * the chosen content below, built lazily so <chant-visual> lays out against
 * a visible container.
 */
export function choice(label: string, options: { label: string; build: () => Node }[], initial = 0): HTMLElement {
  const panel = h('div', { class: 'choice__panel' });
  const buttons = options.map((opt, i) => {
    const b = h('button', { type: 'button', class: 'choice__button', 'aria-pressed': String(i === initial) }, opt.label);
    b.addEventListener('click', () => select(i));
    return b;
  });
  function select(i: number) {
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    panel.replaceChildren(options[i].build());
  }
  select(initial);
  return h('div', { class: 'choice' },
    h('div', { class: 'choice__bar', role: 'group', 'aria-label': label }, ...buttons),
    panel);
}

/** Prayer text in Latin and Italian side by side (stacked on phones), ℟. in red. */
export function bilingual(text: Bilingual): HTMLElement {
  const para = (s: string, cls: string, lang?: string) =>
    h('p', { class: cls, lang }, ...s.split(/(℟\.)/).map((part) => part === '℟.' ? h('span', { class: 'response-sign' }, '℟.') : part));
  return h('div', { class: 'prayer prayer--bilingual' }, para(text.la, 'prayer__la', 'la'), para(text.it, 'prayer__it'));
}

export function invocations(inv: LodiConclusion['invocazioni']): HTMLElement {
  return h('div', { class: 'invocations' },
    h('p', { class: 'invocations__intro' }, inv.intro),
    h('p', { class: 'invocations__response' }, h('span', { class: 'response-sign' }, '℟. '), inv.response),
    ...inv.intercessions.map((i) => h('div', { class: 'invocations__item' },
      h('p', { class: 'invocations__petition' }, i.petition),
      h('p', { class: 'invocations__answer' }, '— ', i.answer))),
  );
}

export function paterNoster(): HTMLElement {
  const { paterNoster: pn } = getTexts().ordinario;
  return h('div', {}, h('div', { class: 'prayer-invite' }, bilingual(pn.invito)), bilingual(pn));
}

const BENEDICAMUS_LABEL: Record<string, string> = {
  solennita: 'Nelle solennità', feste: 'Nelle feste', 'memorie': 'Nelle memorie', 'memorie-alt': 'Nelle memorie (oppure)',
  bvm: 'Nelle feste della B. V. Maria', sabato: 'Nell’ufficio di S. Maria in sabato', domeniche: 'Nelle domeniche per annum',
  pasqua: 'A Pasqua e durante l’Ottava', 'tempo-pasquale': 'Nel Tempo pasquale', ferie: 'Nelle ferie per annum',
  'avvento-quaresima': 'Nelle ferie di Avvento e Quaresima',
};

/** Blessing and dismissal at the end of Lodi, sung as in the libretto (pp. 318-321). */
export function finalBlessing(benedicamus: string, solemn: boolean): HTMLElement {
  const b = getTexts().ordinario.benedizione;
  const others = Object.keys(BENEDICAMUS_LABEL).filter((k) => k !== benedicamus);
  return h('div', {},
    rubric(b.conMinistro.titolo),
    choice('Tono della benedizione', [
      { label: 'Tono semplice', build: () => chant('ordinario.BEN1') },
      { label: 'Tono solenne', build: () => chant('ordinario.BEN2') },
    ], solemn ? 1 : 0),
    rubric(b.senzaMinistro.titolo), bilingual(b.senzaMinistro),
    rubric(`Congedo · ${BENEDICAMUS_LABEL[benedicamus]}`),
    chant(`ordinario.BD-${benedicamus}`),
    h('details', { class: 'alternative' },
      h('summary', {}, 'Altre melodie del Benedicamus Domino'),
      ...others.map((k) => h('div', {}, rubric(BENEDICAMUS_LABEL[k]), chant(`ordinario.BD-${k}`)))));
}
