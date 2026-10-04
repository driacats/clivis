// The liturgical day as the reader sees it: title, rank, colour, psalter
// week. Shared by the home page and the header of an office.

import {
  addDays, formatCivilDate, parseIsoDate, ROMAN, todayLocal, toIsoDate,
  type CivilDate, type LiturgicalDay, type Season,
} from '../calendar/calendar';
import type { Office } from '../data/types';
import { h } from './dom';

export const SEASON_NAME: Record<Season, string> = {
  avvento: 'Tempo di Avvento',
  natale: 'Tempo di Natale',
  ordinario: 'Tempo Ordinario',
  quaresima: 'Tempo di Quaresima',
  triduo: 'Triduo pasquale',
  pasqua: 'Tempo di Pasqua',
};

export const OFFICE_NAME: Record<Office, string> = { lodi: 'Lodi', compieta: 'Compieta' };

/** Link to an office: #/2026-10-03/lodi */
export const officeHref = (date: CivilDate, office: Office) => `#/${toIsoDate(date)}/${office}`;

/** The day's name: the celebration if there is one, otherwise the weekday of the season. */
export const dayName = (day: LiturgicalDay) => day.celebration?.name ?? day.label;

/** "Solennità · XXVII Domenica…" under the name of a solemnity or feast. */
export function celebrationSubtitle(day: LiturgicalDay): HTMLElement | null {
  if (!day.celebration) return null;
  return h('p', { class: 'day__subtitle' }, `${day.celebration.rank === 'solennità' ? 'Solennità' : 'Festa'} · ${day.label}`);
}

/** Colour · (season ·) psalter week. */
export function dayMeta(day: LiturgicalDay, opts: { season?: boolean } = {}): HTMLElement {
  const dot = () => h('span', { class: 'day__dot', 'aria-hidden': 'true' }, '·');
  return h('p', { class: 'day__meta' },
    h('span', { class: 'swatch', 'aria-hidden': 'true' }),
    `Colore ${day.color}`,
    ...(opts.season ? [dot(), SEASON_NAME[day.season]] : []),
    dot(),
    `${ROMAN[day.psalterWeek]} settimana del salterio`);
}

/** Header of an office page: date navigation, the day, the Lodi / Compieta tabs. */
export function dayHeader(day: LiturgicalDay, office: Office): HTMLElement {
  const isToday = toIsoDate(day.date) === toIsoDate(todayLocal());
  const datePicker = h('input', { type: 'date', class: 'date-nav__picker', value: toIsoDate(day.date), 'aria-label': 'Scegli una data' });
  datePicker.addEventListener('change', () => {
    const d = parseIsoDate(datePicker.value);
    if (d) location.hash = officeHref(d, office);
  });

  return h('header', { class: 'day' },
    h('nav', { class: 'date-nav', 'aria-label': 'Giorno' },
      h('a', { class: 'date-nav__step', href: officeHref(addDays(day.date, -1), office), 'aria-label': 'Giorno precedente' }, '‹'),
      h('div', { class: 'date-nav__center' },
        h('span', { class: 'date-nav__date' }, formatCivilDate(day.date)),
        isToday ? h('span', { class: 'date-nav__today' }, 'oggi')
          : h('a', { class: 'date-nav__today date-nav__today--link', href: officeHref(todayLocal(), office) }, 'torna a oggi'),
        datePicker),
      h('a', { class: 'date-nav__step', href: officeHref(addDays(day.date, 1), office), 'aria-label': 'Giorno successivo' }, '›')),
    h('h1', { class: 'day__title' }, dayName(day)),
    celebrationSubtitle(day),
    !day.celebration && day.memorials.length
      ? h('p', { class: 'day__subtitle' }, day.memorials.map((m) =>
        `${m.commemoration ? 'Commemorazione' : m.rank === 'memoria' ? 'Memoria' : 'Memoria facoltativa'}: ${m.name}`).join(' · '))
      : null,
    dayMeta(day),
    h('nav', { class: 'office-tabs', 'aria-label': 'Ufficio' },
      ...(['lodi', 'compieta'] as Office[]).map((o) => h('a', {
        class: 'office-tabs__tab', href: officeHref(day.date, o),
        'aria-current': office === o ? 'page' : undefined,
      }, OFFICE_NAME[o]))),
  );
}
