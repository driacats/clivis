// The sidebar of an office page: the memorials of the day and a month calendar.

import {
  fromDayNumber, toDayNumber, toIsoDate, todayLocal, weekdayOf,
  type CivilDate, type LiturgicalDay,
} from '../calendar/calendar';
import type { Office } from '../data/types';
import { memorialKind, officeHref } from './day';
import { h } from './dom';

export interface CelebrationItem {
  label: string;
  /** "Memoria facoltativa", "Feria"… shown small under the name */
  kind?: string;
}

const item = (it: CelebrationItem) => [it.label, it.kind ? h('span', { class: 'aside-list__kind' }, it.kind) : null];

/**
 * The celebrations the Lodi can be said for, as a list of buttons: choosing one
 * calls `onSelect` (also once at the start, with `initial`).
 */
export function celebrationPicker(items: CelebrationItem[], initial: number, onSelect: (i: number) => void): HTMLElement {
  const buttons = items.map((it, i) => {
    const b = h('button', { type: 'button', class: 'aside-list__item', 'aria-pressed': String(i === initial) }, ...item(it));
    b.addEventListener('click', () => select(i));
    return b;
  });
  function select(i: number) {
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    onSelect(i);
  }
  onSelect(initial);
  return h('nav', { class: 'aside-list', 'aria-label': 'Celebrazione' }, ...buttons);
}

/** The memorials of the day when there is nothing to choose (Compieta, solemnities). */
export function memorialList(day: LiturgicalDay): HTMLElement | null {
  if (day.memorials.length === 0) return null;
  return h('div', { class: 'aside-list', role: 'list' },
    ...day.memorials.map((m) => h('p', { class: 'aside-list__item aside-list__item--static', role: 'listitem' },
      ...item({ label: m.name, kind: memorialKind(m) }))));
}

const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto',
  'settembre', 'ottobre', 'novembre', 'dicembre'];
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
    for (let i = 0; i < 42; i++) {
      const date = fromDayNumber(start + i);
      if (i >= 35 && date.month !== month) break; // five rows are enough
      const iso = toIsoDate(date);
      cells.push(h('a', {
        class: `month-cal__day${date.month !== month ? ' month-cal__day--out' : ''}${iso === todayIso ? ' month-cal__day--today' : ''}`,
        href: officeHref(date, office),
        'aria-current': iso === selectedIso ? 'date' : undefined,
        'aria-label': `${date.day} ${MONTH_NAMES[date.month - 1]} ${date.year}`,
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
