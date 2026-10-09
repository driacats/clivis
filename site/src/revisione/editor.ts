// The review page of one chant: the score to correct by clicking on it, the
// tools for the selected note, syllable and piece, and the review itself
// (draft, send for approval, approve or send back, comments).
//
// The score is exsurge's <chant-editor>: selection, keyboard and history are
// its own; this page adds the tools (with the gabc model of exsurge) and the
// review.
import { ROMAN } from '../calendar/calendar';
import { playerControls } from '../audio/controls';
import { button as domButton, foldable, h, notice } from '../ui/dom';
import { api, type Azione, type Revisione, type Utente } from './api';
import { cantoHref, descrizione, uso, type Canto } from './catalog';
import {
  BARS, CLEFS, JOINS, LIQUESCENCES, NOTE_ACCIDENTALS, SHAPES, deleteSyllable, firstClef, getAccidental, getBarAfter,
  hasSign, headerField, joinAfter, movePitch, neumeOf, notationIcon, noteLiquescence, noteRefs, noteShape, parseBody, scaleDegree,
  serializeBody, setAccidental, setBarAfter, setDebilis, setFirstClef, setHeaderField, setJoinAfter, setLiquescence,
  setShape, setSyllableText, splitFile, splitNote, toggleSign, wordOf,
  type ChantEditorElement, type NoteRef, type Sign,
} from 'exsurge';
import { ACCIDENTAL, BAR, ICON, JOIN, LIQUESCENCE, SHAPE, SIGN } from './notation';
import { backToList, errorMessage, quando, statoPill } from './ui';

// --- names ------------------------------------------------------------------------------

const NOMI = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

function pitchName(score: ChantEditorElement, ref: NoteRef): string {
  const { degree, flat } = scaleDegree(score.body, ref);
  return NOMI[degree] + (flat ? '♭' : '');
}

/** The options of a control with their names (the short one, on the narrow buttons, when there is one). */
const named = <T extends string>(values: T[], options: Record<T, { name: string; short?: string }>): [T, string][] =>
  values.map((v) => [v, options[v].short ?? options[v].name]);

// --- small UI helpers -----------------------------------------------------------------

/** A button's content: the little picture of what it does (if there is one) and its name. */
function optContent(b: HTMLButtonElement, text: string, iconKey: string | null): HTMLButtonElement {
  const svg = iconKey === null ? null : notationIcon(iconKey);
  if (svg !== null) {
    b.classList.add('ed-seg__opt--icon');
    b.insertAdjacentHTML('beforeend', svg);
  }
  b.append(h('span', { class: 'ed-seg__text' }, text));
  return b;
}

/** A row of mutually exclusive options, as a segmented control of `cols` columns. */
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

/** A button of the editor (class ed-button unless another is given). */
const button = (text: string, onClick: () => void, attrs: { class?: string; title?: string; disabled?: boolean } = {}): HTMLButtonElement =>
  domButton(text, onClick, { class: 'ed-button', ...attrs });

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

  // the file being edited, in exsurge's <chant-editor> (with its own history and selection)
  const start = record.gabc ?? record.sito;
  const siteBody = parseBody(splitFile(record.sito).body);
  let saved = start;
  let aligned = true;
  /** the syllable or word being added (its text field is open in the tools) */
  let adding: 'sillaba' | 'parola' | null = null;

  const score = document.createElement('chant-editor') as ChantEditorElement;
  score.className = 'ed-score';
  score.setAttribute('line-breaks', 'ignore');
  score.value = start;
  score.toggleAttribute('readonly', readOnly());

  const text = () => score.value;
  const dirty = () => text() !== saved;
  const body = () => score.body;
  const sel = () => score.focusNote;

  const original = document.createElement('chant-editor') as ChantEditorElement;
  original.className = 'ed-score';
  original.setAttribute('readonly', '');
  original.setAttribute('line-breaks', 'ignore');
  const panel = h('aside', { class: 'ed-panel', 'aria-label': 'Strumenti' });
  const playerSlot = h('div', { class: 'ed-player' });
  const status = h('div', { class: 'ed-status' });
  const reviewBox = h('section', { class: 'ed-review', 'aria-label': 'Revisione' });
  const warn = h('div', {});
  const compare = h('details', { class: 'alternative ed-compare' }, h('summary', {}, 'Com’è ora sul sito'));
  compare.addEventListener('toggle', () => {
    if (compare.open && !original.isConnected) {
      original.value = record.sito;
      compare.append(original);
    }
  });

  // -- the score tells what happens
  score.addEventListener('chant-change', () => { renderPanel(); renderReview(); });
  let lastFocus: number | null = null;
  score.addEventListener('chant-select', () => {
    // a new note picked: close the "add" field, and leave the piece tab
    if (sel() !== null && sel() !== lastFocus) {
      adding = null;
      if (tab === 'brano') tab = 'nota';
    }
    lastFocus = sel();
    renderPanel();
  });
  score.addEventListener('chant-drawn', (ev) => {
    aligned = (ev as CustomEvent<{ aligned: boolean }>).detail.aligned;
    score.markChangesFrom(siteBody);
    warn.replaceChildren(aligned ? '' : notice('Questo spartito contiene una notazione che l’editor non sa ancora collegare alle note: puoi correggerlo dal codice GABC, in fondo agli strumenti.', 'gap'));
    playerSlot.replaceChildren(playerControls(serializeBody(body()), record.file.split('/').pop() ?? 'canto', headerField(score.header, 'mode'), false, score.chant));
    renderPanel();
  });
  score.addEventListener('chant-notice', (ev) => {
    const all = (ev as CustomEvent<{ all: boolean }>).detail.all;
    flash(all
      ? 'Una sillaba deve avere almeno una nota: per toglierla tutta usa «Elimina sillaba».'
      : 'Alcune note sono rimaste: ogni sillaba deve averne almeno una.');
  });

  /** The value all selected notes share, or null when they differ. */
  function common<T>(get: (p: ReturnType<typeof splitNote>) => T): T | null {
    const refs = noteRefs(body());
    const vals = score.selection.map((i) => get(splitNote(body().syllables[refs[i].syl].notation![refs[i].atom].s)));
    return vals.length && vals.every((v) => v === vals[0]) ? vals[0] : null;
  }

  // -- tools: a side pane with three tabs (note, syllable, piece), sized to fit without scrolling
  type Tab = 'nota' | 'sillaba' | 'brano';
  let tab: Tab = 'nota';
  /** the GABC box of the piece tab stays open across redraws */
  let gabcOpen = false;

  function renderPanel(): void {
    const refs = noteRefs(body());
    const focus = sel();
    const ref = focus !== null ? refs[focus] : undefined;
    const ro = readOnly();

    const head = h('div', { class: 'ed-panel__head' },
      button('↶', () => score.undo(), { class: 'ed-icon', disabled: !score.canUndo || ro, title: 'Annulla (Ctrl+Z)' }),
      button('↷', () => score.redo(), { class: 'ed-icon', disabled: !score.canRedo || ro, title: 'Ripeti (Ctrl+Maiusc+Z)' }),
      h('span', { class: `ed-panel__state${dirty() ? ' ed-panel__state--dirty' : ''}` }, ro ? 'Sola lettura' : dirty() ? 'Modifiche non salvate' : 'Tutto salvato'),
      ro ? null : button('Salva', () => act('salva'), { class: 'ed-button ed-button--primary ed-button--small', disabled: !dirty(), title: 'Salva la bozza (Ctrl+S)' }));

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
    } else if (tab === 'nota' && ref && focus !== null) {
      const selected = score.selection;
      const many = selected.length;
      const set = (f: Parameters<ChantEditorElement['editNotes']>[0]) => score.editNotes(f);
      content.push(where(ref, many > 1 ? `${many} note selezionate` : `Nota ${focus + 1} di ${refs.length}`));
      content.push(h('div', { class: 'ed-pitch' },
        button('▲', () => set((x) => movePitch(x, 1)), { class: 'ed-icon', title: 'Più in alto (freccia su)' }),
        h('span', { class: `ed-pitch__name${many > 1 ? ' ed-pitch__name--many' : ''}` }, many > 1 ? selected.map((i) => pitchName(score, refs[i])).join(' ') : pitchName(score, ref)),
        button('▼', () => set((x) => movePitch(x, -1)), { class: 'ed-icon', title: 'Più in basso (freccia giù)' }),
        h('span', { class: 'ed-pitch__nav' },
          button('Neuma', () => score.selectNeume(),
            { class: 'ed-button ed-button--small', title: 'Seleziona tutte le note del neuma (doppio clic su una nota)', disabled: neumeOf(body(), focus).length < 2 }),
          button('‹', () => score.move(-1), { class: 'ed-icon', title: 'Nota precedente (freccia sinistra)', disabled: focus === 0 }),
          button('›', () => score.move(1), { class: 'ed-icon', title: 'Nota seguente (freccia destra)', disabled: focus === refs.length - 1 }))));
      content.push(seg('Forma', named(SHAPES, SHAPE), common(noteShape), (v) => set((x) => setShape(x, v)), 4, false, ICON.shape));
      content.push(seg('Liquescenza', named(LIQUESCENCES, LIQUESCENCE), common(noteLiquescence),
        (v) => set((x) => setLiquescence(x, v)), 4, false, ICON.liquescence));
      // a sign is on when every selected note has it; a click puts it on all of them, or takes it off all
      const all = (has: (p: ReturnType<typeof splitNote>) => boolean) => common(has) === true;
      const signs: [Sign | 'debilis', string, boolean][] = [
        ['mora', SIGN.mora.name, all((p) => hasSign(p, 'mora'))], ['episema', SIGN.episema.name, all((p) => hasSign(p, 'episema'))],
        ['ictus', SIGN.ictus.name, all((p) => hasSign(p, 'ictus'))], ['debilis', SIGN.debilis.name, all((p) => p.debilis)],
      ];
      content.push(toggles('Segni', signs, (v) => {
        const on = !signs.find((x) => x[0] === v)![2];
        set((x) => (v === 'debilis' ? setDebilis(x, on) : hasSign(x, v) === on ? x : toggleSign(x, v)));
      }));
      // flat / natural before the note
      const accs = selected.map((i) => getAccidental(body(), refs[i]));
      content.push(seg('Alterazione', named(NOTE_ACCIDENTALS, ACCIDENTAL), accs.every((a) => a === accs[0]) ? accs[0] : null, (v) => {
        // from the last note back: inserting moves the later atoms
        let out = body();
        for (const i of [...selected].reverse()) out = setAccidental(out, noteRefs(out)[i], v);
        score.apply(out);
      }, 3, false, ICON.accidental));
      const withNext = selected.filter((i) => joinAfter(body(), refs[i]) !== null);
      const joins = withNext.map((i) => joinAfter(body(), refs[i]));
      const j = joins.length && joins.every((x) => x === joins[0]) ? joins[0] : null;
      content.push(seg('Con la nota seguente', named(JOINS, JOIN), j, (v) => {
        // from the last note back, so the earlier positions do not move
        let out = body();
        for (const i of [...withNext].reverse()) out = setJoinAfter(out, noteRefs(out)[i], v);
        score.apply(out);
      }, 4, withNext.length === 0, ICON.join));
      content.push(h('div', { class: 'ed-grid3' },
        button('+ Unita', () => score.addNote('joined'), { title: 'Aggiunge una nota dopo questa, nello stesso neuma' }),
        button('+ Staccata', () => score.addNote('separate'), { title: 'Aggiunge una nota dopo questa, staccata' }),
        button('Elimina', () => score.deleteSelected(), { class: 'ed-button ed-button--danger', title: many > 1 ? 'Elimina le note selezionate (Canc)' : 'Elimina la nota (Canc)' })));
    } else if (tab === 'sillaba' && ref) {
      const syl = body().syllables[ref.syl];
      content.push(where(ref, 'Sillaba'));
      const input = h('input', { type: 'text', class: 'ed-input', value: syl.text, 'aria-label': 'Testo della sillaba' });
      input.addEventListener('change', () => score.apply(setSyllableText(body(), ref.syl, input.value)));
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
      content.push(h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Testo'), input));
      content.push(seg('Divisione dopo la sillaba', named(BARS, BAR), getBarAfter(body(), ref.syl), (v) => score.apply(setBarAfter(body(), ref.syl, v)), 3, false, ICON.bar));
      if (adding) {
        const nuovo = h('input', { type: 'text', class: 'ed-input', placeholder: adding === 'parola' ? 'Nuova parola (o la sua prima sillaba)' : 'Nuova sillaba', 'aria-label': 'Testo da aggiungere' });
        const ok = () => { const newWord = adding === 'parola'; adding = null; score.addSyllable(nuovo.value, newWord); };
        nuovo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ok(); if (ev.key === 'Escape') { adding = null; renderPanel(); } });
        content.push(h('div', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, adding === 'parola' ? 'Nuova parola dopo questa sillaba' : 'Nuova sillaba nella stessa parola'), nuovo,
          h('div', { class: 'ed-grid3' }, button('Aggiungi', ok, { class: 'ed-button ed-button--primary' }), button('Annulla', () => { adding = null; renderPanel(); }))));
        requestAnimationFrame(() => nuovo.focus());
      } else {
        content.push(h('div', { class: 'ed-grid3' },
          button('+ Sillaba', () => { adding = 'sillaba'; renderPanel(); }, { title: 'Aggiunge una sillaba dopo questa, nella stessa parola' }),
          button('+ Parola', () => { adding = 'parola'; renderPanel(); }, { title: 'Aggiunge una parola dopo questa sillaba' }),
          button('Elimina', () => score.apply(deleteSyllable(body(), ref.syl), null), { class: 'ed-button ed-button--danger', title: 'Elimina la sillaba con le sue note' })));
      }
      hint('La nuova sillaba nasce con una nota alla stessa altezza: poi la sposti dalla scheda «Nota».');
    } else {
      const clef = firstClef(body())?.clef ?? 'c4';
      const clefSel = h('select', { class: 'ed-input', 'aria-label': 'Chiave' },
        ...CLEFS.map((c) => h('option', { value: c, selected: c === clef }, c.replace('cb', 'Do♭ ').replace(/^c/, 'Do ').replace(/^f/, 'Fa ') + 'ª riga')));
      clefSel.addEventListener('change', () => score.apply(setFirstClef(body(), clefSel.value)));
      const mode = headerField(score.header, 'mode') ?? '';
      const modes = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const modeSel = h('select', { class: 'ed-input', 'aria-label': 'Modo' },
        h('option', { value: '', selected: mode === '' }, '—'),
        ...(modes.includes(mode) || mode === '' ? [] : [h('option', { value: mode, selected: true }, mode)]),
        ...modes.map((m) => h('option', { value: m, selected: m === mode }, `Modo ${ROMAN[Number(m)]}`)));
      modeSel.addEventListener('change', () => score.apply(body(), sel(), setHeaderField(score.header, 'mode', modeSel.value)));
      content.push(h('div', { class: 'ed-row' },
        h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Chiave iniziale'), clefSel),
        h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, 'Modo'), modeSel)));

      // gabc, for whoever knows it
      const area = h('textarea', { class: 'ed-input ed-code', rows: '9', spellcheck: 'false', 'aria-label': 'Codice GABC' });
      area.value = serializeBody(body());
      content.push(h('details', { class: 'alternative ed-gabc', open: gabcOpen },
        h('summary', {}, 'Codice GABC (per esperti)'),
        area,
        h('div', { class: 'ed-grid3' }, button('Applica', () => {
          const n = noteRefs(parseBody(area.value)).length;
          const f = sel();
          score.apply(parseBody(area.value), f !== null && f < n ? f : null);
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
    const w = wordOf(body(), ref.syl);
    return h('p', { class: 'ed-where' }, h('span', { class: 'ed-where__label' }, label),
      h('span', { class: 'ed-where__word' }, w.before, h('strong', {}, w.syllable || '—'), w.after));
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
      score.toggleAttribute('readonly', readOnly());
      renderPanel();
      renderReview();
      refresh();
    } catch (e) {
      flash(errorMessage(e), true);
    } finally {
      reviewBox.classList.remove('ed-review--busy');
    }
  }

  const TOAST_MS = { info: 2800, error: 6000 };
  const toast = h('div', { class: 'ed-toast', role: 'status', 'aria-live': 'polite' });
  let toastTimer = 0;
  function flash(msg: string, error = false): void {
    toast.textContent = msg;
    toast.classList.toggle('ed-toast--error', error);
    toast.classList.add('ed-toast--on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('ed-toast--on'), error ? TOAST_MS.error : TOAST_MS.info);
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
      if (!admin) buttons.push(button(changed ? 'Invia per l’approvazione' : 'Conforme al libretto: invia', () => act('invia'), { class: 'ed-button ed-button--primary' }));
    }
    if (admin) {
      if (s !== 'approvato') buttons.push(button(changed ? 'Approva la correzione' : 'Approva così com’è', () => act('approva'), { class: 'ed-button ed-button--approve' }));
      if (s === 'inviato') buttons.push(button('Rimanda al revisore', () => act('rimanda')));
      if (s === 'approvato') buttons.push(button('Riapri la revisione', () => act('riapri')));
    }
    buttons.push(button('Solo commento', () => act('commenta'), { class: 'ed-button ed-button--quiet' }));

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

  // -- keyboard: the score handles notes and undo; saving is the page's
  function onKey(ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      if (dirty() && !readOnly()) act('salva');
    }
  }
  document.addEventListener('keydown', onKey);
  const beforeUnload = (ev: BeforeUnloadEvent) => { if (dirty()) { ev.preventDefault(); ev.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  // -- layout
  const usi = canto.usi.length > 1
    ? foldable(`Usato in ${canto.usi.length} punti del breviario`,
      h('ul', { class: 'ed-uses' }, ...canto.usi.map((e) => h('li', {}, uso(e)))))
    : null;

  const el = h('main', { class: 'ed-page' },
    h('div', { class: 'ed-main' },
      h('nav', { class: 'ed-nav' },
        backToList(),
        h('span', { class: 'ed-nav__steps' },
          nav.prev ? h('a', { href: cantoHref(nav.prev.key), class: 'back-link', title: nav.prev.incipit }, '‹ Precedente') : null,
          nav.next ? h('a', { href: cantoHref(nav.next.key), class: 'back-link', title: nav.next.incipit }, 'Successivo ›') : null)),
      h('header', { class: 'ed-head' },
        h('h1', { class: 'ed-head__title' }, canto.incipit),
        h('p', { class: 'ed-head__meta' }, descrizione(canto)),
        usi,
        status),
      warn,
      score,
      playerSlot,
      h('p', { class: 'ed-legend' }, h('span', { class: 'ed-legend__mark' }), 'sillabe diverse dal sito'),
      compare,
      reviewBox),
    panel,
    toast);

  renderPanel();
  renderReview();

  return {
    el,
    dirty,
    dispose() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}
