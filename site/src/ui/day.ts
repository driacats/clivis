// The liturgical day as the reader sees it: title, rank, colour, psalter
// week. Shared by the home page and the header of an office.

import {
  addDays, formatCivilDate, ROMAN, todayLocal, toIsoDate,
  type CivilDate, type LiturgicalDay, type Season,
} from '../calendar/calendar';
import type { Office } from '../data/types';
import { h } from './dom';

const SEASON_NAME: Record<Season, string> = {
  avvento: 'Tempo di Avvento',
  natale: 'Tempo di Natale',
  ordinario: 'Tempo Ordinario',
  quaresima: 'Tempo di Quaresima',
  triduo: 'Triduo pasquale',
  pasqua: 'Tempo di Pasqua',
};

export const OFFICE_NAME: Record<Office, string> = { lodi: 'Lodi', compieta: 'Compieta' };

/** The offices of the site, in the order of the day. */
export const OFFICES = Object.keys(OFFICE_NAME) as Office[];

/** Link to an office: #/2026-10-03/lodi */
export const officeHref = (date: CivilDate, office: Office) => `#/${toIsoDate(date)}/${office}`;

/** The day's name: the celebration if there is one, otherwise the weekday of the season. */
export const dayName = (day: LiturgicalDay) => day.celebration?.name ?? day.label;

/** Names of the ranks of a celebration, as the reader sees them. */
export const RANK_LABEL = {
  'solennità': 'Solennità', festa: 'Festa', memoria: 'Memoria', 'memoria facoltativa': 'Memoria facoltativa', commemorazione: 'Commemorazione',
} as const;

/** What a memorial is called in the sidebar: Commemorazione, Memoria, Memoria facoltativa. */
export const memorialKind = (m: { commemoration: boolean; rank: 'memoria' | 'memoria facoltativa' }) =>
  RANK_LABEL[m.commemoration ? 'commemorazione' : m.rank];

/** "Solennità · XXVII Domenica…" under the name of a solemnity or feast. */
export function celebrationSubtitle(day: LiturgicalDay): HTMLElement | null {
  if (!day.celebration) return null;
  return h('p', { class: 'day__subtitle' }, `${RANK_LABEL[day.celebration.rank]} · ${day.label}`);
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

/**
 * Header of an office page: date navigation, the day, the Lodi / Compieta tabs.
 * Memorials and the month calendar live in the sidebar (ui/aside.ts).
 */
export function dayHeader(day: LiturgicalDay, office: Office): HTMLElement {
  const isToday = toIsoDate(day.date) === toIsoDate(todayLocal());
  return h('header', { class: 'day' },
    h('nav', { class: 'date-nav', 'aria-label': 'Giorno' },
      h('a', { class: 'date-nav__step', href: officeHref(addDays(day.date, -1), office), 'aria-label': 'Giorno precedente' }, '‹'),
      h('div', { class: 'date-nav__center' },
        h('span', { class: 'date-nav__date' }, formatCivilDate(day.date)),
        isToday ? h('span', { class: 'date-nav__today' }, 'oggi')
          : h('a', { class: 'date-nav__today date-nav__today--link', href: officeHref(todayLocal(), office) }, 'torna a oggi')),
      h('a', { class: 'date-nav__step', href: officeHref(addDays(day.date, 1), office), 'aria-label': 'Giorno successivo' }, '›')),
    h('h1', { class: 'day__title' }, dayName(day)),
    celebrationSubtitle(day),
    dayMeta(day),
    h('nav', { class: 'office-tabs', 'aria-label': 'Ufficio' },
      ...OFFICES.map((o) => h('a', {
        class: 'office-tabs__tab', href: officeHref(day.date, o),
        'aria-current': office === o ? 'page' : undefined,
      }, OFFICE_NAME[o]))),
  );
}
