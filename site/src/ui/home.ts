// Home page: today's liturgical day, the two offices (the one for this hour
// in emphasis) and a short guide.

import { formatCivilDate, liturgicalDay, todayLocal, type LiturgicalDay } from '../calendar/calendar';
import { suggestedOffice } from '../calendar/plan';
import { saintsOfDay } from '../calendar/saintOfDay';
import type { Office } from '../data/types';
import { celebrationSubtitle, dayMeta, dayName, OFFICE_NAME, officeHref, RANK_LABEL } from './day';
import { h, svgSpan } from './dom';

const REPOSITORIES = {
  site: 'https://github.com/driacats/mlg-breviary',
  exsurge: 'https://github.com/driacats/exsurge',
};

const svgIcon = (body: string) => svgSpan(`<svg viewBox="0 0 24 24">${body}</svg>`, { class: 'home-icon', 'aria-hidden': 'true' });
const PLAY = '<path d="M8 5.5v13l10-6.5z"/>';
const FOLLOW = '<path d="M3 7h18M3 12h18M3 17h18" class="thin"/><rect x="9" y="4.5" width="5" height="15" rx="1.2" class="soft"/><path d="M9 20.5h5"/>';
const LANG = '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 6.5M11 6c-.5 3-2.5 5.5-5 6.5"/><path d="M13 20l3.5-8 3.5 8M14.2 17.3h4.6"/>';
const CHECK = '<path d="M5 4.5h11l3 3V19.5H5z"/><path d="M8.5 11l2 2 4-4M8.5 16h7"/>';

/** The saints (memorials) of the day, under the title. */
function saintsBlock(day: LiturgicalDay): HTMLElement | null {
  const { saints, note } = saintsOfDay(day);
  if (saints.length === 0) return note ? h('p', { class: 'saints__note' }, note) : null;
  return h('div', { class: 'saints' },
    h('p', { class: 'rubric saints__label' }, saints.length > 1 ? 'Santi del giorno' : 'Santo del giorno'),
    h('ul', { class: 'saints__list' },
      ...saints.map((s) => h('li', { class: `saints__item${s.notCelebrated ? ' saints__item--off' : ''}` },
        h('span', { class: 'saints__name' }, s.name),
        h('span', { class: 'saints__kind' }, RANK_LABEL[s.kind]),
        s.notCelebrated ? h('span', { class: 'saints__off' }, s.notCelebrated.charAt(0).toUpperCase() + s.notCelebrated.slice(1) + '.') : null))));
}

/** The first note of the logo's clivis; on hover the second note joins it. */
function neume(): HTMLElement {
  return svgSpan('<svg viewBox="7 8 18 16">'
    + '<path class="n1" d="M8 9.6Q8 8.8 8.8 8.8L15.2 8.8Q16 8.8 16 9.6L16 16Q16 16.8 15.2 16.8L9.6 16.8L9.6 22.7Q9.6 23.2 9.1 23.2L8.5 23.2Q8 23.2 8 22.7Z"/>'
    + '<path class="n2" d="M15.2 15.2L23.2 15.2Q24 15.2 24 16L24 22.4Q24 23.2 23.2 23.2L16.8 23.2Q16 23.2 16 22.4L16 16.8L15.2 16.8Z"/>'
    + '</svg>', { class: 'office-card__neume', 'aria-hidden': 'true' });
}

function officeCard(day: LiturgicalDay, office: Office, suggested: boolean): HTMLElement {
  return h('a', { class: `office-card${suggested ? ' office-card--now' : ''}`, href: officeHref(day.date, office) },
    h('span', { class: 'office-card__kicker' }, suggested ? 'Adesso' : office === 'lodi' ? 'Mattino' : 'Sera'),
    h('span', { class: 'office-card__name' }, OFFICE_NAME[office]),
    neume());
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
        h('a', { class: 'more-link', href: REPOSITORIES.site }, 'Clivis'),
        ' (sito e database) · ',
        h('a', { class: 'more-link', href: REPOSITORIES.exsurge }, 'exsurge'),
        ' (il motore degli spartiti).')),
  );
}
