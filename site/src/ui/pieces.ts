import { fetchGabc, fetchLettura, fetchPsalm, getEntry } from '../data/loader';
import type { LetturaDoc, PsalmDoc, SlotRef } from '../data/types';
import { deferred, h, notice } from './dom';

/** A section of an office: rubric-red heading and its content. */
export function section(title: string, ...content: (Node | null)[]): HTMLElement {
  return h('section', { class: 'office-section' }, h('h2', { class: 'rubric' }, title), ...content);
}

/** Small rubric label inside a section ("1ª antifona", "oppure"…). */
export const rubric = (text: string) => h('p', { class: 'rubric rubric--small' }, text);

async function buildChant(id: string, dropCap = true): Promise<Node> {
  const entry = getEntry(id);
  if (!entry) return notice(`Canto sconosciuto: ${id}`, 'error');
  if (entry.status !== 'found') {
    return notice(entry.notFoundReason ?? entry.notApplicableReason ?? 'Melodia non disponibile.', 'gap');
  }
  const { mode, body } = await fetchGabc(id);
  // <chant-visual> reads its source and attributes when it is connected
  const cv = document.createElement('chant-visual');
  if (dropCap) {
    if (mode) cv.setAttribute('annotation', modeLabel(mode));
    cv.textContent = body;
  } else {
    // a repeat: no large initial, no mode, and the first word in normal case
    // ("IN nóctibus" -> "In nóctibus", the capitals belong to the drop cap)
    cv.setAttribute('use-drop-cap', 'false');
    cv.textContent = body.replace(/^((?:\([^)]*\)\s*)*)(\p{Lu})(\p{Lu}+)/u,
      (_m, clef: string, first: string, rest: string) => clef + first + rest.toLowerCase());
  }
  return h('div', { class: 'score' }, h('div', {}, cv));
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function modeLabel(mode: string): string {
  const n = Number(mode);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
}

/** The chant of a gabc/index.json id; repeats are drawn without the large initial. */
export const chant = (id: string, opts: { dropCap?: boolean } = {}): HTMLElement =>
  deferred(() => buildChant(id, opts.dropCap ?? true));

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
 * it, as it is sung. `repeat` is the antiphon to sing after the text when it
 * differs from the chant above it (the Nunc dimittis: tone above, antiphon after).
 */
export function antiphonWithPsalm(id: string, label: string, repeat: string = id): HTMLElement {
  const psalm = getEntry(id)?.psalm;
  return h('div', { class: 'psalmody-unit' },
    rubric(label),
    chant(id),
    psalm ? deferred(async () => psalmText(await fetchPsalm(psalm.file))) : null,
    psalm ? rubric('Si ripete l’antifona') : null,
    psalm ? chant(repeat, { dropCap: false }) : null,
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
