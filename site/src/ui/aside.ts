// The sidebar of an office page: the memorials of the day and a month calendar.

import {
  formatCivilDate, fromDayNumber, MONTH_NAMES, toDayNumber, toIsoDate, todayLocal, weekdayOf,
  type CivilDate, type LiturgicalDay,
} from '../calendar/calendar';
import { lodiCelebrations } from '../calendar/plan';
import type { Office } from '../data/types';
import { memorialKind, officeHref } from './day';
import { h, selectOne } from './dom';

interface CelebrationItem {
  label: string;
  /** "Memoria facoltativa", "Feria"… shown small under the name */
  kind?: string;
}

const item = (it: CelebrationItem) => [it.label, it.kind ? h('span', { class: 'aside-list__kind' }, it.kind) : null];

/**
 * The celebrations the Lodi can be said for, as a list of buttons: choosing one
 * calls `onSelect` (also once at the start, with `initial`).
 */
function celebrationPicker(items: CelebrationItem[], initial: number, onSelect: (i: number) => void): HTMLElement {
  const buttons = items.map((it) => h('button', { type: 'button', class: 'aside-list__item' }, ...item(it)));
  selectOne(buttons, onSelect)(initial);
  return h('nav', { class: 'aside-list', 'aria-label': 'Celebrazione' }, ...buttons);
}

/** The memorials of the day when there is nothing to choose (solemnities, feasts). */
function memorialList(day: LiturgicalDay): HTMLElement | null {
  if (day.memorials.length === 0) return null;
  return h('div', { class: 'aside-list', role: 'list' },
    ...day.memorials.map((m) => h('p', { class: 'aside-list__item aside-list__item--static', role: 'listitem' },
      ...item({ label: m.name, kind: memorialKind(m) }))));
}

/** What can be chosen in the sidebar of the Lodi: `onSelect` is called with the index of the celebration. */
export interface CelebrationSelect {
  initial: number;
  onSelect: (i: number) => void;
}

/**
 * The celebrations of the day in the sidebar, the same for every office: the
 * feria and its memorials. With `select` (the Lodi, whose text changes with the
 * celebration) they are buttons; without (Compieta) they are just listed.
 * When there is nothing to choose it is the day's memorials, or null.
 */
export function celebrationList(day: LiturgicalDay, select?: CelebrationSelect): HTMLElement | null {
  const { options } = lodiCelebrations(day);
  if (options.length === 1) return memorialList(day);
  const items = options.map((o): CelebrationItem => {
    if (o.mode === 'feria') return { label: day.label, kind: 'Feria' };
    const m = day.memorials.find((x) => x.name === o.name);
    return { label: o.label, kind: m ? memorialKind(m) : undefined };
  });
  if (select) return celebrationPicker(items, select.initial, select.onSelect);
  return h('div', { class: 'aside-list', role: 'list' },
    ...items.map((it) => h('p', { class: 'aside-list__item aside-list__item--static', role: 'listitem' }, ...item(it))));
}

/** Six weeks always hold a month; a fifth row is enough when the month ends by then. */
const GRID_CELLS = 6 * 7;
const FIVE_ROWS = 5 * 7;
const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];

/** Month grid starting on Sunday; each day links to the same office on that date. */
export function monthCalendar(selected: CivilDate, office: Office): HTMLElement {
  let year = selected.year;
  let month = selected.month; // 1-12
  const root = h('div', { class: 'month-cal' });
  const selectedIso = toIsoDate(selected);
  const todayIso = toIsoDate(todayLocal());

  function step(delta: number) {
    month += delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    draw();
  }

  function draw() {
    const first = toDayNumber({ year, month, day: 1 });
    const start = first - weekdayOf(first);
    const prev = h('button', { type: 'button', class: 'month-cal__step', 'aria-label': 'Mese precedente' }, '‹');
    const next = h('button', { type: 'button', class: 'month-cal__step', 'aria-label': 'Mese successivo' }, '›');
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));

    const cells: HTMLElement[] = [];
    for (let i = 0; i < GRID_CELLS; i++) {
      const date = fromDayNumber(start + i);
      if (i >= FIVE_ROWS && date.month !== month) break;
      const iso = toIsoDate(date);
      cells.push(h('a', {
        class: `month-cal__day${date.month !== month ? ' month-cal__day--out' : ''}${iso === todayIso ? ' month-cal__day--today' : ''}`,
        href: officeHref(date, office),
        'aria-current': iso === selectedIso ? 'date' : undefined,
        'aria-label': formatCivilDate(date, false),
      }, String(date.day)));
    }

    root.replaceChildren(
      h('div', { class: 'month-cal__head' }, prev,
        h('span', { class: 'month-cal__title', 'aria-live': 'polite' }, `${MONTH_NAMES[month - 1]} ${year}`), next),
      h('div', { class: 'month-cal__grid' },
        ...WEEKDAY_SHORT.map((d) => h('span', { class: 'month-cal__weekday', 'aria-hidden': 'true' }, d)),
        ...cells));
  }

  draw();
  return root;
}
