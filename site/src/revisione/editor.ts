// The review page of one chant: the score to correct by clicking on it, the
// tools for the selected note, syllable and piece, and the review itself
// (draft, send for approval, approve or send back, comments).
import { ROMAN } from '../calendar/calendar';
import { playerControls } from '../audio/controls';
import { h, notice } from '../ui/dom';
import { joinLines } from '../ui/pieces';
import { api, ApiError, type Azione, type Revisione, type Utente } from './api';
import { descrizione, type Canto } from './catalog';
import {
  ACCIDENTALS, BAR_LABELS, CLEF_LIST, getAccidental, setAccidental, JOINS, LIQUESCENCES, SHAPES, deleteNote, deleteSyllable, editNote, firstClef, getBarAfter,
  hasSign, headerField, insertNoteAfter, insertSyllableAfter, joinAfter, movePitch, noteLiquescence, noteRefs, noteShape,
  parseBody, serializeBody, setBarAfter, setDebilis, setFirstClef, setHeaderField, setJoinAfter, setLiquescence,
  setShape, setSyllableText, splitFile, splitNote, toggleSign, wordOf, type GabcBody, type NoteRef, type Sign,
} from './gabcModel';
import { icon } from './icons';
import { ScoreView } from './score';
import { statoPill, quando } from './ui';

// --- pitch names --------------------------------------------------------------------

const NOMI = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const LINEA: Record<string, number> = { 1: 3, 2: 5, 3: 7, 4: 9 }; // gabc d f h j

function clefBefore(b: GabcBody, ref: NoteRef): string {
  let clef = 'c4';
  for (let si = 0; si <= ref.syl; si++) {
    const n = b.syllables[si].notation ?? [];
    const end = si === ref.syl ? ref.atom : n.length;
    for (let ai = 0; ai < end; ai++) if (n[ai].kind === 'clef') clef = n[ai].s;
  }
  return clef;
}

function pitchName(b: GabcBody, ref: NoteRef): string {
  const clef = clefBefore(b, ref);
  const p = splitNote(b.syllables[ref.syl].notation![ref.atom].s).pitch.toLowerCase();
  const pos = 'abcdefghijklm'.indexOf(p);
  const line = LINEA[clef[clef.length - 1]] ?? 9;
  const base = clef.startsWith('f') ? 3 : 0;
  const name = NOMI[(((pos - line + base) % 7) + 7) % 7];
  return name === 'Si' && clef.startsWith('cb') ? 'Si♭' : name;
}

const modeLabel = (mode: string | null) => {
  if (!mode) return null;
  const n = Number(mode);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
};

// --- changed syllables (for the marks on the score) ------------------------------------

function changedNotes(before: GabcBody, after: GabcBody): number[] {
  const key = (s: GabcBody['syllables'][number]) => s.lead + s.text + '(' + (s.notation ?? []).map((a) => a.s).join('') + ')';
  const a = before.syllables.map(key), b = after.syllables.map(key);
  // longest common subsequence of the syllables
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const same = new Set<number>();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { same.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const out: number[] = [];
  noteRefs(after).forEach((r, k) => { if (!same.has(r.syl)) out.push(k); });
  return out;
}

// --- small UI helpers -----------------------------------------------------------------

/** A row of mutually exclusive options, as a segmented control of `cols` columns. */
/** A button's content: the little picture of what it does (if there is one) and its name. */
function optContent(b: HTMLButtonElement, text: string, iconKey: string | null): HTMLButtonElement {
  const svg = iconKey === null ? null : icon(iconKey);
  if (svg !== null) {
    b.classList.add('ed-seg__opt--icon');
    b.insertAdjacentHTML('beforeend', svg);
  }
  b.append(h('span', { class: 'ed-seg__text' }, text));
  return b;
}

function seg<T extends string>(label: string, options: [T, string][], current: T | null, pick: (v: T) => void, cols: number, disabled = false, iconFor?: (v: T) => string): HTMLElement {
  const g = h('div', { class: 'ed-seg', role: 'group', 'aria-label': label },
    ...options.map(([v, text]) => {
      const b = optContent(h('button', { type: 'button', class: 'ed-seg__opt', 'aria-pressed': String(current === v), disabled, title: text }), text, iconFor ? iconFor(v) : null);
      b.addEventListener('click', () => pick(v));
      return b;
    }),
    // empty cells that complete the last row
    ...Array.from({ length: (cols - (options.length % cols)) % cols }, () => h('span', { class: 'ed-seg__fill', 'aria-hidden': 'true' })));
  g.style.setProperty('--cols', String(cols));
  return h('div', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, label), g);
}

/** Independent on/off options. */
function toggles<T extends string>(label: string, options: [T, string, boolean][], flip: (v: T) => void): HTMLElement {
  const g = h('div', { class: 'ed-seg ed-seg--toggles', role: 'group', 'aria-label': label },
    ...options.map(([v, text, on]) => {
      const b = optContent(h('button', { type: 'button', class: 'ed-seg__opt', 'aria-pressed': String(on), title: text }), text, v);
      b.addEventListener('click', () => flip(v));
      return b;
    }));
  g.style.setProperty('--cols', String(options.length));
  return h('div', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, label), g);
}

function button(text: string, onClick: () => void, opts: { cls?: string; title?: string; disabled?: boolean } = {}): HTMLButtonElement {
  const b = h('button', { type: 'button', class: opts.cls ?? 'ed-button', title: opts.title, disabled: opts.disabled }, text);
  b.addEventListener('click', onClick);
  return b;
}

// --- the page -------------------------------------------------------------------------

export interface EditorPage {
  el: HTMLElement;
  /** true when there are unsaved changes */
  dirty(): boolean;
  dispose(): void;
}

export function renderEditor(canto: Canto, rev: Revisione, me: Utente, nav: { prev?: Canto; next?: Canto }, refresh: () => void): EditorPage {
  const admin = me.ruolo === 'admin';
  const nomi = rev.nomi ?? {};
  const nome = (n: string | null) => (n ? nomi[n] ?? n : '');
  let record = rev;
  const readOnly = () => record.stato === 'approvato' && !admin;

  // the file being edited: header (kept as it is, except the mode) and body
  const start = record.gabc ?? record.sito;
  let { header } = splitFile(start);
  let body = parseBody(splitFile(start).body);
  const siteBody = parseBody(splitFile(record.sito).body);
  let saved = start;
  const history: string[] = [start];
  let pos = 0;
  /** the note the tools show (the last one clicked) */
  let sel: number | null = null;
  /** every selected note (Shift+click for a range, Ctrl/Cmd+click to add one, double click for a neume) */
  let chosen: number[] = [];
  /** where a Shift range starts */
  let anchor: number | null = null;
  let aligned = true;
  /** the syllable or word being added (its text field is open in the tools) */
  let adding: 'sillaba' | 'parola' | null = null;

  const allSel = (): number[] => (sel === null ? [] : chosen.includes(sel) ? chosen : [...chosen, sel].sort((a, b) => a - b));
  function setSel(list: number[], focus: number | null, from: number | null = focus): void {
    chosen = [...new Set(list)].sort((a, b) => a - b);
    sel = focus;
    anchor = from;
  }
  const text = () => header + serializeBody(body);
  const dirty = () => text() !== saved;

  const score = new ScoreView(true);
  const original = new ScoreView(false);
  const panel = h('aside', { class: 'ed-panel', 'aria-label': 'Strumenti' });
  const playerSlot = h('div', { class: 'ed-player' });
  const status = h('div', { class: 'ed-status' });
  const reviewBox = h('section', { class: 'ed-review', 'aria-label': 'Revisione' });
  const warn = h('div', {});
  const compare = h('details', { class: 'alternative ed-compare' }, h('summary', {}, 'Com’è ora sul sito'), original.el);
  compare.addEventListener('toggle', () => {
    if (compare.open && !original.chant) {
      const f = splitFile(record.sito);
      original.show(joinLines(f.body), modeLabel(headerField(f.header, 'mode')), 0);
    }
  });

  // -- applying a change
  function commit(newBody: GabcBody, newSel: number | null = sel, newHeader = header): void {
    // the selection survives edits that keep the notes where they are
    if (newSel !== sel || noteRefs(newBody).length !== noteRefs(body).length) setSel(newSel === null ? [] : [newSel], newSel);
    body = newBody;
    header = newHeader;
    const t = text();
    if (t === history[pos]) { update(false); return; }
    history.splice(pos + 1);
    history.push(t);
    pos = history.length - 1;
    update(true);
  }

  function goto(p: number): void {
    if (p < 0 || p >= history.length) return;
    pos = p;
    const f = splitFile(history[pos]);
    header = f.header;
    body = parseBody(f.body);
    const n = noteRefs(body).length;
    if (sel !== null && sel >= n) sel = n ? n - 1 : null;
    chosen = chosen.filter((i) => i < n);
    update(true);
  }

  // -- drawing
  function update(redraw: boolean): void {
    const refs = noteRefs(body);
    if (redraw) {
      score.show(joinLines(serializeBody(body)), modeLabel(headerField(header, 'mode')), refs.length);
    } else {
      score.select(allSel(), sel);
    }
    renderPanel();
    renderReview();
  }

  score.onDrawn = (cv, ok) => {
    aligned = ok;
    score.mark(changedNotes(siteBody, body));
    score.select(allSel(), sel);
    warn.replaceChildren(ok ? '' : notice('Questo spartito contiene una notazione che l’editor non sa ancora collegare alle note: puoi correggerlo dal codice GABC, in fondo agli strumenti.', 'gap'));
    const f = serializeBody(body);
    playerSlot.replaceChildren(playerControls(f, record.file.split('/').pop() ?? 'canto', headerField(header, 'mode'), false, cv));
    renderPanel();
  };
  score.onPick = (i, mode) => {
    if (readOnly()) return;
    if (mode === 'single' || sel === null) setSel([i], i);
    else if (mode === 'range') {
      const from = anchor ?? sel;
      const lo = Math.min(from, i), hi = Math.max(from, i);
      setSel(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k), i, from);
    } else if (mode === 'toggle') {
      const cur = allSel();
      if (cur.includes(i) && cur.length > 1) {
        const rest = cur.filter((x) => x !== i);
        setSel(rest, rest[rest.length - 1]);
      } else setSel([...cur, i], i);
    } else {
      const n = neumeOf(i);
      setSel(n, i, n[0]);
    }
    adding = null;
    if (tab === 'brano') tab = 'nota';
    score.select(allSel(), sel);
    renderPanel();
  };

  /** The notes of the neume of note i: those of its syllable written together, with no space in between. */
  function neumeOf(i: number): number[] {
    const refs = noteRefs(body);
    const joined = (a: NoteRef, b: NoteRef) => a.syl === b.syl && (a.atom === b.atom || b.atom === a.atom + 1);
    let lo = i, hi = i;
    while (lo > 0 && joined(refs[lo - 1], refs[lo])) lo--;
    while (hi < refs.length - 1 && joined(refs[hi], refs[hi + 1])) hi++;
    return Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
  }

  /** Applies a change to every selected note (once per gabc atom: "gsss" is one atom). */
  function editSelected(f: Parameters<typeof editNote>[2]): void {
    const refs = noteRefs(body);
    const seen = new Set<string>();
    let out = body;
    for (const i of allSel()) {
      const r = refs[i];
      const k = `${r.syl}:${r.atom}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out = editNote(out, r, f);
    }
    commit(out);
  }

  /** The value all selected notes share, or null when they differ. */
  function common<T>(get: (p: ReturnType<typeof splitNote>) => T): T | null {
    const refs = noteRefs(body);
    const vals = allSel().map((i) => get(splitNote(body.syllables[refs[i].syl].notation![refs[i].atom].s)));
    return vals.length && vals.every((v) => v === vals[0]) ? vals[0] : null;
  }

  // -- tools: a side pane with three tabs (note, syllable, piece), sized to fit without scrolling
  type Tab = 'nota' | 'sillaba' | 'brano';
  let tab: Tab = 'nota';
  /** the GABC box of the piece tab stays open across redraws */
  let gabcOpen = false;

  function renderPanel(): void {
    const refs = noteRefs(body);
    const ref = sel !== null ? refs[sel] : undefined;
    const ro = readOnly();

    const head = h('div', { class: 'ed-panel__head' },
      button('↶', () => goto(pos - 1), { cls: 'ed-icon', disabled: pos === 0 || ro, title: 'Annulla (Ctrl+Z)' }),
      button('↷', () => goto(pos + 1), { cls: 'ed-icon', disabled: pos >= history.length - 1 || ro, title: 'Ripeti (Ctrl+Maiusc+Z)' }),
      h('span', { class: `ed-panel__state${dirty() ? ' ed-panel__state--dirty' : ''}` }, ro ? 'Sola lettura' : dirty() ? 'Modifiche non salvate' : 'Tutto salvato'),
      ro ? null : button('Salva', () => act('salva'), { cls: 'ed-button ed-button--primary ed-button--small', disabled: !dirty(), title: 'Salva la bozza (Ctrl+S)' }));

    const tabs = h('div', { class: 'ed-tabs', role: 'tablist', 'aria-label': 'Strumenti' },
      ...([['nota', 'Nota'], ['sillaba', 'Sillaba'], ['brano', 'Brano']] as [Tab, string][]).map(([t, label]) => {
        const b = h('button', { type: 'button', role: 'tab', class: 'ed-tabs__tab', 'aria-selected': String(tab === t), disabled: ro }, label);
        b.addEventListener('click', () => { tab = t; adding = null; renderPanel(); });
        return b;
      }));

    const content: Node[] = [];
    const hint = (t: string) => content.push(h('p', { class: 'ed-panel__hint' }, t));

    if (ro) {
      hint('Questo canto è già approvato: non si può più modificare.');
    } else if (tab !== 'brano' && !ref) {
      hint(aligned
        ? 'Fai clic su una nota dello spartito per correggerla.'
        : 'Le note di questo spartito non si possono selezionare: correggilo dal codice GABC, nella scheda «Brano».');
    } else if (tab === 'nota' && ref) {
      const many = allSel().length;
      const set = editSelected;
      content.push(where(ref, many > 1 ? `${many} note selezionate` : `Nota ${sel! + 1} di ${refs.length}`));
      content.push(h('div', { class: 'ed-pitch' },
        button('▲', () => set((x) => movePitch(x, 1)), { cls: 'ed-icon', title: 'Più in alto (freccia su)' }),
        h('span', { class: `ed-pitch__name${many > 1 ? ' ed-pitch__name--many' : ''}` }, many > 1 ? allSel().map((i) => pitchName(body, refs[i])).join(' ') : pitchName(body, ref)),
        button('▼', () => set((x) => movePitch(x, -1)), { cls: 'ed-icon', title: 'Più in basso (freccia giù)' }),
        h('span', { class: 'ed-pitch__nav' },
          button('Neuma', () => { const n = neumeOf(sel!); setSel(n, sel, n[0]); score.select(allSel(), sel); renderPanel(); },
            { cls: 'ed-button ed-button--small', title: 'Seleziona tutte le note del neuma (doppio clic su una nota)', disabled: neumeOf(sel!).length < 2 }),
          button('‹', () => pick(sel! - 1), { cls: 'ed-icon', title: 'Nota precedente (freccia sinistra)', disabled: sel === 0 }),
          button('›', () => pick(sel! + 1), { cls: 'ed-icon', title: 'Nota seguente (freccia destra)', disabled: sel === refs.length - 1 }))));
      content.push(seg('Forma', SHAPES, common(noteShape), (v) => set((x) => setShape(x, v)), 4, false, (v) => v));
      content.push(seg('Liquescenza', LIQUESCENCES.map(([v, l]) => [v, l.replace(/ \(.\)$/, '').replace('Ascendente', 'Ascend.').replace('Discendente', 'Discend.')]), common(noteLiquescence),
        (v) => set((x) => setLiquescence(x, v)), 4, false, (v) => `liq-${v}`));
      // a sign is on when every selected note has it; a click puts it on all of them, or takes it off all
      const all = (has: (p: ReturnType<typeof splitNote>) => boolean) => common(has) === true;
      const signs: [Sign | 'debilis', string, boolean][] = [
        ['mora', 'Mora', all((p) => hasSign(p, 'mora'))], ['episema', 'Episema', all((p) => hasSign(p, 'episema'))],
        ['ictus', 'Ictus', all((p) => hasSign(p, 'ictus'))], ['debilis', 'Debilis', all((p) => p.debilis)],
      ];
      content.push(toggles('Segni', signs, (v) => {
        const on = !signs.find((x) => x[0] === v)![2];
        set((x) => (v === 'debilis' ? setDebilis(x, on) : hasSign(x, v) === on ? x : toggleSign(x, v)));
      }));
      // flat / natural before the note (from the last note back: inserting moves the later atoms)
      const accs = allSel().map((i) => getAccidental(body, refs[i]));
      content.push(seg('Alterazione', ACCIDENTALS, accs.every((a) => a === accs[0]) ? accs[0] : null, (v) => {
        let out = body;
        for (const i of [...allSel()].reverse()) out = setAccidental(out, noteRefs(out)[i], v);
        commit(out);
      }, 3, false, (v) => `acc-${v}`));
      const withNext = allSel().filter((i) => joinAfter(body, refs[i]) !== null);
      const joins = withNext.map((i) => joinAfter(body, refs[i]));
      const j = joins.length && joins.every((x) => x === joins[0]) ? joins[0] : null;
      content.push(seg('Con la nota seguente', JOINS.map(([v, l]) => [v, l]), j, (v) => {
        // from the last note back, so the earlier positions do not move
        let out = body;
        for (const i of [...withNext].reverse()) out = setJoinAfter(out, noteRefs(out)[i], v);
        commit(out);
      }, 4, withNext.length === 0, (v) => v));
      content.push(h('div', { class: 'ed-grid3' },
        button('+ Unita', () => addNote('unita'), { title: 'Aggiunge una nota dopo questa, nello stesso neuma' }),
        button('+ Staccata', () => addNote('separata'), { title: 'Aggiunge una nota dopo questa, staccata' }),
        button('Elimina', () => removeNote(), { cls: 'ed-button ed-button--danger', title: many > 1 ? 'Elimina le note selezionate (Canc)' : 'Elimina la nota (Canc)' })));
    } else if (tab === 'sillaba' && ref) {
      const syl = body.syllables[ref.syl];
      content.push(where(ref, 'Sillaba'));
      const input = h('input', { type: 'text', class: 'ed-input', value: syl.text, 'aria-label': 'Testo della sillaba' });
      input.addEventListener('change', () => commit(setSyllableText(body, ref.syl, input.value)));
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
      content.push(h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Testo'), input));
      content.push(seg('Divisione dopo la sillaba', BAR_LABELS, getBarAfter(body, ref.syl), (v) => commit(setBarAfter(body, ref.syl, v)), 3, false, (v) => `bar-${v}`));
      if (adding) {
        const nuovo = h('input', { type: 'text', class: 'ed-input', placeholder: adding === 'parola' ? 'Nuova parola (o la sua prima sillaba)' : 'Nuova sillaba', 'aria-label': 'Testo da aggiungere' });
        const ok = () => addSyllable(adding === 'parola', nuovo.value);
        nuovo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ok(); if (ev.key === 'Escape') { adding = null; renderPanel(); } });
        content.push(h('div', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, adding === 'parola' ? 'Nuova parola dopo questa sillaba' : 'Nuova sillaba nella stessa parola'), nuovo,
          h('div', { class: 'ed-grid3' }, button('Aggiungi', ok, { cls: 'ed-button ed-button--primary' }), button('Annulla', () => { adding = null; renderPanel(); }))));
        requestAnimationFrame(() => nuovo.focus());
      } else {
        content.push(h('div', { class: 'ed-grid3' },
          button('+ Sillaba', () => { adding = 'sillaba'; renderPanel(); }, { title: 'Aggiunge una sillaba dopo questa, nella stessa parola' }),
          button('+ Parola', () => { adding = 'parola'; renderPanel(); }, { title: 'Aggiunge una parola dopo questa sillaba' }),
          button('Elimina', () => commit(deleteSyllable(body, ref.syl), null), { cls: 'ed-button ed-button--danger', title: 'Elimina la sillaba con le sue note' })));
      }
      hint('La nuova sillaba nasce con una nota alla stessa altezza: poi la sposti dalla scheda «Nota».');
    } else {
      const clef = firstClef(body)?.clef ?? 'c4';
      const clefSel = h('select', { class: 'ed-input', 'aria-label': 'Chiave' },
        ...CLEF_LIST.map((c) => h('option', { value: c, selected: c === clef }, c.replace('cb', 'Do♭ ').replace(/^c/, 'Do ').replace(/^f/, 'Fa ') + 'ª riga')));
      clefSel.addEventListener('change', () => commit(setFirstClef(body, clefSel.value)));
      const mode = headerField(header, 'mode') ?? '';
      const modes = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const modeSel = h('select', { class: 'ed-input', 'aria-label': 'Modo' },
        h('option', { value: '', selected: mode === '' }, '—'),
        ...(modes.includes(mode) || mode === '' ? [] : [h('option', { value: mode, selected: true }, mode)]),
        ...modes.map((m) => h('option', { value: m, selected: m === mode }, `Modo ${ROMAN[Number(m)]}`)));
      modeSel.addEventListener('change', () => commit(body, sel, setHeaderField(header, 'mode', modeSel.value)));
      content.push(h('div', { class: 'ed-row' },
        h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Chiave iniziale'), clefSel),
        h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Modo'), modeSel)));

      // gabc, for whoever knows it
      const area = h('textarea', { class: 'ed-input ed-code', rows: '9', spellcheck: 'false', 'aria-label': 'Codice GABC' });
      area.value = serializeBody(body);
      content.push(h('details', { class: 'alternative ed-gabc', open: gabcOpen },
        h('summary', {}, 'Codice GABC (per esperti)'),
        area,
        h('div', { class: 'ed-grid3' }, button('Applica', () => {
          const n = noteRefs(parseBody(area.value)).length;
          commit(parseBody(area.value), sel !== null && sel < n ? sel : null);
        }))));
      content.push(h('dl', { class: 'ed-keys' },
        ...([['Maiusc+clic', 'seleziona fino a questa nota'], ['Ctrl/⌘+clic', 'aggiunge o toglie una nota'], ['Doppio clic', 'seleziona il neuma'],
          ['← →', 'nota precedente / seguente'], ['Maiusc+← →', 'allarga la selezione'], ['↑ ↓', 'alza / abbassa le note selezionate'],
          ['Canc', 'elimina le note selezionate'], ['Ctrl+Z', 'annulla'], ['Ctrl+S', 'salva'], ['Esc', 'deseleziona']] as [string, string][])
          .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])));
      content.push(h('p', { class: 'ed-panel__hint' }, 'Tutti i comandi sono spiegati nella ', h('a', { href: '#/guida/selezione', class: 'more-link' }, 'Guida'), '.'));
    }

    panel.replaceChildren(head, tabs, h('div', { class: 'ed-panel__body', role: 'tabpanel' }, ...content));
    panel.querySelector('.ed-gabc')?.addEventListener('toggle', (ev) => { gabcOpen = (ev.target as HTMLDetailsElement).open; });
  }

  /** "Nota 6 di 141 · «términum»" with the syllable underlined. */
  function where(ref: NoteRef, label: string): HTMLElement {
    const w = wordOf(body, ref.syl);
    return h('p', { class: 'ed-where' }, h('span', { class: 'ed-where__label' }, label),
      h('span', { class: 'ed-where__word' }, w.before, h('strong', {}, w.syllable || '—'), w.after));
  }

  function pick(i: number, extend = false): void {
    const n = noteRefs(body).length;
    if (n === 0) return;
    const to = Math.min(Math.max(i, 0), n - 1);
    if (extend && sel !== null) {
      const from = anchor ?? sel;
      const lo = Math.min(from, to), hi = Math.max(from, to);
      setSel(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k), to, from);
    } else setSel([to], to);
    adding = null;
    score.select(allSel(), sel);
    renderPanel();
  }

  function addNote(join: 'unita' | 'separata'): void {
    const ref = noteRefs(body)[sel!];
    const r = insertNoteAfter(body, ref, join);
    const idx = noteRefs(r.body).findIndex((x) => x.syl === r.ref.syl && x.atom === r.ref.atom);
    commit(r.body, idx);
  }

  function removeNote(): void {
    // from the last selected note back, so the positions of the others do not move
    const targets = allSel().reverse();
    let out = body;
    let kept = 0;
    for (const i of targets) {
      const next = deleteNote(out, noteRefs(out)[i]);
      if (next) out = next; else kept++;
    }
    if (kept) flash(kept === targets.length
      ? 'Una sillaba deve avere almeno una nota: per toglierla tutta usa «Elimina sillaba».'
      : 'Alcune note sono rimaste: ogni sillaba deve averne almeno una.');
    if (out === body) return;
    const n = noteRefs(out).length;
    commit(out, n ? Math.min(targets[targets.length - 1], n - 1) : null);
  }

  function addSyllable(newWord: boolean, testo: string): void {
    adding = null;
    const ref = noteRefs(body)[sel!];
    const syl = body.syllables[ref.syl];
    // after the syllable's last note; the new syllable gets one note at the same pitch
    const pitch = splitNote(syl.notation![ref.atom].s).pitch;
    const out = insertSyllableAfter(body, ref.syl, testo.trim(), pitch, newWord);
    const idx = noteRefs(out).findIndex((x) => x.syl === ref.syl + 1);
    commit(out, idx >= 0 ? idx : sel);
  }

  // -- review
  const comment = h('textarea', { class: 'ed-input ed-comment', rows: '3', placeholder: 'Note per chi approva: che cosa hai corretto, dubbi, pagina del libretto…' });

  async function act(azione: Azione): Promise<void> {
    const commento = comment.value.trim();
    if (azione === 'rimanda' && !commento) { flash('Scrivi nel riquadro che cosa va corretto.'); comment.focus(); return; }
    const gabc = azione === 'commenta' || readOnly() ? undefined : text();
    try {
      reviewBox.classList.add('ed-review--busy');
      const r = await api.aggiorna(record.key, { azione, versione: record.versione, gabc, commento: commento || undefined });
      record = { ...r, nomi };
      if (gabc !== undefined) saved = gabc;
      comment.value = '';
      flash({ salva: 'Bozza salvata.', invia: 'Inviato per l’approvazione.', commenta: 'Commento aggiunto.', approva: 'Approvato.', rimanda: 'Rimandato al revisore.', riapri: 'Riaperto.' }[azione]);
      update(false);
      refresh();
    } catch (e) {
      flash((e as ApiError).message, true);
    } finally {
      reviewBox.classList.remove('ed-review--busy');
    }
  }

  const toast = h('div', { class: 'ed-toast', role: 'status', 'aria-live': 'polite' });
  let toastTimer = 0;
  function flash(msg: string, error = false): void {
    toast.textContent = msg;
    toast.classList.toggle('ed-toast--error', error);
    toast.classList.add('ed-toast--on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('ed-toast--on'), error ? 6000 : 2800);
  }

  function renderStatus(): void {
    const changed = text() !== record.sito;
    status.replaceChildren(...[
      statoPill(record.stato),
      record.aggiornato ? h('span', { class: 'ed-status__who' }, `${nome(record.da)} · ${quando(record.aggiornato)}`) : null,
      dirty() ? h('span', { class: 'ed-status__dirty' }, 'Modifiche non salvate') : null,
      changed ? h('span', { class: 'ed-status__changed' }, 'Diverso dal sito') : null,
    ].filter((x): x is HTMLSpanElement => x !== null));
  }

  function renderReview(): void {
    renderStatus();
    const s = record.stato;
    const changed = text() !== record.sito;
    const buttons: Node[] = [];
    if (!readOnly() && s !== 'approvato') {
      buttons.push(button('Salva bozza', () => act('salva'), { disabled: !dirty() }));
      if (!admin) buttons.push(button(changed ? 'Invia per l’approvazione' : 'Conforme al libretto: invia', () => act('invia'), { cls: 'ed-button ed-button--primary' }));
    }
    if (admin) {
      if (s !== 'approvato') buttons.push(button(changed ? 'Approva la correzione' : 'Approva così com’è', () => act('approva'), { cls: 'ed-button ed-button--approve' }));
      if (s === 'inviato') buttons.push(button('Rimanda al revisore', () => act('rimanda')));
      if (s === 'approvato') buttons.push(button('Riapri la revisione', () => act('riapri')));
    }
    buttons.push(button('Solo commento', () => act('commenta'), { cls: 'ed-button ed-button--quiet' }));

    // the history, each comment with the action it came with; repeated drafts once
    const AZ: Record<Azione, string> = { salva: 'ha salvato una bozza', invia: 'ha inviato per l’approvazione', commenta: 'ha commentato', approva: 'ha approvato', rimanda: 'ha rimandato al revisore', riapri: 'ha riaperto la revisione' };
    const thread: { quando: string; chi: string; azione: Azione; testo: string | null }[] = [];
    for (const ev of record.storia) {
      const c = record.commenti.find((x) => x.quando === ev.quando && x.chi === ev.chi);
      const prev = thread[thread.length - 1];
      if (prev && !prev.testo && prev.azione === 'salva' && ev.azione === 'salva' && prev.chi === ev.chi) thread.pop();
      thread.push({ quando: ev.quando, chi: ev.chi, azione: ev.azione, testo: c?.testo ?? null });
    }

    reviewBox.replaceChildren(
      h('h2', { class: 'rubric' }, 'Revisione'),
      thread.length ? h('ol', { class: 'ed-thread' }, ...thread.map((t) =>
        h('li', { class: t.testo !== null ? 'ed-thread__comment' : 'ed-thread__event' },
          h('span', { class: 'ed-thread__meta' }, h('strong', {}, nome(t.chi)), ' ', AZ[t.azione], ' · ', quando(t.quando)),
          t.testo !== null ? h('p', {}, t.testo) : null))) : h('p', { class: 'ed-panel__hint' }, 'Nessuno ha ancora lavorato su questo canto.'),
      comment,
      h('div', { class: 'ed-actions ed-actions--review' }, ...buttons),
      h('p', { class: 'ed-panel__hint' }, admin
        ? 'Le correzioni approvate arrivano sul sito quando le esporti e le applichi al repository.'
        : 'Se lo spartito corrisponde già al libretto, invialo senza modifiche: conta come rivisto.'),
    );
  }

  // -- keyboard
  function onKey(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement;
    if (t.closest('input, textarea, select')) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); goto(ev.shiftKey ? pos + 1 : pos - 1); return; }
    if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); goto(pos + 1); return; }
    if (mod && ev.key.toLowerCase() === 's') { ev.preventDefault(); if (dirty() && !readOnly()) act('salva'); return; }
    if (readOnly() || sel === null || mod || ev.altKey) return;
    switch (ev.key) {
      case 'ArrowLeft': pick(sel - 1, ev.shiftKey); break;
      case 'ArrowRight': pick(sel + 1, ev.shiftKey); break;
      case 'ArrowUp': editSelected((x) => movePitch(x, 1)); break;
      case 'ArrowDown': editSelected((x) => movePitch(x, -1)); break;
      case 'Delete': case 'Backspace': removeNote(); break;
      case 'Escape': setSel([], null); score.select([], null); renderPanel(); break;
      default: return;
    }
    ev.preventDefault();
  }
  document.addEventListener('keydown', onKey);
  const beforeUnload = (ev: BeforeUnloadEvent) => { if (dirty()) { ev.preventDefault(); ev.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  // -- layout
  const usi = canto.usi.length > 1
    ? h('details', { class: 'alternative' }, h('summary', {}, `Usato in ${canto.usi.length} punti del breviario`),
      h('ul', { class: 'ed-uses' }, ...canto.usi.map((e) => h('li', {}, [e.role, e.printedContext, e.pdfPage].filter(Boolean).join(' · ')))))
    : null;

  const el = h('main', { class: 'ed-page' },
    h('div', { class: 'ed-main' },
      h('nav', { class: 'ed-nav' },
        h('a', { href: '#/', class: 'back-link' }, '← Tutti i canti'),
        h('span', { class: 'ed-nav__steps' },
          nav.prev ? h('a', { href: `#/canto/${nav.prev.key}`, class: 'back-link', title: nav.prev.incipit }, '‹ Precedente') : null,
          nav.next ? h('a', { href: `#/canto/${nav.next.key}`, class: 'back-link', title: nav.next.incipit }, 'Successivo ›') : null)),
      h('header', { class: 'ed-head' },
        h('h1', { class: 'ed-head__title' }, canto.incipit),
        h('p', { class: 'ed-head__meta' }, descrizione(canto)),
        usi,
        status),
      warn,
      score.el,
      playerSlot,
      h('p', { class: 'ed-legend' }, h('span', { class: 'ed-legend__mark' }), 'sillabe diverse dal sito'),
      compare,
      reviewBox),
    panel,
    toast);

  update(true);

  return {
    el,
    dirty,
    dispose() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}
