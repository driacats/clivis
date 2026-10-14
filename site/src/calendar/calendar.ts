// The liturgical calendar as the site reads it. The days are computed at build
// time from the layers in calendaria/ (calendario generale, Europa, Italia,
// Genova…: see calendaria/compone.ts) and served as one file per year:
// calendarium/index.json and calendarium/<place>/<year>.json. Here they are
// only loaded and looked up; the date arithmetic and the names come from
// calendaria/tempus.ts.

import type { CalendarIndex, DayRecord, LiturgicalDay } from '../../../calendaria/dies';
import { parseIsoDate, toIsoDate, type CivilDate } from '../../../calendaria/tempus';

export {
  addDays, DAY_MS, formatCivilDate, fromDayNumber, isLateAdvent, isLent, MONTH_NAMES, parseIsoDate, ROMAN,
  toDayNumber, todayLocal, toIsoDate, weekdayOf, WEEKDAY_NAMES,
  type CivilDate, type LiturgicalColor, type Rank, type Season,
} from '../../../calendaria/tempus';
export {
  SATURDAY_OF_MARY,
  type Celebration, type ComuneId, type DayMemorial, type LiturgicalDay, type Memorial, type SaintOfDay, type SaintsResult,
} from '../../../calendaria/dies';

/** Folder of the generated calendar, next to the site. */
const CALENDAR_DIR = 'calendarium/';

async function fetchJson<T>(path: string): Promise<T> {
  // resolved against the page, like the other data files (data/loader.ts)
  const res = await fetch(new URL(CALENDAR_DIR + path, document.baseURI).toString());
  if (!res.ok) throw new Error(`impossibile caricare ${CALENDAR_DIR}${path} (${res.status})`);
  return res.json() as Promise<T>;
}

const days = new Map<string, LiturgicalDay>();
let index: CalendarIndex | null = null;

/** Loads the calendar of the site's place (calendaria/loca.json: "default"), all the years it was built for. */
export async function loadCalendar(): Promise<void> {
  index = await fetchJson<CalendarIndex>('index.json');
  const place = index.default;
  const files = await Promise.all(index.years.map((y) =>
    fetchJson<{ days: Record<string, DayRecord> }>(`${place}/${y}.json`)));
  for (const file of files) {
    for (const [iso, record] of Object.entries(file.days)) days.set(iso, { date: parseIsoDate(iso)!, ...record });
  }
}

/** The liturgical day of a date, or null if the calendar was not built for its year. */
export function liturgicalDay(date: CivilDate): LiturgicalDay | null {
  return days.get(toIsoDate(date)) ?? null;
}

/** The years the calendar was built for (one, normally: the current year when the site was built). */
export const calendarYears = (): number[] => index?.years ?? [];
