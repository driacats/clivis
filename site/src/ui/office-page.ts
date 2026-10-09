// An office page: the prayer on the left, the day's memorials and a month
// calendar on the right (stacked on phones: title, memorials, text, calendar).

import type { LiturgicalDay } from '../calendar/calendar';
import type { LiturgyData, Office } from '../data/types';
import { memorialList, monthCalendar } from './aside';
import { renderCompieta } from './compieta';
import { dayHeader } from './day';
import { h } from './dom';
import { renderLodi } from './lodi';

export function officePage(day: LiturgicalDay, office: Office, liturgy: LiturgyData): HTMLElement {
  let main: HTMLElement;
  let memorials: HTMLElement | null;
  if (office === 'lodi') {
    const lodi = renderLodi(day, liturgy);
    main = lodi.main;
    memorials = lodi.picker ?? memorialList(day);
  } else {
    main = renderCompieta(day, liturgy);
    memorials = memorialList(day);
  }
  return h('div', { class: 'office-page' },
    dayHeader(day, office),
    memorials ? h('aside', { class: 'office-page__memorials' }, memorials) : null,
    h('main', { class: 'office-wrap' }, main),
    h('aside', { class: 'office-page__calendar', 'aria-label': 'Calendario' }, monthCalendar(day.date, office)));
}
