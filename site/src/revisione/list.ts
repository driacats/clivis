// The reviewer's page: how far the review has got, and every chant with its state.
import { load, save, STORAGE_KEYS } from '../storage';
import { h, selectOne, svgSpan } from '../ui/dom';
import { STATI, STATO_NOME, type Riassunto, type Stato, type Utente } from './api';
import { cantoHref, type Canto } from './catalog';
import { quando, statoPill } from './ui';

export interface Filtro { stato: Stato | 'tutti' | 'da-applicare' | 'miei'; gruppo: string; cerca: string }

export function filtroSalvato(): Filtro {
  try {
    const f = JSON.parse(load(STORAGE_KEYS.reviewFilter) ?? 'null');
    if (f && typeof f === 'object') return { stato: f.stato ?? 'tutti', gruppo: f.gruppo ?? '', cerca: f.cerca ?? '' };
  } catch { /* not valid JSON */ }
  return { stato: 'tutti', gruppo: '', cerca: '' };
}

const salvaFiltro = (f: Filtro): void => save(STORAGE_KEYS.reviewFilter, JSON.stringify(f));

function commenti(n: number): HTMLElement {
  const el = svgSpan('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/></svg>',
    { class: 'rev-row__comments', title: n === 1 ? '1 commento' : `${n} commenti` });
  el.append(String(n));
  return el;
}

function percento(n: number, tot: number): string {
  const p = (100 * n) / Math.max(tot, 1);
  return p > 0 && p < 1 ? 'meno dell’1%' : `${Math.round(p)}%`;
}

const statoDi = (r: Riassunto | undefined): Stato => r?.stato ?? 'da-rivedere';

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function passa(c: Canto, r: Riassunto | undefined, f: Filtro, me: Utente): boolean {
  if (f.gruppo && c.gruppo !== f.gruppo) return false;
  if (f.stato === 'da-applicare') { if (!(r?.stato === 'approvato' && r.cambiato && !r.applicato)) return false; }
  else if (f.stato === 'miei') { if (r?.da !== me.nome) return false; }
  else if (f.stato !== 'tutti' && statoDi(r) !== f.stato) return false;
  if (f.cerca) {
    const q = normal(f.cerca);
    const hay = normal([c.incipit, c.key, ...c.usi.map((e) => `${e.role} ${e.printedContext} ${e.pdfPage ?? ''}`)].join(' '));
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

export function renderList(catalogo: Canto[], stati: Record<string, Riassunto>, nomi: Record<string, string>, me: Utente): HTMLElement {
  const f = filtroSalvato();
  const admin = me.ruolo === 'admin';

  // -- progress
  const conta: Record<Stato, number> = { 'da-rivedere': 0, 'in-corso': 0, inviato: 0, rimandato: 0, approvato: 0 };
  for (const c of catalogo) conta[statoDi(stati[c.key])]++;
  const daApplicare = catalogo.filter((c) => stati[c.key]?.stato === 'approvato' && stati[c.key].cambiato && !stati[c.key].applicato).length;
  const totale = catalogo.length;
  const fatti = conta.approvato;
  const rivisti = conta.approvato + conta.inviato;

  const ordine: Stato[] = ['approvato', 'inviato', 'in-corso', 'rimandato', 'da-rivedere'];
  const bar = h('div', { class: 'rev-progress__bar', role: 'img', 'aria-label': ordine.map((s) => `${STATO_NOME[s]}: ${conta[s]}`).join(', ') },
    ...ordine.filter((s) => conta[s] > 0).map((s) => {
      const seg = h('span', { class: `rev-progress__seg stato--${s}`, title: `${STATO_NOME[s]}: ${conta[s]}` });
      seg.style.flexGrow = String(conta[s]);
      return seg;
    }));

  const progress = h('section', { class: 'rev-progress' },
    h('div', { class: 'rev-progress__numbers' },
      h('p', { class: 'rev-progress__big' }, h('strong', {}, String(fatti)), ` di ${totale} canti approvati`),
      h('p', { class: 'rev-progress__small' },
        `${rivisti} già rivisti, tra inviati e approvati (${percento(rivisti, totale)})`,
        admin && daApplicare ? ` · ${daApplicare} correzioni da portare sul sito` : '')),
    bar);

  // -- filters
  const chips: [Filtro['stato'], string, number | null][] = [
    ['tutti', 'Tutti', totale],
    ...STATI.map((s) => [s, STATO_NOME[s], conta[s]] as [Stato, string, number]),
    ['miei', 'Toccati da me', null],
    ...(admin ? [['da-applicare', 'Da portare sul sito', daApplicare] as [Filtro['stato'], string, number]] : []),
  ];
  const chipButtons = chips.map(([v, label, n]) =>
    h('button', { type: 'button', class: `choice__button rev-chip${v !== 'tutti' && v !== 'miei' && v !== 'da-applicare' ? ` rev-chip--${v}` : ''}`, 'aria-pressed': String(f.stato === v) },
      label, n !== null ? h('span', { class: 'rev-chip__n' }, String(n)) : null));
  selectOne(chipButtons, (i) => { f.stato = chips[i][0]; apply(); });
  const chipBar = h('div', { class: 'choice__bar rev-filters', role: 'group', 'aria-label': 'Filtra per stato' }, ...chipButtons);

  const gruppi = [...new Set(catalogo.map((c) => c.gruppo))];
  const sel = h('select', { class: 'ed-input rev-select', 'aria-label': 'Sezione' },
    h('option', { value: '' }, 'Tutte le sezioni'),
    ...gruppi.map((g) => h('option', { value: g, selected: g === f.gruppo }, g)));
  sel.addEventListener('change', () => { f.gruppo = sel.value; apply(); });
  const search = h('input', { type: 'search', class: 'ed-input rev-search', placeholder: 'Cerca incipit, pagina, giorno…', value: f.cerca, 'aria-label': 'Cerca' });
  search.addEventListener('input', () => { f.cerca = search.value; apply(); });

  // -- list
  const list = h('div', { class: 'rev-list' });
  const empty = h('p', { class: 'notice' }, 'Nessun canto con questi filtri.');

  function row(c: Canto): HTMLElement {
    const r = stati[c.key];
    const s = statoDi(r);
    const e = c.usi[0];
    const extra = r?.stato === 'approvato' && r.cambiato ? (r.applicato ? 'sul sito' : 'da portare sul sito') : undefined;
    return h('li', {},
      h('a', { class: 'rev-row', href: cantoHref(c.key) },
        h('span', { class: 'rev-row__text' },
          h('span', { class: 'rev-row__incipit' }, c.incipit),
          h('span', { class: 'rev-row__meta' }, [e.role, e.printedContext].filter(Boolean).join(' · '), c.usi.length > 1 ? ` · +${c.usi.length - 1}` : '')),
        h('span', { class: 'rev-row__page' }, e.pdfPage ?? ''),
        h('span', { class: 'rev-row__state' },
          statoPill(s, extra),
          r?.aggiornato ? h('span', { class: 'rev-row__who' }, `${nomi[r.da ?? ''] ?? r.da ?? ''} · ${quando(r.aggiornato)}`) : null,
          r?.commenti ? commenti(r.commenti) : null)));
  }

  function apply(): void {
    salvaFiltro(f);
    const visibili = catalogo.filter((c) => passa(c, stati[c.key], f, me));
    const perGruppo = new Map<string, Canto[]>();
    for (const c of visibili) {
      if (!perGruppo.has(c.gruppo)) perGruppo.set(c.gruppo, []);
      perGruppo.get(c.gruppo)!.push(c);
    }
    list.replaceChildren(...(visibili.length === 0 ? [empty] : [...perGruppo].map(([g, cs]) => {
      const tutti = catalogo.filter((c) => c.gruppo === g);
      const ok = tutti.filter((c) => statoDi(stati[c.key]) === 'approvato').length;
      return h('section', { class: 'rev-group' },
        h('h2', { class: 'rubric rev-group__title' }, g, h('span', { class: 'rev-group__count' }, `${ok}/${tutti.length} approvati`)),
        h('ul', { class: 'rev-rows' }, ...cs.map(row)));
    })));
  }
  apply();

  return h('main', { class: 'rev-wrap' },
    h('h1', { class: 'rev-title' }, 'Revisione degli spartiti'),
    h('p', { class: 'rev-intro' },
      admin
        ? 'Qui vedi a che punto è la revisione. Apri un canto «Da approvare» per vedere la correzione e approvarla o rimandarla.'
        : 'Apri un canto, confrontalo con il libretto e correggi lo spartito facendo clic sulle note. Quando hai finito invialo per l’approvazione, anche se non c’era niente da correggere.'),
    progress,
    h('div', { class: 'rev-toolbar' }, chipBar, h('div', { class: 'rev-toolbar__row' }, sel, search)),
    list);
}
