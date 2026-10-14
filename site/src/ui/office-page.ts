// An office page: the prayer on the left, the day's memorials and a month
// calendar on the right. On phones the memorials leave the page: a small "MF"
// button at the top right opens them in a pop-up (only if there are any).

import type { LiturgicalDay } from '../calendar/calendar';
import type { LiturgyData, Office } from '../data/types';
import { celebrationList, monthCalendar } from './aside';
import { renderCompieta } from './compieta';
import { dayHeader } from './day';
import { h } from './dom';
import { renderLodi } from './lodi';

/** The memorials in a sheet (a side block on wide screens, a pop-up on phones) and the button that opens it. */
function memorialsSheet(list: HTMLElement): { sheet: HTMLElement; opener: HTMLButtonElement } {
  const close = h('button', { type: 'button', class: 'memo-sheet__close', 'aria-label': 'Chiudi' }, '×');
  const opener = h('button', {
    type: 'button', class: 'memo-opener', 'aria-expanded': 'false', 'aria-controls': 'memorie-del-giorno',
    'aria-label': 'Memorie del giorno', title: 'Memorie del giorno',
  }, 'MF');
  const sheet = h('aside', { class: 'office-page__memorials', id: 'memorie-del-giorno' },
    h('div', { class: 'memo-sheet' },
      h('div', { class: 'memo-sheet__head' }, h('p', { class: 'rubric memo-sheet__title' }, 'Memorie del giorno'), close),
      list));

  const setOpen = (open: boolean) => {
    sheet.classList.toggle('is-open', open);
    opener.setAttribute('aria-expanded', String(open));
    if (open) close.focus(); else opener.focus({ preventScroll: true });
  };
  opener.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  sheet.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === sheet || t.closest('.aside-list__item')) setOpen(false); // backdrop, or a celebration was chosen
  });
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  return { sheet, opener };
}

export function officePage(day: LiturgicalDay, office: Office, liturgy: LiturgyData): HTMLElement {
  const lodi = office === 'lodi' ? renderLodi(day, liturgy) : null;
  const main = lodi ? lodi.main : renderCompieta(day, liturgy);
  const list = celebrationList(day, lodi?.select ?? undefined);
  const memorials = list ? memorialsSheet(list) : null;
  return h('div', { class: 'office-page' },
    dayHeader(day, office),
    memorials?.opener,
    memorials?.sheet,
    h('main', { class: 'office-wrap' }, main),
    h('aside', { class: 'office-page__calendar', 'aria-label': 'Calendario' }, monthCalendar(day.date, office)));
}
