import { ROMAN } from '../calendar/calendar';
import type { BenedicamusKey, ComuneBenedicamus, PaterNosterTone } from '../calendar/plan';
import { BENEDICTUS_FILE, chantFileName, ORDINARIO } from '../data/ids';
import { fetchGabc, fetchLettura, fetchPsalm, getEntry, getTexts } from '../data/loader';
import type { AntiphonSlot, Bilingual, LetturaDoc, LiturgyData, LodiConclusion, LodiDay, PsalmDoc, SlotRef } from '../data/types';
import { load, save, STORAGE_KEYS } from '../storage';
import { deferred, foldable, h, notice, selectOne } from './dom';
import { playerControls } from '../audio/controls';
import { splitEuouae, withoutLineBreaks } from 'exsurge';

/** A section of an office: rubric-red heading and its content. */
export function section(title: string, ...content: (Node | null)[]): HTMLElement {
  return h('section', { class: 'office-section' }, h('h2', { class: 'rubric' }, title), ...content);
}

/** Small rubric label inside a section ("1ª antifona", "oppure"…). */
export const rubric = (text: string) => h('p', { class: 'rubric rubric--small' }, text);

/** A rubric of the libretto in running text (what to do, where a part comes from). */
export const rubricText = (...content: (Node | string)[]) => h('p', { class: 'rubric-text' }, ...content);

/** Labels of the antiphons of the psalmody, by slot. */
export const SLOT_LABEL: Record<AntiphonSlot['slot'], string> = {
  '1a': '1ª antifona', '2a': '2ª antifona', '3a': '3ª antifona', unica: 'Antifona',
};

export const NOTICE_LENT_NO_ALLELUIA = 'In Quaresima si omette l’Allelúia finale.';

/** The psalter page of a day of the four weeks in liturgy.json. */
export const psalterDay = (liturgy: LiturgyData, week: number, dayName: string): LodiDay | undefined =>
  liturgy.lodi.weeks.find((w) => w.week === week)?.days.find((d) => d.day === dayName);

/** Invocations and oration of a day of the psalter (testi/lodi-conclusioni.json). */
export const lodiConclusion = (week: number, dayName: string): LodiConclusion | undefined =>
  getTexts().lodi.find((e) => e.week === week && e.day === dayName);

async function buildChant(id: string, repeat = false): Promise<Node> {
  const entry = getEntry(id);
  if (!entry) return notice(`Canto sconosciuto: ${id}`, 'error');
  if (entry.status !== 'found') {
    return notice(entry.notFoundReason ?? entry.notApplicableReason ?? 'Melodia non disponibile.', 'gap');
  }
  const { mode, body: full } = await fetchGabc(id);
  // the antiphon repeated after the psalm is sung without the EUOUAE
  const body = joinLines(repeat ? splitEuouae(full).main.trimEnd() : full);
  // <chant-visual> reads its source and attributes when it is connected, and
  // stays empty (drawn as empty staves by the CSS) until the score is laid out
  const cv = document.createElement('chant-visual');
  if (mode) cv.setAttribute('annotation', modeLabel(mode));
  cv.textContent = body;
  return h('div', { class: 'score' }, h('div', {}, cv), playerControls(body, chantFileName(entry.file ?? id), mode, repeat, cv));
}

/**
 * Removes the forced line breaks of the source, so stanzas and verses run on
 * one after the other and exsurge breaks lines only where the width requires.
 */
const joinLines = withoutLineBreaks;

function modeLabel(mode: string): string {
  const n = Number(mode);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
}

/** The chant of a gabc/index.json id. */
export const chant = (id: string, opts: { repeat?: boolean } = {}): HTMLElement =>
  deferred(() => buildChant(id, opts.repeat ?? false), 'score');

// --- translations -----------------------------------------------------------------

/**
 * The Italian translation printed in the libretto under a chant. Hymns are
 * folded away and laid out one line per verse ("/" in the data), a blank
 * line between stanzas.
 */
export function translation(it: string | null | undefined, opts: { hymn?: boolean } = {}): HTMLElement | null {
  if (!it) return null;
  if (!opts.hymn) return h('p', { class: 'translation' }, it);
  return foldable('Traduzione', h('p', { class: 'translation' }, hymnVerses(it)));
}

/** A hymn text of the data ("/" between verses, a newline between stanzas), one verse per line. */
export const hymnVerses = (it: string): string => it.replace(/\n/g, '\n\n').replace(/\s*\/\s*/g, '\n');

// --- psalm language ---------------------------------------------------------------

type PsalmLang = 'it' | 'la' | 'both';
const LANG_LABELS: [PsalmLang, string][] = [['it', 'Italiano'], ['la', 'Latino'], ['both', 'Entrambi']];
const langBars = new Set<HTMLElement>();

function savedLang(): PsalmLang {
  const v = load(STORAGE_KEYS.psalmLang);
  return v === 'it' || v === 'la' || v === 'both' ? v : 'it';
}

/** The language of the psalm texts, shared by every psalm on the page (and remembered). */
function setPsalmLang(lang: PsalmLang): void {
  document.documentElement.dataset.psalmLang = lang;
  save(STORAGE_KEYS.psalmLang, lang);
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

/** A psalm or canticle, loaded from its file. */
export const psalm = (file: string): HTMLElement => deferred(async () => psalmText(await fetchPsalm(file)));

/** The Benedictus, sung at every Lodi. */
export const benedictus = (): HTMLElement => psalm(BENEDICTUS_FILE);

function psalmText(doc: PsalmDoc): HTMLElement {
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

/** The psalm or canticle that a chant (antiphon, canticle tone) belongs to, if any. */
export const psalmFile = (id: string): string | undefined => getEntry(id)?.psalm?.file;

/**
 * Antiphon, the psalm or canticle it belongs to, and the antiphon again after
 * it, written out exactly as above. `repeat`/`repeatLabel` are for the Nunc
 * dimittis, where the chant above the text is the canticle tone and the one
 * after it is the antiphon.
 */
export function antiphonWithPsalm(id: string, label: string, repeat: string = id, repeatLabel: string = label): HTMLElement {
  const file = psalmFile(id);
  return h('div', { class: 'psalmody-unit' },
    rubric(label),
    chant(id),
    file ? psalm(file) : null,
    file ? rubric(repeatLabel) : null,
    file ? chant(repeat, { repeat: true }) : null,
  );
}

/**
 * A canticle (or psalm) between its antiphon and the antiphon sung again,
 * each under the same rubric: the Benedictus and the Nunc dimittis.
 */
export const antiphonFrame = (label: string, before: Node, text: Node | null, after: Node): (Node | null)[] =>
  [rubric(label), before, text, rubric(label), after];

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
  return foldable('Come cantare la lettura (tono della lettura breve)',
    rubricText(
      'Si recita sulla corda (do). Flessa (†): dopo l’ultimo accento si scende di una terza (la). ' +
      'Metro (*): le sillabe prima dell’ultimo accento scendono do-si-la, l’accento torna sul do. ' +
      'Punto (fine della lettura): l’ultimo accento scende al la, le sillabe seguenti al sol e l’ultima risale sol-la. ' +
      'Le note vuote si cantano solo se ci sono sillabe in più dopo l’accento.'),
    chant(ORDINARIO.lectio));
}

/**
 * A two-or-more-way choice (e.g. hymn text, Marian tone): buttons on top,
 * the chosen content below, built lazily so <chant-visual> lays out against
 * a visible container.
 */
export function choice(label: string, options: { label: string; build: () => Node }[], initial = 0): HTMLElement {
  const panel = h('div', { class: 'choice__panel' });
  const buttons = options.map((opt) => h('button', { type: 'button', class: 'choice__button' }, opt.label));
  selectOne(buttons, (i) => panel.replaceChildren(options[i].build()))(initial);
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

const PN_TONES: { tone: PaterNosterTone; label: string }[] = [
  { tone: 'A', label: 'Tono A · ferie del T.O.' },
  { tone: 'B', label: 'Tono B · Avvento e Quaresima' },
  { tone: 'C', label: 'Tono C · Pasqua e feste' },
];

/** Invitation, the Pater noster sung in the tone of the day (libretto pp. 316-318), and its text. */
export function paterNoster(tone: PaterNosterTone): HTMLElement {
  const { paterNoster: pn } = getTexts().ordinario;
  return h('div', {},
    h('div', { class: 'prayer-invite' }, bilingual(pn.invito)),
    choice('Tono del Pater noster',
      PN_TONES.map((t) => ({ label: t.label, build: () => chant(ORDINARIO.paterNoster(t.tone)) })),
      PN_TONES.findIndex((t) => t.tone === tone)),
    foldable('Testo e traduzione', bilingual(pn)));
}

const BENEDICAMUS_LABEL: Record<BenedicamusKey | ComuneBenedicamus | 'memorie-alt', string> = {
  solennita: 'Nelle solennità', feste: 'Nelle feste', 'memorie': 'Nelle memorie', 'memorie-alt': 'Nelle memorie (oppure)',
  bvm: 'Nelle feste della B. V. Maria', sabato: 'Nell’ufficio di S. Maria in sabato', domeniche: 'Nelle domeniche per annum',
  pasqua: 'A Pasqua e durante l’Ottava', 'tempo-pasquale': 'Nel Tempo pasquale', ferie: 'Nelle ferie per annum',
  'avvento-quaresima': 'Nelle ferie di Avvento e Quaresima',
};

/** Blessing and dismissal at the end of Lodi, sung as in the libretto (pp. 318-321). */
export function finalBlessing(benedicamus: BenedicamusKey | ComuneBenedicamus, solemn: boolean): HTMLElement {
  const b = getTexts().ordinario.benedizione;
  const others = (Object.keys(BENEDICAMUS_LABEL) as (keyof typeof BENEDICAMUS_LABEL)[]).filter((k) => k !== benedicamus);
  return h('div', {},
    rubric(b.conMinistro.titolo),
    choice('Tono della benedizione', [
      { label: 'Tono semplice', build: () => chant(ORDINARIO.blessing.simple) },
      { label: 'Tono solenne', build: () => chant(ORDINARIO.blessing.solemn) },
    ], solemn ? 1 : 0),
    rubric(b.senzaMinistro.titolo), bilingual(b.senzaMinistro),
    rubric(`Congedo · ${BENEDICAMUS_LABEL[benedicamus]}`),
    chant(ORDINARIO.benedicamus(benedicamus)),
    foldable('Altre melodie del Benedicamus Domino',
      ...others.map((k) => h('div', {}, rubric(BENEDICAMUS_LABEL[k]), chant(ORDINARIO.benedicamus(k))))));
}
