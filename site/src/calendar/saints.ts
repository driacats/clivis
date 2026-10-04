// The saint(s) of the day as the home page shows them. The memorials come from
// the calendar (santi.ts, through LiturgicalDay.memorials); this module adds
// what the home page also wants to say: a feast or memorial of this date that
// is not celebrated this year (and why), or that the day is a feria.

import {
  displacedCelebration, formatCivilDate, movableDates, toDayNumber, type LiturgicalDay,
} from './calendar';
import { fixedMemorials } from './santi';

export interface SaintOfDay {
  name: string;
  /** the rank it has in the calendar, or what the calendar makes of it today */
  kind: 'festa' | 'solennità' | 'memoria' | 'memoria facoltativa' | 'commemorazione';
  /** set when it is not celebrated today: why (or where it is moved to) */
  notCelebrated?: string;
}

export interface SaintsResult {
  saints: SaintOfDay[];
  /** shown when there is no saint at all */
  note: string | null;
}

const displayName = (name: string) => name.replace(/^Memoria di /, '');

/**
 * Memorials of the Roman calendar that santi.ts leaves out because the
 * libretto has no Comune for them (they have a proper office): shown on the
 * home page only.
 */
const WITHOUT_COMUNE: { month: number; day: number; name: string; rank: 'memoria' | 'memoria facoltativa' }[] = [
  { month: 1, day: 3, name: 'Santissimo Nome di Gesù', rank: 'memoria facoltativa' },
  { month: 10, day: 2, name: 'Santi Angeli custodi', rank: 'memoria' },
];

export function saintsOfDay(day: LiturgicalDay): SaintsResult {
  // a solemnity or feast celebrated today is already the title of the day
  if (day.celebration) return { saints: [], note: null };

  const n = toDayNumber(day.date);
  const mv = movableDates(day.date.year);
  const why = day.weekday === 0 ? 'quest’anno cade di domenica: prevale la domenica'
    : n === mv.ashWednesday ? 'quest’anno coincide con il Mercoledì delle Ceneri e non si celebra'
    : day.inOctave === 'natale' ? 'quest’anno cade nell’Ottava di Natale e non si celebra'
    : 'quest’anno cade nella Settimana Santa o nell’Ottava di Pasqua e non si celebra';

  // a solemnity or feast of this date, displaced by the season or moved
  const displaced = displacedCelebration(day.date);
  if (displaced) {
    return {
      saints: [{
        name: displaced.name,
        kind: displaced.rank,
        notCelebrated: displaced.movedTo ? `quest’anno si celebra ${formatCivilDate(displaced.movedTo)}` : why,
      }],
      note: null,
    };
  }

  const extra = WITHOUT_COMUNE.filter((m) => m.month === day.date.month && m.day === day.date.day);
  const allowed = day.weekday !== 0 && day.season !== 'triduo' && day.inOctave === null
    && n !== mv.ashWednesday && !(n >= mv.palmSunday && n < mv.easter);
  const commemoration = day.season === 'quaresima' || (day.date.month === 12 && day.date.day >= 17 && day.date.day <= 24);

  if (day.memorials.length || (allowed && extra.length)) {
    const fromExtra: SaintOfDay[] = allowed ? extra.map((m) => ({ name: m.name, kind: commemoration ? 'commemorazione' : m.rank })) : [];
    // an obligatory memorial without Comune (Guardian Angels) excludes the optional ones
    const listed = fromExtra.some((s) => s.kind === 'memoria') ? [] : day.memorials.filter((m) => !/Santa Maria in sabato/.test(m.name) || !fromExtra.length);
    return {
      saints: [...fromExtra, ...listed.map((m): SaintOfDay => ({
        name: displayName(m.name),
        kind: m.commemoration ? 'commemorazione' : m.rank,
      }))],
      note: null,
    };
  }

  // memorials of this date that the day does not allow (Sunday, Holy Week…)
  const impeded = [...extra, ...fixedMemorials(day.date.month, day.date.day)];
  if (impeded.length) {
    return {
      saints: impeded.map((m) => ({ name: displayName(m.name), kind: m.rank, notCelebrated: why })),
      note: null,
    };
  }

  const quiet = day.weekday === 0 || day.season === 'triduo' || day.inOctave !== null;
  return { saints: [], note: quiet ? null : 'Oggi il calendario non ha memorie di santi: si celebra la feria.' };
}
