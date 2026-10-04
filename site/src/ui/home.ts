// Home page: today's liturgical day, the two offices (the one for this hour
// first in emphasis), the week ahead with its colours, and a short guide.

import {
  addDays, formatCivilDate, liturgicalDay, todayLocal, WEEKDAY_NAMES, type LiturgicalDay,
} from '../calendar/calendar';
import { suggestedOffice } from '../calendar/plan';
import { saintsOfDay } from '../calendar/saints';
import type { Office } from '../data/types';
import { celebrationSubtitle, dayMeta, dayName, OFFICE_NAME, officeHref } from './day';
import { h } from './dom';

const svgIcon = (body: string) => {
  const span = h('span', { class: 'home-icon', 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24">${body}</svg>`;
  return span;
};
const SUN = '<circle cx="12" cy="14" r="4"/><path d="M12 5.5v2M5.2 8.2l1.4 1.4M18.8 8.2l-1.4 1.4M3 14h2M19 14h2M3 19h18"/>';
const MOON = '<path d="M19 15.5A7.5 7.5 0 0 1 8.5 5a7.5 7.5 0 1 0 10.5 10.5z"/><path d="M17 4.5l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" class="fill"/>';
const PLAY = '<path d="M8 5.5v13l10-6.5z"/>';
const FOLLOW = '<path d="M3 7h18M3 12h18M3 17h18" class="thin"/><rect x="9" y="4.5" width="5" height="15" rx="1.2" class="soft"/><path d="M9 20.5h5"/>';
const LANG = '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 6.5M11 6c-.5 3-2.5 5.5-5 6.5"/><path d="M13 20l3.5-8 3.5 8M14.2 17.3h4.6"/>';
const CHECK = '<path d="M5 4.5h11l3 3V19.5H5z"/><path d="M8.5 11l2 2 4-4M8.5 16h7"/>';

const KIND_LABEL = { festa: 'Festa', 'solennità': 'Solennità', memoria: 'Memoria', 'memoria facoltativa': 'Memoria facoltativa', commemorazione: 'Commemorazione' } as const;

/** The saints (memorials) of the day, under the title. */
function saintsBlock(day: LiturgicalDay): HTMLElement | null {
  const { saints, note } = saintsOfDay(day);
  if (saints.length === 0) return note ? h('p', { class: 'saints__note' }, note) : null;
  return h('div', { class: 'saints' },
    h('p', { class: 'rubric saints__label' }, saints.length > 1 ? 'Santi del giorno' : 'Santo del giorno'),
    h('ul', { class: 'saints__list' },
      ...saints.map((s) => h('li', { class: `saints__item${s.notCelebrated ? ' saints__item--off' : ''}` },
        h('span', { class: 'saints__name' }, s.name),
        h('span', { class: 'saints__kind' }, KIND_LABEL[s.kind]),
        s.notCelebrated ? h('span', { class: 'saints__off' }, s.notCelebrated.charAt(0).toUpperCase() + s.notCelebrated.slice(1) + '.') : null))));
}

/** The first note of the logo's clivis; on hover the second note joins it. */
function neume(): HTMLElement {
  const span = h('span', { class: 'office-card__neume', 'aria-hidden': 'true' });
  span.innerHTML = '<svg viewBox="7 8 18 16">'
    + '<path class="n1" d="M8 9.6Q8 8.8 8.8 8.8L15.2 8.8Q16 8.8 16 9.6L16 16Q16 16.8 15.2 16.8L9.6 16.8L9.6 22.7Q9.6 23.2 9.1 23.2L8.5 23.2Q8 23.2 8 22.7Z"/>'
    + '<path class="n2" d="M15.2 15.2L23.2 15.2Q24 15.2 24 16L24 22.4Q24 23.2 23.2 23.2L16.8 23.2Q16 23.2 16 22.4L16 16.8L15.2 16.8Z"/>'
    + '</svg>';
  return span;
}

function officeCard(day: LiturgicalDay, office: Office, suggested: boolean): HTMLElement {
  const lodi = office === 'lodi';
  return h('a', { class: `office-card${suggested ? ' office-card--now' : ''}`, href: officeHref(day.date, office) },
    svgIcon(lodi ? SUN : MOON),
    h('span', { class: 'office-card__text' },
      h('span', { class: 'office-card__kicker' }, lodi ? 'Preghiera del mattino' : 'Preghiera della sera'),
      h('span', { class: 'office-card__name' }, OFFICE_NAME[office]),
      h('span', { class: 'office-card__desc' }, lodi
        ? 'Inno, salmi, cantico di Zaccaria, invocazioni e orazione.'
        : 'Esame di coscienza, inno, salmi, cantico di Simeone e antifona alla Vergine.')),
    suggested ? h('span', { class: 'office-card__badge' }, 'Adesso') : null,
    neume());
}

function weekStrip(today: LiturgicalDay): HTMLElement {
  const days = Array.from({ length: 7 }, (_, i) => liturgicalDay(addDays(today.date, i)));
  return h('ol', { class: 'week' },
    ...days.map((d, i) => {
      const special = d.celebration?.name ?? (d.weekday === 0 ? d.label : null);
      return h('li', { 'data-season': d.color },
        h('a', { class: `week__day${i === 0 ? ' week__day--today' : ''}`, href: officeHref(d.date, 'lodi'),
          'aria-label': `${formatCivilDate(d.date)}: ${dayName(d)}` },
          h('span', { class: 'week__wd' }, i === 0 ? 'Oggi' : WEEKDAY_NAMES[d.weekday].slice(0, 3)),
          h('span', { class: 'week__num' }, String(d.date.day)),
          h('span', { class: 'week__dot', 'aria-hidden': 'true' }),
          special ? h('span', { class: 'week__name' }, shortName(special)) : null));
    }));
}

/** "XXVIII Domenica del Tempo Ordinario" → "XXVIII Domenica"; long feast names are cut by CSS. */
function shortName(name: string): string {
  return name.replace(/ del Tempo Ordinario$/, '').replace(/ di (Avvento|Quaresima|Pasqua)$/, '');
}

function guideItem(icon: string, title: string, text: string): HTMLElement {
  return h('li', { class: 'guide__item' }, svgIcon(icon),
    h('span', {}, h('strong', {}, title), ' ', text));
}

export function renderHome(): HTMLElement {
  const today = liturgicalDay(todayLocal());
  const now = suggestedOffice();

  return h('main', { class: 'home' },
    h('section', { class: 'home-today', 'aria-labelledby': 'home-today-title' },
      h('p', { class: 'home-today__date' }, formatCivilDate(today.date)),
      h('h1', { class: 'home-today__title', id: 'home-today-title' }, dayName(today)),
      celebrationSubtitle(today),
      dayMeta(today, { season: true }),
      saintsBlock(today)),

    h('nav', { class: 'office-cards', 'aria-label': 'Uffici di oggi' },
      officeCard(today, 'lodi', now === 'lodi'),
      officeCard(today, 'compieta', now === 'compieta')),

    h('section', { class: 'home-block' },
      h('h2', { class: 'rubric' }, 'I prossimi giorni'),
      weekStrip(today)),

    h('section', { class: 'home-block' },
      h('h2', { class: 'rubric' }, 'Come si usa'),
      h('ul', { class: 'guide' },
        guideItem(PLAY, 'Ascolta.', 'Sotto ogni spartito: l’antifona, l’Euouae e il tono per intonare il salmo, a tre velocità.'),
        guideItem(FOLLOW, 'Segui la nota.', 'Mentre la melodia suona, una fascia sul rigo indica la nota a cui sei arrivato.'),
        guideItem(LANG, 'Italiano e latino.', 'I salmi si leggono in italiano, in latino o affiancati; la scelta resta memorizzata.'),
        guideItem(CHECK, 'Ogni giorno il suo ufficio.', 'Il breviario segue il calendario romano (CEI): tempo, settimana del salterio, solennità e feste.')),
      h('p', { class: 'home-links' },
        h('a', { class: 'more-link', href: '#/esame' }, 'Esame di coscienza'),
        h('span', { 'aria-hidden': 'true' }, ' · '),
        h('a', { class: 'more-link', href: officeHref(today.date, now) }, 'Scegli un altro giorno'))),

    h('section', { class: 'home-block home-about' },
      h('h2', { class: 'rubric' }, 'Il breviario Clivis'),
      h('p', {},
        'Le Lodi e la Compieta come le canta il Movimento Liturgico Giovanile: testi e melodie gregoriane dai libretti ',
        h('em', {}, 'Lodi complete'), ' e ', h('em', {}, 'Compieta piccola'),
        ', trascritti e confrontati spartito per spartito. Il breviario cresce poco a poco: i tempi forti e le altre ore si aggiungono man mano.'),
      h('p', { class: 'home-links' },
        'Il codice è su GitHub: ',
        h('a', { class: 'more-link', href: 'https://github.com/driacats/mlg-breviary' }, 'Clivis'),
        ' (sito e database) · ',
        h('a', { class: 'more-link', href: 'https://github.com/driacats/exsurge' }, 'exsurge'),
        ' (il motore degli spartiti).')),
  );
}
