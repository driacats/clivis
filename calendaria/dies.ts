// The liturgical days of a year for a calendar (the layers already merged by
// compone.ts): the temporal cycle (tempus.ts) plus the celebrations of the
// layers, resolved with the table of precedence of the General Norms for the
// Liturgical Year and the Calendar (n. 59-60).
//
// The types at the top are also what the site reads from the generated files
// (calendarium/<place>/<year>.json), so this module has no Node dependencies.

import {
  dayNum, formatCivilDate, fromDayNumber, movableDates, temporalDay, toDayNumber, toIsoDate, weekdayOf,
  type Anchor, type CivilDate, type LiturgicalColor, type Rank, type Season, type Settings, type TemporalDay,
} from './tempus';

// --- what the site reads --------------------------------------------------------

/** The Comuni of the libretto (pp. 203-299), as in testi/comuni.json. */
export type ComuneId =
  | 'dedicazione' | 'bvm' | 'apostoli' | 'piu-martiri' | 'un-martire' | 'pastori' | 'dottori'
  | 'monaci' | 'monache' | 'vergini' | 'santi' | 'sante' | 'religiosi';

export interface Celebration {
  name: string;
  rank: Rank;
  color: LiturgicalColor;
  /** Comune of the libretto used for the Lodi of a saint, Our Lady or a dedication. */
  comune?: ComuneId;
}

export interface Memorial {
  name: string;
  rank: 'memoria' | 'memoria facoltativa';
  /** Comuni that can be used, the first one is the default; none when the libretto has none (proper office). */
  comuni: ComuneId[];
  color: 'bianco' | 'rosso';
}

/** A memorial that can be celebrated today. */
export interface DayMemorial extends Memorial {
  /**
   * In Lent and from 17 to 24 December memorials are only commemorated: the
   * weekday office is said, the memorial can be recalled.
   */
  commemoration: boolean;
}

export interface SaintOfDay {
  name: string;
  /** the rank it has in the calendar, or what the calendar makes of it today */
  kind: 'festa' | 'solennità' | 'memoria' | 'memoria facoltativa' | 'commemorazione';
  /** set when it is not celebrated today: why (or where it is moved to) */
  notCelebrated?: string;
}

/** The saint(s) of the day as the home page shows them. */
export interface SaintsResult {
  saints: SaintOfDay[];
  /** shown when there is no saint at all */
  note: string | null;
}

export interface LiturgicalDay {
  date: CivilDate;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  season: Season;
  /** Week within the season (see TemporalDay.seasonWeek). */
  seasonWeek: number;
  /** Week of the four-week psalter used for Lodi on this day (1-4). */
  psalterWeek: 1 | 2 | 3 | 4;
  /** Solemnity or feast celebrated today, if any. */
  celebration: Celebration | null;
  /** Memorials of the day (none on Sundays, solemnities, feasts, octaves, Holy Week). */
  memorials: DayMemorial[];
  /** Easter octave or Christmas octave: the whole office is proper. */
  inOctave: 'pasqua' | 'natale' | null;
  /** Lodi uses the paschal (alleluia) form of the antiphons. */
  paschal: boolean;
  color: LiturgicalColor;
  /** Human-readable Italian description, e.g. "Sabato della XXVI settimana del Tempo Ordinario". */
  label: string;
  holyThursday: boolean;
  /** Marian antiphon after Compieta. */
  marian: 'alma' | 'ave' | 'regina' | 'salve';
  /** The solemnity of tomorrow, whose I Vespers are this evening. */
  tomorrowSolemnity: string | null;
  /** What the home page says about the saints of the day. */
  saints: SaintsResult;
}

/** A day as written in the year file (calendarium/<place>/<year>.json): the date is the key. */
export type DayRecord = Omit<LiturgicalDay, 'date'>;

/** calendarium/index.json */
export interface CalendarIndex {
  /** the place the site shows */
  default: string;
  years: number[];
  places: Record<string, { name: string }>;
}

/** Saturdays of Ordinary Time without an obligatory memorial. */
export const SATURDAY_OF_MARY: Memorial = { name: 'Memoria di Santa Maria in sabato', rank: 'memoria facoltativa', comuni: ['bvm'], color: 'bianco' };

// --- the merged calendar (compone.ts) -----------------------------------------------

export type EntryRank = 'solemnity' | 'feast' | 'memorial' | 'optional-memorial';
export type EntryColor = 'white' | 'red' | 'violet' | 'green' | 'rose';

/** A celebration of the merged calendar. */
export interface Entry {
  id: string;
  /** "MM-DD", a movable date ("pentecost+1", "easter-2"…) or a Sunday of a month ("10-sun3-1": the Saturday before the third Sunday of October) */
  date: string;
  name: string;
  rank: EntryRank;
  color: EntryColor;
  comuni: ComuneId[];
  /** Feasts of the Lord replace the Sundays of Ordinary Time and of Christmas. */
  ofTheLord: boolean;
  /** Place in the table of precedence, when it is not the one given by rank and layer (Christmas: 2). */
  precedence?: number;
  /** Where an impeded solemnity goes: the next free day (default), the previous one, or the previous one only in Holy Week. */
  transfer: 'after' | 'before' | 'before-holy-week';
  /** Index of the layer that added it (0 = generale): the local ones come first among the memorials. */
  layer: number;
  /** Index of the layer that gave it its rank: proper solemnities and feasts come after the general ones. */
  rankLayer: number;
}

export interface MergedCalendar {
  name: string;
  settings: Settings;
  entries: Entry[];
}

const COLOR: Record<EntryColor, LiturgicalColor> = { white: 'bianco', red: 'rosso', violet: 'viola', green: 'verde', rose: 'rosaceo' };
const RANK: Record<EntryRank, Rank | Memorial['rank']> = {
  solemnity: 'solennità', feast: 'festa', memorial: 'memoria', 'optional-memorial': 'memoria facoltativa',
};

/** Table of liturgical days (General Norms n. 59): 1 is the highest. */
function precedenceOf(e: Entry): number {
  if (e.precedence) return e.precedence;
  const general = e.rankLayer === 0;
  switch (e.rank) {
    case 'solemnity': return general ? 3 : 4;
    case 'feast': return e.ofTheLord ? 5 : general ? 7 : 8;
    case 'memorial': return general ? 10 : 11;
    case 'optional-memorial': return 12;
  }
}

const ANCHOR_DATE = /^([a-zA-Z]+)([+-]\d+)?$/;
/** "10-sun3-1": the day before the third Sunday of October. */
const NTH_SUNDAY_DATE = /^(\d\d)-sun([1-5])([+-]\d+)?$/;

/** The day number of an entry in a year, or null if the date does not exist that year (29 February). */
export function entryDay(date: string, year: number, settings: Settings): number | null {
  const fixed = /^(\d\d)-(\d\d)$/.exec(date);
  if (fixed) {
    const n = dayNum(year, +fixed[1], +fixed[2]);
    return fromDayNumber(n).month === +fixed[1] ? n : null;
  }
  const nth = NTH_SUNDAY_DATE.exec(date);
  if (nth) {
    const first = dayNum(year, +nth[1], 1);
    const sunday = first + ((7 - weekdayOf(first)) % 7) + 7 * (+nth[2] - 1);
    if (fromDayNumber(sunday).month !== +nth[1]) return null; // no fifth Sunday this month
    return sunday + (nth[3] ? +nth[3] : 0);
  }
  const m = ANCHOR_DATE.exec(date);
  if (!m) throw new Error(`data non valida: ${date}`);
  const mv = movableDates(year, settings);
  if (!(m[1] in mv)) throw new Error(`data mobile sconosciuta: ${date}`);
  return mv[m[1] as Anchor] + (m[2] ? +m[2] : 0);
}

/** "pentecost+1": movable memorials come before the fixed ones of the same day. */
const isMovable = (e: Entry) => !/^\d\d-\d\d$/.test(e.date);

const toCelebration = (e: Entry): Celebration => ({
  name: e.name, rank: RANK[e.rank] as Rank, color: COLOR[e.color], ...(e.comuni.length ? { comune: e.comuni[0] } : {}),
});

const toMemorial = (e: Entry): Memorial => ({
  name: e.name, rank: RANK[e.rank] as Memorial['rank'], comuni: e.comuni, color: COLOR[e.color] as Memorial['color'],
});

// --- solemnities and feasts: placing them, transferring the impeded solemnities ----------

interface Placement {
  entry: Entry;
  /** where its date falls */
  nominal: number;
  /** where it is celebrated, null if not at all */
  at: number | null;
}

interface Window {
  temporal: Map<number, TemporalDay>;
  /** day → the solemnity or feast of the layers celebrated on it */
  placed: Map<number, Placement>;
  /** day → the solemnities and feasts whose date falls on it */
  byNominal: Map<number, Placement[]>;
}

const precedenceOfDay = (t: TemporalDay) => Math.min(t.precedence, t.celebration?.precedence ?? 99);

/** Places the solemnities and feasts of the years `from`-`to`, most important first. */
function placeCelebrations(cal: MergedCalendar, from: number, to: number): Window {
  const temporal = new Map<number, TemporalDay>();
  const first = dayNum(from, 1, 1) - 7;
  const last = dayNum(to, 12, 31) + 60;
  const t = (n: number) => {
    let d = temporal.get(n);
    if (!d) { d = temporalDay(fromDayNumber(n), cal.settings); temporal.set(n, d); }
    return d;
  };
  for (let n = first; n <= last; n++) t(n);

  const candidates: Placement[] = [];
  for (let year = from; year <= to; year++) {
    for (const entry of cal.entries) {
      if (entry.rank !== 'solemnity' && entry.rank !== 'feast') continue;
      const nominal = entryDay(entry.date, year, cal.settings);
      if (nominal !== null) candidates.push({ entry, nominal, at: null });
    }
  }
  candidates.sort((a, b) => precedenceOf(a.entry) - precedenceOf(b.entry) || a.nominal - b.nominal);

  const placed = new Map<number, Placement>();
  const byNominal = new Map<number, Placement[]>();
  const free = (n: number) => !placed.has(n) && !t(n).celebration && t(n).precedence >= 9;

  for (const c of candidates) {
    byNominal.set(c.nominal, [...(byNominal.get(c.nominal) ?? []), c]);
    const n = c.nominal;
    if (!placed.has(n) && precedenceOf(c.entry) < precedenceOfDay(t(n))) {
      c.at = n;
    } else if (c.entry.rank === 'solemnity') {
      // an impeded solemnity is transferred to the nearest free day (General Norms n. 60)
      const back = c.entry.transfer === 'before' || (c.entry.transfer === 'before-holy-week' && t(n).holyWeek);
      let m = n + (back ? -1 : 1);
      while (!free(m)) m += back ? -1 : 1;
      c.at = m;
    }
    if (c.at !== null) placed.set(c.at, c);
  }
  return { temporal, placed, byNominal };
}

// --- one day -------------------------------------------------------------------------

/** Whether memorials can be kept on a day: not on Sundays, in the octaves, on Ash Wednesday, in Holy Week or in the Triduum. */
const memorialsAllowed = (t: TemporalDay) =>
  t.weekday !== 0 && t.season !== 'triduo' && t.inOctave === null && !t.ashWednesday && !t.holyWeek;

/** In Lent and in late Advent the memorials are only commemorated. */
const onlyCommemorated = (t: TemporalDay) => t.season === 'quaresima' || (t.date.month === 12 && t.date.day >= 17 && t.date.day <= 24);

/** The memorials whose date falls on day `n`, local ones first, movable before fixed. */
function memorialsOn(cal: MergedCalendar, n: number): Entry[] {
  const { year } = fromDayNumber(n);
  return cal.entries
    .filter((e) => (e.rank === 'memorial' || e.rank === 'optional-memorial') && entryDay(e.date, year, cal.settings) === n)
    .sort((a, b) => b.layer - a.layer || Number(isMovable(b)) - Number(isMovable(a)));
}

const displayName = (name: string) => name.replace(/^Memoria di /, '');

function dayOf(cal: MergedCalendar, w: Window, n: number): Omit<LiturgicalDay, 'tomorrowSolemnity'> {
  const t = w.temporal.get(n)!;
  const placement = w.placed.get(n);
  // a celebration of the layers is placed only where it outranks the day (temporal celebration included)
  const celebration: Celebration | null = placement ? toCelebration(placement.entry)
    : t.celebration ? { name: t.celebration.name, rank: t.celebration.rank, color: t.celebration.color } : null;

  // memorials
  let memorials: DayMemorial[] = [];
  if (!celebration && memorialsAllowed(t)) {
    const commemoration = onlyCommemorated(t);
    const list = memorialsOn(cal, n).map(toMemorial);
    // an obligatory memorial excludes the optional ones of the same day
    const obligatory = list.filter((m) => m.rank === 'memoria');
    const result = obligatory.length ? obligatory : list;
    if (t.weekday === 6 && t.season === 'ordinario' && obligatory.length === 0) result.push(SATURDAY_OF_MARY);
    memorials = result.map((m) => ({ ...m, commemoration }));
  }

  let color = celebration ? celebration.color : t.color;
  // an obligatory memorial outside the privileged days gives its colour to the day
  const main = memorials.find((m) => m.rank === 'memoria' && !m.commemoration);
  if (main && !celebration) color = main.color;

  return {
    date: t.date,
    weekday: t.weekday,
    season: t.season,
    seasonWeek: t.seasonWeek,
    psalterWeek: t.psalterWeek,
    celebration,
    memorials,
    inOctave: t.inOctave,
    paschal: t.season === 'pasqua',
    color,
    label: t.label,
    holyThursday: t.holyThursday,
    marian: t.marian,
    saints: saintsOf(cal, w, n, celebration, memorials),
  };
}

/**
 * The saint(s) of the day for the home page: the memorials, or a feast or
 * memorial of this date that is not celebrated this year (and why), or that
 * the day is a feria.
 */
function saintsOf(cal: MergedCalendar, w: Window, n: number, celebration: Celebration | null, memorials: DayMemorial[]): SaintsResult {
  // a solemnity or feast celebrated today is already the title of the day
  if (celebration) return { saints: [], note: null };
  const t = w.temporal.get(n)!;

  const why = t.weekday === 0 ? 'quest’anno cade di domenica: prevale la domenica'
    : t.ashWednesday ? 'quest’anno coincide con il Mercoledì delle Ceneri e non si celebra'
    : t.inOctave === 'natale' ? 'quest’anno cade nell’Ottava di Natale e non si celebra'
    : 'quest’anno cade nella Settimana Santa o nell’Ottava di Pasqua e non si celebra';

  // a solemnity or feast of this date, displaced by the season or moved
  const displaced = (w.byNominal.get(n) ?? []).find((p) => p.at !== n);
  if (displaced) {
    return {
      saints: [{
        name: displaced.entry.name,
        kind: RANK[displaced.entry.rank] as Rank,
        notCelebrated: displaced.at !== null ? `quest’anno si celebra ${formatCivilDate(fromDayNumber(displaced.at))}` : why,
      }],
      note: null,
    };
  }

  if (memorials.length) {
    return {
      saints: memorials.map((m): SaintOfDay => ({ name: displayName(m.name), kind: m.commemoration ? 'commemorazione' : m.rank })),
      note: null,
    };
  }

  // memorials of this date that the day does not allow (Sunday, Holy Week…)
  const impeded = memorialsOn(cal, n);
  if (impeded.length) {
    return {
      saints: impeded.map((e) => ({ name: displayName(e.name), kind: RANK[e.rank] as Memorial['rank'], notCelebrated: why })),
      note: null,
    };
  }

  const quiet = t.weekday === 0 || t.season === 'triduo' || t.inOctave !== null;
  return { saints: [], note: quiet ? null : 'Oggi il calendario non ha memorie di santi: si celebra la feria.' };
}

/** Every day from `first` to `last` (inclusive). */
export function liturgicalDays(cal: MergedCalendar, first: CivilDate, last: CivilDate): LiturgicalDay[] {
  const a = toDayNumber(first);
  const b = toDayNumber(last);
  const w = placeCelebrations(cal, first.year - 1, last.year + 1);
  const days: LiturgicalDay[] = [];
  let today = dayOf(cal, w, a);
  for (let n = a; n <= b; n++) {
    const tomorrow = dayOf(cal, w, n + 1);
    days.push({ ...today, tomorrowSolemnity: tomorrow.celebration?.rank === 'solennità' ? tomorrow.celebration.name : null });
    today = tomorrow;
  }
  return days;
}

/** The days of a civil year, by ISO date. */
export function yearDays(cal: MergedCalendar, year: number): Map<string, LiturgicalDay> {
  const days = liturgicalDays(cal, { year, month: 1, day: 1 }, { year, month: 12, day: 31 });
  return new Map(days.map((d) => [toIsoDate(d.date), d]));
}
