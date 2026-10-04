import 'exsurge';
import './fonts/fonts.css';
import './style.css';
import {
  addDays, formatCivilDate, liturgicalDay, parseIsoDate, todayLocal, toIsoDate,
  type CivilDate, type LiturgicalColor, type LiturgicalDay,
} from './calendar/calendar';
import { loadDatabase } from './data/loader';
import type { LiturgyData, Office } from './data/types';
import { renderCompieta } from './ui/compieta';
import { h, notice } from './ui/dom';
import { renderLodi } from './ui/lodi';
import { renderEsamePage } from './ui/esame';
import { renderHome } from './ui/home';
import { setupThemeToggle } from './theme';

// --- routing: #/2026-10-03/lodi ----------------------------------------------

interface Route { date: CivilDate; office: Office }

function defaultOffice(now = new Date()): Office {
  return now.getHours() < 14 ? 'lodi' : 'compieta';
}

function readRoute(): Route {
  const [d, o] = location.hash.replace(/^#\/?/, '').split('/');
  const date = (d && parseIsoDate(d)) || todayLocal();
  const office: Office = o === 'lodi' || o === 'compieta' ? o : defaultOffice();
  return { date, office };
}

function hrefFor(r: Route): string {
  return `#/${toIsoDate(r.date)}/${r.office}`;
}

// --- page ----------------------------------------------------------------------

const COLOR_NAME: Record<LiturgicalColor, string> = {
  viola: 'viola', bianco: 'bianco', verde: 'verde', rosso: 'rosso', rosaceo: 'rosaceo',
};
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

function dayHeader(day: LiturgicalDay, route: Route): HTMLElement {
  const isToday = toIsoDate(day.date) === toIsoDate(todayLocal());
  const datePicker = h('input', { type: 'date', class: 'date-nav__picker', value: toIsoDate(day.date), 'aria-label': 'Scegli una data' });
  datePicker.addEventListener('change', () => {
    const d = parseIsoDate(datePicker.value);
    if (d) location.hash = hrefFor({ ...route, date: d });
  });

  return h('header', { class: 'day' },
    h('nav', { class: 'date-nav', 'aria-label': 'Giorno' },
      h('a', { class: 'date-nav__step', href: hrefFor({ ...route, date: addDays(day.date, -1) }), 'aria-label': 'Giorno precedente' }, '‹'),
      h('div', { class: 'date-nav__center' },
        h('span', { class: 'date-nav__date' }, formatCivilDate(day.date)),
        isToday ? h('span', { class: 'date-nav__today' }, 'oggi')
          : h('a', { class: 'date-nav__today date-nav__today--link', href: hrefFor({ ...route, date: todayLocal() }) }, 'torna a oggi'),
        datePicker),
      h('a', { class: 'date-nav__step', href: hrefFor({ ...route, date: addDays(day.date, 1) }), 'aria-label': 'Giorno successivo' }, '›')),
    h('h1', { class: 'day__title' }, day.celebration?.name ?? day.label),
    day.celebration ? h('p', { class: 'day__subtitle' }, `${day.celebration.rank === 'solennità' ? 'Solennità' : 'Festa'} · ${day.label}`) : null,
    !day.celebration && day.memorials.length
      ? h('p', { class: 'day__subtitle' }, day.memorials.map((m) =>
        `${m.commemoration ? 'Commemorazione' : m.rank === 'memoria' ? 'Memoria' : 'Memoria facoltativa'}: ${m.name}`).join(' · '))
      : null,
    h('p', { class: 'day__meta' },
      h('span', { class: 'swatch', 'data-color': day.color, 'aria-hidden': 'true' }),
      `Colore ${COLOR_NAME[day.color]}`,
      h('span', { class: 'day__dot', 'aria-hidden': 'true' }, '·'),
      `${ROMAN[day.psalterWeek]} settimana del salterio`),
    h('nav', { class: 'office-tabs', 'aria-label': 'Ufficio' },
      ...(['lodi', 'compieta'] as Office[]).map((o) => h('a', {
        class: 'office-tabs__tab', href: hrefFor({ ...route, office: o }),
        'aria-current': route.office === o ? 'page' : undefined,
      }, o === 'lodi' ? 'Lodi' : 'Compieta'))),
  );
}

let liturgy: LiturgyData | null = null;
const app = document.getElementById('app')!;

function render(): void {
  if (!liturgy) return;
  const path = location.hash.replace(/^#\/?/, '');
  if (path === '') {
    document.documentElement.dataset.season = liturgicalDay(todayLocal()).color;
    document.title = 'Clivis · Liturgia delle Ore in canto gregoriano';
    app.replaceChildren(renderHome());
    window.scrollTo({ top: 0 });
    return;
  }
  if (path === 'esame') {
    document.title = 'Esame di coscienza · Clivis';
    app.replaceChildren(h('main', { class: 'office-wrap' }, renderEsamePage()));
    window.scrollTo({ top: 0 });
    return;
  }
  const route = readRoute();
  const day = liturgicalDay(route.date);
  document.documentElement.dataset.season = day.color;
  document.title = `${route.office === 'lodi' ? 'Lodi' : 'Compieta'} · ${formatCivilDate(day.date, false)} · Clivis`;
  app.replaceChildren(
    dayHeader(day, route),
    h('main', { class: 'office-wrap' }, route.office === 'lodi' ? renderLodi(day, liturgy) : renderCompieta(day, liturgy)),
  );
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', render);
setupThemeToggle(document.getElementById('theme-toggle') as HTMLButtonElement);

loadDatabase()
  .then((data) => { liturgy = data; render(); })
  .catch((err: Error) => app.replaceChildren(notice(`Non è stato possibile caricare il breviario: ${err.message}`, 'error')));
