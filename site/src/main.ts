import 'exsurge';
import './fonts/fonts.css';
import './style.css';
import { formatCivilDate, liturgicalDay, parseIsoDate, todayLocal } from './calendar/calendar';
import { suggestedOffice } from './calendar/plan';
import { loadDatabase } from './data/loader';
import type { LiturgyData, Office } from './data/types';
import { OFFICE_NAME } from './ui/day';
import { h, notice } from './ui/dom';
import { renderEsamePage } from './ui/esame';
import { renderHome } from './ui/home';
import { officePage } from './ui/office-page';
import { setupThemeToggle } from './theme';

// Routes: #/ home · #/esame examination of conscience · #/2026-10-03/lodi an office
// (a missing or wrong date is today, a missing office the one for this hour).

const SITE_TITLE = 'Clivis · Liturgia delle Ore in canto gregoriano';

let liturgy: LiturgyData | null = null;
const app = document.getElementById('app')!;

function show(title: string, season: string | null, ...content: Node[]): void {
  document.title = title;
  if (season) document.documentElement.dataset.season = season;
  app.replaceChildren(...content);
  window.scrollTo({ top: 0 });
}

function render(): void {
  if (!liturgy) return;
  const path = location.hash.replace(/^#\/?/, '');
  if (path === '') {
    show(SITE_TITLE, liturgicalDay(todayLocal()).color, renderHome());
    return;
  }
  if (path === 'esame') {
    show('Esame di coscienza · Clivis', null, h('main', { class: 'office-wrap' }, renderEsamePage()));
    return;
  }
  const [d, o] = path.split('/');
  const day = liturgicalDay((d && parseIsoDate(d)) || todayLocal());
  const office: Office = o === 'lodi' || o === 'compieta' ? o : suggestedOffice();
  show(`${OFFICE_NAME[office]} · ${formatCivilDate(day.date, false)} · Clivis`, day.color,
    officePage(day, office, liturgy));
}

window.addEventListener('hashchange', render);
setupThemeToggle(document.getElementById('theme-toggle') as HTMLButtonElement);

loadDatabase()
  .then((data) => { liturgy = data; render(); })
  .catch((err: Error) => app.replaceChildren(notice(`Non è stato possibile caricare il breviario: ${err.message}`, 'error')));
