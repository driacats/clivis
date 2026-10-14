// The temporal cycle: dates, movable feasts, seasons and the four-week
// psalter. This is the base of every calendar and is computed, not listed;
// the celebrations of the saints come from the layers (generale.json, …).
//
// Dates are plain calendar days (no time of day, no time zone): a `CivilDate`
// is { year, month (1-12), day }, converted to a day number for arithmetic.
//
// This module is used both by the build (compone.ts) and by the site (date
// arithmetic and names), so it has no dependencies.

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export type Season = 'avvento' | 'natale' | 'ordinario' | 'quaresima' | 'triduo' | 'pasqua';

export type LiturgicalColor = 'viola' | 'bianco' | 'verde' | 'rosso' | 'rosaceo';

export type Rank = 'solennità' | 'festa';

/** Lent and the Triduum: no Alleluia at the opening, Lenten hymns and tones. */
export const isLent = (season: Season): boolean => season === 'quaresima' || season === 'triduo';

/** 17-24 December: the last days of Advent, with their own hymns; memorials are only commemorated. */
export const isLateAdvent = (d: CivilDate): boolean => d.month === 12 && d.day >= 17 && d.day <= 24;

// --- day arithmetic ---------------------------------------------------------

export const DAY_MS = 86400000;

export function toDayNumber(d: CivilDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / DAY_MS);
}

export function fromDayNumber(n: number): CivilDate {
  const date = new Date(n * DAY_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function weekdayOf(n: number): number {
  // day 0 (1970-01-01) was a Thursday
  return (((n + 4) % 7) + 7) % 7;
}

export function dayNum(year: number, month: number, day: number): number {
  return toDayNumber({ year, month, day });
}

/** The Sunday on or before day `n`. */
function sundayOnOrBefore(n: number): number {
  return n - weekdayOf(n);
}

/** The first Sunday strictly after day `n`. */
function sundayAfter(n: number): number {
  return n + (7 - weekdayOf(n));
}

export function parseIsoDate(s: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = { year: +m[1], month: +m[2], day: +m[3] };
  const back = fromDayNumber(toDayNumber(d));
  return back.year === d.year && back.month === d.month && back.day === d.day ? d : null;
}

export function toIsoDate(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function addDays(d: CivilDate, days: number): CivilDate {
  return fromDayNumber(toDayNumber(d) + days);
}

export function todayLocal(now: Date = new Date()): CivilDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// --- names --------------------------------------------------------------------

/** Roman numerals for weeks and modes (index 1-34). */
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII',
  'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII',
  'XXXIII', 'XXXIV'];

export const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre',
  'ottobre', 'novembre', 'dicembre'];

export function formatCivilDate(d: CivilDate, withWeekday = true): string {
  const wd = WEEKDAY_NAMES[weekdayOf(toDayNumber(d))].toLowerCase();
  return `${withWeekday ? wd + ' ' : ''}${d.day} ${MONTH_NAMES[d.month - 1]} ${d.year}`;
}

// --- movable dates ------------------------------------------------------------

/** What a bishops' conference decides about the movable solemnities (italia.json: "settings"). */
export interface Settings {
  /** Epiphany on the Sunday between 2 and 8 January instead of 6 January. */
  epiphanyOnSunday: boolean;
  /** Ascension on the 7th Sunday of Easter instead of the Thursday before. */
  ascensionOnSunday: boolean;
  /** Corpus Domini on the Sunday after Trinity instead of the Thursday before. */
  corpusDominiOnSunday: boolean;
}

/** The General Roman Calendar: Epiphany on 6 January, Ascension and Corpus Domini on Thursday. */
export const DEFAULT_SETTINGS: Settings = { epiphanyOnSunday: false, ascensionOnSunday: false, corpusDominiOnSunday: false };

/** Easter Sunday (Gregorian calendar, anonymous algorithm). */
export function easter(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNum(year, month, day);
}

/** First Sunday of Advent: the fourth Sunday before Christmas. */
export function adventStart(year: number): number {
  return sundayOnOrBefore(dayNum(year, 12, 24)) - 21;
}

export interface MovableDates {
  epiphany: number;
  baptism: number;
  ashWednesday: number;
  palmSunday: number;
  holyThursday: number;
  easter: number;
  divineMercy: number;
  ascension: number;
  pentecost: number;
  trinity: number;
  corpusDomini: number;
  sacredHeart: number;
  christTheKing: number;
  adventStart: number;
  /** of the Christmas starting in this year */
  holyFamily: number;
}

/** The movable dates a layer can refer to: "pentecost+1", "sacredHeart+1"… */
export type Anchor = keyof MovableDates;

export function movableDates(year: number, settings: Settings): MovableDates {
  const e = easter(year);
  const advent = adventStart(year);
  const christmas = dayNum(year, 12, 25);
  const jan6 = dayNum(year, 1, 6);
  // Epiphany on Sunday: the Sunday from 2 to 8 January
  const epiphany = settings.epiphanyOnSunday ? sundayAfter(dayNum(year, 1, 1)) : jan6;
  // Baptism: the Sunday after Epiphany, or the Monday after it when Epiphany is moved to 7 or 8 January
  const baptism = epiphany > jan6 ? epiphany + 1 : sundayAfter(epiphany);
  // Holy Family: Sunday within the Christmas octave, or 30 December when Christmas itself is a Sunday
  const holyFamily = weekdayOf(christmas) === 0 ? dayNum(year, 12, 30) : sundayAfter(christmas);
  return {
    epiphany,
    baptism,
    ashWednesday: e - 46,
    palmSunday: e - 7,
    holyThursday: e - 3,
    easter: e,
    divineMercy: e + 7,
    ascension: settings.ascensionOnSunday ? e + 42 : e + 39,
    pentecost: e + 49,
    trinity: e + 56,
    corpusDomini: settings.corpusDominiOnSunday ? e + 63 : e + 60,
    sacredHeart: e + 68,
    christTheKing: advent - 7,
    adventStart: advent,
    holyFamily,
  };
}

// --- the temporal day ---------------------------------------------------------

/** A celebration of the temporal cycle (Easter, Trinity, Holy Family…). */
export interface TemporalCelebration {
  name: string;
  rank: Rank;
  color: LiturgicalColor;
  /** place in the table of precedence (General Norms n. 59: 1 is the highest) */
  precedence: number;
}

export interface TemporalDay {
  date: CivilDate;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  season: Season;
  /**
   * Week within the season: Advent 1-4, Christmas 1-3 (counting Sundays from
   * Christmas), Ordinary Time 1-34, Lent 0-6 (0 = Ash Wednesday to Saturday),
   * Easter 1-7 (1 = Easter octave).
   */
  seasonWeek: number;
  /** Week of the four-week psalter used for Lodi on this day (1-4). */
  psalterWeek: 1 | 2 | 3 | 4;
  /** Easter octave or Christmas octave: the whole office is proper. */
  inOctave: 'pasqua' | 'natale' | null;
  /** Human-readable Italian description, e.g. "Sabato della XXVI settimana del Tempo Ordinario". */
  label: string;
  /** Solemnity or feast of the temporal cycle, if any. */
  celebration: TemporalCelebration | null;
  /** Precedence of the day itself (General Norms n. 59), without the saints. */
  precedence: number;
  /** Colour of the season (before any celebration or memorial). */
  color: LiturgicalColor;
  holyThursday: boolean;
  ashWednesday: boolean;
  /** Holy Week from Palm Sunday to Holy Saturday. */
  holyWeek: boolean;
  /** Marian antiphon after Compieta (libretto pp. 42-45). */
  marian: 'alma' | 'ave' | 'regina' | 'salve';
}

function psalter(n: number): 1 | 2 | 3 | 4 {
  return ((((n - 1) % 4) + 4) % 4 + 1) as 1 | 2 | 3 | 4;
}

function weekdayPhrase(weekday: number, week: string, of: string): string {
  return weekday === 0 ? `${week} Domenica ${of}` : `${WEEKDAY_NAMES[weekday]} della ${week} settimana ${of}`;
}

/** Movable celebrations of the temporal cycle that are not ordinary Sundays/weekdays. */
function movableCelebration(n: number, mv: MovableDates): TemporalCelebration | null {
  const s = (name: string, precedence: number, color: LiturgicalColor = 'bianco'): TemporalCelebration =>
    ({ name, rank: 'solennità', color, precedence });
  const lordFeast = (name: string): TemporalCelebration => ({ name, rank: 'festa', color: 'bianco', precedence: 5 });
  switch (n) {
    case mv.epiphany: return s('Epifania del Signore', 2);
    case mv.easter: return s('Domenica di Pasqua, Risurrezione del Signore', 1);
    case mv.ascension: return s('Ascensione del Signore', 2);
    case mv.pentecost: return s('Domenica di Pentecoste', 2, 'rosso');
    case mv.trinity: return s('Santissima Trinità', 3);
    case mv.corpusDomini: return s('Santissimo Corpo e Sangue di Cristo', 3);
    case mv.sacredHeart: return s('Sacratissimo Cuore di Gesù', 3);
    case mv.christTheKing: return s("Nostro Signore Gesù Cristo Re dell'universo", 3);
    case mv.baptism: return lordFeast('Battesimo del Signore');
    case mv.holyFamily: return lordFeast('Santa Famiglia di Gesù, Maria e Giuseppe');
    default: return null;
  }
}

export function temporalDay(date: CivilDate, settings: Settings): TemporalDay {
  const n = toDayNumber(date);
  const weekday = weekdayOf(n);
  const year = date.year;
  const mv = movableDates(year, settings);
  const prev = movableDates(year - 1, settings);

  let season: Season;
  let seasonWeek: number;
  let psalterWeek: 1 | 2 | 3 | 4;
  let inOctave: TemporalDay['inOctave'] = null;
  let label: string;

  const christmasThisYear = dayNum(year, 12, 25);

  if (n >= mv.adventStart && n < christmasThisYear) {
    // Advent
    season = 'avvento';
    seasonWeek = Math.floor((n - mv.adventStart) / 7) + 1;
    psalterWeek = psalter(seasonWeek);
    label = weekdayPhrase(weekday, ROMAN[seasonWeek], 'di Avvento');
  } else if (n >= christmasThisYear || n <= mv.baptism) {
    // Christmas season (either this year's Christmas, or last year's lasting until the Baptism)
    const christmas = n >= christmasThisYear ? christmasThisYear : dayNum(year - 1, 12, 25);
    const advent = n >= christmasThisYear ? mv.adventStart : prev.adventStart;
    season = 'natale';
    seasonWeek = Math.floor((sundayOnOrBefore(n) - sundayOnOrBefore(christmas)) / 7) + 1;
    // the four-week psalter simply keeps running from the 1st Sunday of Advent
    psalterWeek = psalter(Math.floor((sundayOnOrBefore(n) - advent) / 7) + 1);
    if (n - christmas <= 7) inOctave = 'natale';
    label = inOctave ? (n === christmas ? 'Natale del Signore' : `${n - christmas + 1}° giorno dell'Ottava di Natale`)
      : `${WEEKDAY_NAMES[weekday]} del Tempo di Natale`;
  } else if (n >= mv.ashWednesday && n < mv.holyThursday) {
    // Lent (until Holy Wednesday; Holy Thursday morning is still Lent, see below)
    season = 'quaresima';
    if (n < mv.ashWednesday + 4) {
      seasonWeek = 0;
      psalterWeek = 4;
      label = n === mv.ashWednesday ? 'Mercoledì delle Ceneri' : `${WEEKDAY_NAMES[weekday]} dopo le Ceneri`;
    } else {
      seasonWeek = Math.floor((n - (mv.ashWednesday + 4)) / 7) + 1;
      psalterWeek = psalter(seasonWeek);
      if (n >= mv.palmSunday) {
        label = n === mv.palmSunday ? 'Domenica delle Palme e della Passione del Signore' : `${WEEKDAY_NAMES[weekday]} della Settimana Santa`;
      } else {
        label = weekdayPhrase(weekday, ROMAN[seasonWeek], 'di Quaresima');
      }
    }
  } else if (n >= mv.holyThursday && n < mv.easter) {
    // Holy Thursday (Lodi still of Lent, week 6 → psalter 2) and the Triduum
    season = n === mv.holyThursday ? 'quaresima' : 'triduo';
    seasonWeek = 6;
    psalterWeek = 2;
    label = n === mv.holyThursday ? 'Giovedì Santo' : n === mv.holyThursday + 1 ? 'Venerdì Santo, Passione del Signore' : 'Sabato Santo';
  } else if (n >= mv.easter && n <= mv.pentecost) {
    season = 'pasqua';
    seasonWeek = Math.floor((n - mv.easter) / 7) + 1;
    psalterWeek = psalter(seasonWeek); // octave: Sunday of week 1 is used throughout
    if (n <= mv.divineMercy) inOctave = 'pasqua';
    if (n === mv.easter) label = 'Domenica di Pasqua';
    else if (n < mv.divineMercy) label = `${WEEKDAY_NAMES[weekday]} fra l'Ottava di Pasqua`;
    else label = weekdayPhrase(weekday, ROMAN[seasonWeek], 'di Pasqua');
  } else {
    // Ordinary Time, part 1 (after the Baptism) or part 2 (after Pentecost)
    season = 'ordinario';
    if (n < mv.ashWednesday) {
      seasonWeek = Math.floor((n - mv.baptism) / 7) + 1;
    } else {
      seasonWeek = 34 - Math.floor((mv.christTheKing - sundayOnOrBefore(n)) / 7);
    }
    psalterWeek = psalter(seasonWeek);
    label = weekdayPhrase(weekday, ROMAN[seasonWeek], 'del Tempo Ordinario');
  }

  const celebration = movableCelebration(n, mv) ?? (n <= mv.baptism ? movableCelebration(n, prev) : null);

  const holyWeek = n >= mv.palmSunday && n < mv.easter;
  // Table of liturgical days (General Norms n. 59), for the day itself
  let precedence: number;
  if (season === 'triduo') precedence = 1;
  else if (holyWeek || n === mv.ashWednesday || inOctave === 'pasqua') precedence = 2;
  else if (weekday === 0) precedence = season === 'ordinario' || season === 'natale' ? 6 : 2;
  else if (isLateAdvent(date) || inOctave === 'natale' || season === 'quaresima') precedence = 9;
  else precedence = 13;

  let color: LiturgicalColor;
  if (season === 'avvento' || season === 'quaresima') color = 'viola';
  else if (season === 'triduo') color = n === mv.holyThursday + 1 ? 'rosso' : 'viola';
  else if (season === 'natale' || season === 'pasqua') color = 'bianco';
  else color = 'verde';
  if (weekday === 0 && ((season === 'avvento' && seasonWeek === 3) || (season === 'quaresima' && seasonWeek === 4))) {
    color = 'rosaceo'; // Gaudete / Laetare
  }
  if (n === mv.palmSunday) color = 'rosso';

  // Marian antiphon: Alma from Advent until 2 February, Ave Regina from
  // 2 February until Holy Week, Regina caeli in Eastertide, Salve Regina in
  // Ordinary Time after Pentecost. The Saturday evening before Advent already
  // belongs to Advent.
  const feb2 = dayNum(year, 2, 2);
  const marian = n >= mv.adventStart - 1 || n < feb2 ? 'alma' : n < mv.easter ? 'ave' : n <= mv.pentecost ? 'regina' : 'salve';

  return {
    date, weekday, season, seasonWeek, psalterWeek, inOctave, label, celebration, precedence, color,
    holyThursday: n === mv.holyThursday, ashWednesday: n === mv.ashWednesday, holyWeek, marian,
  };
}
