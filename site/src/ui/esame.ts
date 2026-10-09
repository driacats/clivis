import { WEEKDAY_NAMES } from '../calendar/calendar';
import { getTexts } from '../data/loader';
import type { EsameCoscienza } from '../data/types';
import { bilingual, rubric, rubricText, section } from './pieces';
import { foldable, h } from './dom';

type Gruppo = EsameCoscienza['giorni'][string][number];

function gruppo(g: Gruppo): HTMLElement {
  return h('div', { class: 'esame__gruppo' },
    g.nota ? rubricText(g.nota) : null,
    h('ol', { class: 'esame__voci' },
      ...g.voci.map((v) => h('li', { value: v.n }, v.testo))));
}

/** The examination of conscience for one day of the week. */
export function esameDelGiorno(weekday: number): HTMLElement {
  const name = WEEKDAY_NAMES[weekday];
  const gruppi = getTexts().esame.giorni[name] ?? [];
  return h('div', { class: 'esame' }, rubric(name), ...gruppi.map(gruppo));
}

/** Penitential act (Confiteor, alternatives, absolution). */
export function attoPenitenziale(): HTMLElement {
  const a = getTexts().esame.attoPenitenziale;
  const sign = (s: string) => h('span', { class: 'response-sign' }, s === 'V' ? '℣. ' : '℟. ');
  return h('div', {},
    rubricText(a.rubrica),
    bilingual(a.confiteor),
    ...a.alternative.map((alt) => foldable(`Oppure: ${alt[0][1]}`,
      ...alt.map(([who, text]) => h('p', { class: 'prayer__single' }, sign(who), text)))),
    rubricText(a.conclusione.rubrica),
    bilingual(a.conclusione));
}

/** Full page with every scheme printed in the libretto. */
export function renderEsamePage(): HTMLElement {
  const e = getTexts().esame;
  return h('div', { class: 'office' },
    h('p', {}, h('a', { href: '#/', class: 'back-link' }, '‹ Torna alla pagina di oggi')),
    h('h1', { class: 'day__title' }, 'Esame di coscienza'),
    h('p', { class: 'esame__intro' }, e.introduzione),
    ...e.schemi.map((s) => section(s.titolo,
      h('ul', { class: 'esame__voci esame__voci--plain' },
        ...s.voci.map((v) => h('li', {}, v.etichetta ? h('strong', {}, `${v.etichetta}: `) : null, v.testo))))),
    section('Per ogni giorno della settimana',
      ...WEEKDAY_NAMES.map((d) => h('div', { class: 'esame', id: `esame-${d}` }, rubric(d), ...(e.giorni[d] ?? []).map(gruppo)))),
    section('Atto penitenziale', attoPenitenziale()),
  );
}
