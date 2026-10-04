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
  const body = joinLines(repeat ? splitEuouae(full).main.trimEnd() : full);
  // <chant-visual> reads its source and attributes when it is connected
  const cv = document.createElement('chant-visual');
  if (mode) cv.setAttribute('annotation', modeLabel(mode));
  cv.textContent = body;
  return h('div', { class: 'score' }, h('div', {}, cv), playerControls(body, (entry.file ?? id).split('/').pop() ?? id, mode, repeat));
}

/**
 * Removes the forced line breaks of the source (z, Z, z-, Z-, often after a
 * custos as in "(::h+Z)"), so stanzas and verses run on one after the other
 * and exsurge breaks lines only where the width requires. "z0" (automatic
 * custos) is kept.
 */
export function joinLines(body: string): string {
  return body.replace(/\(([^)]*)\)/g, (_, g: string) =>
    '(' + g.replace(/[a-mA-M]\+(?=\s*[zZ](?!0))/g, '').replace(/[zZ](?!0)[+-]?/g, '') + ')');
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function modeLabel(mode: string): string {
  const n = Number(mode);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
}

/** The chant of a gabc/index.json id. */
export const chant = (id: string, opts: { repeat?: boolean } = {}): HTMLElement =>
  deferred(() => buildChant(id, opts.repeat ?? false));

// --- psalm language ---------------------------------------------------------------

export type PsalmLang = 'it' | 'la' | 'both';
const LANG_KEY = 'psalmLang';
const LANG_LABELS: [PsalmLang, string][] = [['it', 'Italiano'], ['la', 'Latino'], ['both', 'Entrambi']];
const langBars = new Set<HTMLElement>();

function savedLang(): PsalmLang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'it' || v === 'la' || v === 'both') return v;
  } catch { /* storage unavailable */ }
  return 'it';
}

/** The language of the psalm texts, shared by every psalm on the page (and remembered). */
function setPsalmLang(lang: PsalmLang): void {
  document.documentElement.dataset.psalmLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  for (const bar of langBars) {
    if (!bar.isConnected) { langBars.delete(bar); continue; }
    bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
}
document.documentElement.dataset.psalmLang = savedLang();

function langToggle(): HTMLElement {
  const current = document.documentElement.dataset.psalmLang;
  const bar = h('div', { class: 'lang-toggle', role: 'group', 'aria-label': 'Lingua del salmo' },
    ...LANG_LABELS.map(([lang, label]) => {
      const b = h('button', { type: 'button', class: 'lang-toggle__button', 'data-lang': lang, 'aria-pressed': String(current === lang) }, label);
      b.addEventListener('click', () => setPsalmLang(lang));
      return b;
    }));
  langBars.add(bar);
  return bar;
}

export function psalmText(doc: PsalmDoc): HTMLElement {
  const bilingual = doc.verses.some((v) => v.la);
  return h('div', { class: `psalm${bilingual ? ' psalm--bilingual' : ' psalm--it-only'}` },
    h('div', { class: 'psalm__head' },
      h('h3', { class: 'psalm__title' }, doc.ref, h('span', { class: 'psalm__subtitle' }, doc.title)),
      langToggle()),
    doc.epigraph ? h('p', { class: 'psalm__epigraph' }, doc.epigraph) : null,
    bilingual ? null : h('p', { class: 'psalm__no-la' }, 'Il testo latino di questo salmo non è ancora nel breviario: qui c’è quello italiano.'),
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
  return h('div', {}, deferred(async () => lettura(await fetchLettura(file))), lectioTone());
}

/** How to sing the short reading: the model of the libretto (p. 311). */
export function lectioTone(): HTMLElement {
  return h('details', { class: 'alternative' },
    h('summary', {}, 'Come cantare la lettura (tono della lettura breve)'),
    h('p', { class: 'rubric-text' },
      'Si recita sulla corda (do). Flessa (†): dopo l’ultimo accento si scende di una terza (la). ' +
      'Metro (*): le sillabe prima dell’ultimo accento scendono do-si-la, l’accento torna sul do. ' +
      'Punto (fine della lettura): l’ultimo accento scende al la, le sillabe seguenti al sol e l’ultima risale sol-la. ' +
      'Le note vuote si cantano solo se ci sono sillabe in più dopo l’accento.'),
    chant('ordinario.LECTIO'));
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

const PN_TONES: { tone: 'A' | 'B' | 'C'; label: string }[] = [
  { tone: 'A', label: 'Tono A · ferie del T.O.' },
  { tone: 'B', label: 'Tono B · Avvento e Quaresima' },
  { tone: 'C', label: 'Tono C · Pasqua e feste' },
];

/** Invitation, the Pater noster sung in the tone of the day (libretto pp. 316-318), and its text. */
export function paterNoster(tone: 'A' | 'B' | 'C'): HTMLElement {
  const { paterNoster: pn } = getTexts().ordinario;
  return h('div', {},
    h('div', { class: 'prayer-invite' }, bilingual(pn.invito)),
    choice('Tono del Pater noster',
      PN_TONES.map((t) => ({ label: t.label, build: () => chant(`ordinario.PN-${t.tone}`) })),
      PN_TONES.findIndex((t) => t.tone === tone)),
    h('details', { class: 'alternative' }, h('summary', {}, 'Testo e traduzione'), bilingual(pn)));
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
