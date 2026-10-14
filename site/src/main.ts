import 'exsurge';
import './fonts/fonts.css';
import './style.css';
import { calendarYears, formatCivilDate, liturgicalDay, loadCalendar, parseIsoDate, todayLocal, type CivilDate, type LiturgicalColor } from './calendar/calendar';
import { suggestedOffice } from './calendar/plan';
import { loadDatabase } from './data/loader';
import type { LiturgyData } from './data/types';
import { OFFICE_NAME, OFFICES } from './ui/day';
import { h, notice } from './ui/dom';
import { renderEsamePage } from './ui/esame';
import { renderHome } from './ui/home';
import { officePage } from './ui/office-page';
import { setupThemeToggle } from './theme';

// Routes: #/ home · #/esame examination of conscience · #/2026-10-03/lodi an office
// (a missing or wrong date is today, a missing office the one for this hour).

const SITE_NAME = 'Clivis';
const SITE_TITLE = `${SITE_NAME} · Liturgia delle Ore in canto gregoriano`;

let liturgy: LiturgyData | null = null;
const app = document.getElementById('app')!;

/** Shows a page; `color` is the liturgical colour of the day it is about. */
function show(title: string, color: LiturgicalColor | null, ...content: Node[]): void {
  document.title = title;
  if (color) document.documentElement.dataset.color = color;
  app.replaceChildren(...content);
  window.scrollTo({ top: 0 });
}

/** A date the calendar was not built for (calendaria/compone.ts generates one year at a time). */
function outOfCalendar(date: CivilDate): HTMLElement {
  return h('main', { class: 'office-wrap' },
    notice(`Il calendario di questo sito copre per ora il ${calendarYears().join(', ')}: `
      + `${formatCivilDate(date, false)} non è ancora disponibile.`, 'gap'),
    h('p', {}, h('a', { class: 'back-link', href: '#/' }, 'Torna a oggi')));
}

function render(): void {
  if (!liturgy) return;
  const path = location.hash.replace(/^#\/?/, '');
  if (path === '') {
    const today = liturgicalDay(todayLocal());
    if (today) show(SITE_TITLE, today.color, renderHome(today));
    else show(SITE_TITLE, null, outOfCalendar(todayLocal()));
    return;
  }
  if (path === 'esame') {
    show(`Esame di coscienza · ${SITE_NAME}`, null, h('main', { class: 'office-wrap' }, renderEsamePage()));
    return;
  }
  const [d, o] = path.split('/');
  const date = (d && parseIsoDate(d)) || todayLocal();
  const day = liturgicalDay(date);
  if (!day) {
    show(`${formatCivilDate(date, false)} · ${SITE_NAME}`, null, outOfCalendar(date));
    return;
  }
  const office = OFFICES.find((x) => x === o) ?? suggestedOffice();
  show(`${OFFICE_NAME[office]} · ${formatCivilDate(day.date, false)} · ${SITE_NAME}`, day.color,
    officePage(day, office, liturgy));
}

window.addEventListener('hashchange', render);
setupThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);

Promise.all([loadDatabase(), loadCalendar()])
  .then(([data]) => { liturgy = data; render(); })
  .catch((err: Error) => app.replaceChildren(notice(`Non è stato possibile caricare il breviario: ${err.message}`, 'error')));
