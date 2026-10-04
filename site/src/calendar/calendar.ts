import { fixedMemorials, IMMACULATE_HEART, MARY_MOTHER_OF_CHURCH, SATURDAY_OF_MARY, type ComuneId, type Memorial } from './santi';

// Liturgical calendar for the Roman Rite as celebrated in Italy (CEI calendar:
// Epiphany on 6 January, Ascension and Corpus Domini moved to Sunday).
//
// Scope: this module only needs to tell the site which page of the libretto to
// open on a given date (Lodi of the four-week psalter, Compieta), so it computes
//   - the liturgical season and the week within it,
//   - the psalter week (1-4),
//   - solemnities and feasts of the General Roman Calendar (plus Italy's
//     patrons), because on those days the office is proper and the psalter page
//     is NOT what is prayed.
// Memorials (santi.ts) are listed separately: on a memorial the ferial psalter is
// still used, with the other parts from the Comune of the saint.
//
// Dates are handled as plain calendar days (no time of day, no time zone): a
// `CivilDate` is { year, month (1-12), day }, converted to a day number for
// arithmetic.

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export type Season = 'avvento' | 'natale' | 'ordinario' | 'quaresima' | 'triduo' | 'pasqua';

export type LiturgicalColor = 'viola' | 'bianco' | 'verde' | 'rosso' | 'rosaceo';

export type Rank = 'solennità' | 'festa';

export interface Celebration {
  name: string;
  rank: Rank;
  color: LiturgicalColor;
  /** Comune of the libretto used for the Lodi of a saint, Our Lady or a dedication. */
  comune?: ComuneId;
}

/** A memorial that can be celebrated today. */
export interface DayMemorial extends Memorial {
  /**
   * In Lent and from 17 to 24 December memorials are only commemorated: the
   * weekday office is said, the memorial can be recalled.
   */
  commemoration: boolean;
}

export interface LiturgicalDay {
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
  /** Solemnity or feast celebrated today, if any (memorials are ignored). */
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
}

// --- day arithmetic ---------------------------------------------------------

const DAY = 86400000;

export function toDayNumber(d: CivilDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / DAY);
}

export function fromDayNumber(n: number): CivilDate {
  const date = new Date(n * DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function weekdayOf(n: number): number {
  // day 0 (1970-01-01) was a Thursday
  return (((n + 4) % 7) + 7) % 7;
}

function dayNum(year: number, month: number, day: number): number {
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

// --- movable dates ------------------------------------------------------------

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

/** Baptism of the Lord: the Sunday after 6 January (Italy keeps Epiphany on the 6th). */
export function baptismOfTheLord(year: number): number {
  return sundayAfter(dayNum(year, 1, 6));
}

export interface MovableDates {
  baptism: number;
  ashWednesday: number;
  palmSunday: number;
  holyThursday: number;
  easter: number;
  divineMercy: number;
  ascension: number; // Italy: 7th Sunday of Easter
  pentecost: number;
  trinity: number;
  corpusDomini: number; // Italy: Sunday after Trinity
  sacredHeart: number;
  christTheKing: number;
  adventStart: number;
  holyFamily: number; // of the Christmas starting in this year
}

const movableCache = new Map<number, MovableDates>();

export function movableDates(year: number): MovableDates {
  const cached = movableCache.get(year);
  if (cached) return cached;
  const e = easter(year);
  const advent = adventStart(year);
  const christmas = dayNum(year, 12, 25);
  // Holy Family: Sunday within the Christmas octave, or 30 December when
  // Christmas itself is a Sunday.
  const holyFamily = weekdayOf(christmas) === 0 ? dayNum(year, 12, 30) : sundayAfter(christmas);
  const result: MovableDates = {
    baptism: baptismOfTheLord(year),
    ashWednesday: e - 46,
    palmSunday: e - 7,
    holyThursday: e - 3,
    easter: e,
    divineMercy: e + 7,
    ascension: e + 42,
    pentecost: e + 49,
    trinity: e + 56,
    corpusDomini: e + 63,
    sacredHeart: e + 68,
    christTheKing: advent - 7,
    adventStart: advent,
    holyFamily,
  };
  movableCache.set(year, result);
  return result;
}

// --- solemnities and feasts -------------------------------------------------

interface FixedCelebration extends Celebration {
  month: number;
  day: number;
  /** Feasts of the Lord replace the Sundays of Ordinary Time and of Christmas. */
  ofTheLord?: boolean;
}

const FIXED: FixedCelebration[] = [
  { month: 1, day: 1, name: 'Maria Santissima Madre di Dio', rank: 'solennità', color: 'bianco', comune: 'bvm' },
  { month: 1, day: 6, name: 'Epifania del Signore', rank: 'solennità', color: 'bianco' },
  { month: 1, day: 25, name: 'Conversione di San Paolo apostolo', rank: 'festa', color: 'bianco', comune: 'apostoli' },
  { month: 2, day: 2, name: 'Presentazione del Signore', rank: 'festa', color: 'bianco', ofTheLord: true },
  { month: 2, day: 14, name: 'Santi Cirillo, monaco, e Metodio, vescovo, patroni d’Europa', rank: 'festa', color: 'bianco', comune: 'pastori' },
  { month: 2, day: 22, name: 'Cattedra di San Pietro apostolo', rank: 'festa', color: 'bianco', comune: 'apostoli' },
  { month: 3, day: 19, name: 'San Giuseppe, sposo della Beata Vergine Maria', rank: 'solennità', color: 'bianco', comune: 'santi' },
  { month: 3, day: 25, name: 'Annunciazione del Signore', rank: 'solennità', color: 'bianco' },
  { month: 4, day: 25, name: 'San Marco evangelista', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 4, day: 29, name: "Santa Caterina da Siena, patrona d'Italia", rank: 'festa', color: 'bianco', comune: 'vergini' },
  { month: 5, day: 3, name: 'Santi Filippo e Giacomo apostoli', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 5, day: 14, name: 'San Mattia apostolo', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 5, day: 31, name: 'Visitazione della Beata Vergine Maria', rank: 'festa', color: 'bianco', comune: 'bvm' },
  { month: 6, day: 24, name: 'Natività di San Giovanni Battista', rank: 'solennità', color: 'bianco', comune: 'santi' },
  { month: 6, day: 29, name: 'Santi Pietro e Paolo apostoli', rank: 'solennità', color: 'rosso', comune: 'apostoli' },
  { month: 7, day: 3, name: 'San Tommaso apostolo', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 7, day: 11, name: 'San Benedetto, abate, patrono d’Europa', rank: 'festa', color: 'bianco', comune: 'monaci' },
  { month: 7, day: 22, name: 'Santa Maria Maddalena', rank: 'festa', color: 'bianco', comune: 'sante' },
  { month: 7, day: 23, name: 'Santa Brigida, religiosa, patrona d’Europa', rank: 'festa', color: 'bianco', comune: 'sante' },
  { month: 7, day: 25, name: 'San Giacomo apostolo', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 8, day: 6, name: 'Trasfigurazione del Signore', rank: 'festa', color: 'bianco', ofTheLord: true },
  { month: 8, day: 9, name: 'Santa Teresa Benedetta della Croce, vergine e martire, patrona d’Europa', rank: 'festa', color: 'rosso', comune: 'un-martire' },
  { month: 8, day: 10, name: 'San Lorenzo, diacono e martire', rank: 'festa', color: 'rosso', comune: 'un-martire' },
  { month: 8, day: 15, name: 'Assunzione della Beata Vergine Maria', rank: 'solennità', color: 'bianco', comune: 'bvm' },
  { month: 8, day: 24, name: 'San Bartolomeo apostolo', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 9, day: 8, name: 'Natività della Beata Vergine Maria', rank: 'festa', color: 'bianco', comune: 'bvm' },
  { month: 9, day: 14, name: 'Esaltazione della Santa Croce', rank: 'festa', color: 'rosso', ofTheLord: true },
  { month: 9, day: 21, name: 'San Matteo apostolo ed evangelista', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 9, day: 29, name: 'Santi Michele, Gabriele e Raffaele arcangeli', rank: 'festa', color: 'bianco' },
  { month: 10, day: 4, name: "San Francesco d'Assisi, patrono d'Italia", rank: 'festa', color: 'bianco', comune: 'santi' },
  { month: 10, day: 18, name: 'San Luca evangelista', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 10, day: 28, name: 'Santi Simone e Giuda apostoli', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 11, day: 1, name: 'Tutti i Santi', rank: 'solennità', color: 'bianco', comune: 'santi' },
  { month: 11, day: 2, name: 'Commemorazione di tutti i fedeli defunti', rank: 'solennità', color: 'viola' },
  { month: 11, day: 9, name: 'Dedicazione della Basilica Lateranense', rank: 'festa', color: 'bianco', ofTheLord: true, comune: 'dedicazione' },
  { month: 11, day: 30, name: 'Sant’Andrea apostolo', rank: 'festa', color: 'rosso', comune: 'apostoli' },
  { month: 12, day: 8, name: 'Immacolata Concezione della Beata Vergine Maria', rank: 'solennità', color: 'bianco', comune: 'bvm' },
  { month: 12, day: 25, name: 'Natale del Signore', rank: 'solennità', color: 'bianco' },
  { month: 12, day: 26, name: 'Santo Stefano, primo martire', rank: 'festa', color: 'rosso', comune: 'un-martire' },
  { month: 12, day: 27, name: 'San Giovanni apostolo ed evangelista', rank: 'festa', color: 'bianco', comune: 'apostoli' },
  { month: 12, day: 28, name: 'Santi Innocenti martiri', rank: 'festa', color: 'rosso', comune: 'piu-martiri' },
];

/** Movable celebrations of the temporal cycle that are not ordinary Sundays/weekdays. */
function movableCelebration(n: number, mv: MovableDates): Celebration | null {
  const s = (name: string, color: LiturgicalColor = 'bianco'): Celebration => ({ name, rank: 'solennità', color });
  switch (n) {
    case mv.easter: return s('Domenica di Pasqua, Risurrezione del Signore');
    case mv.ascension: return s('Ascensione del Signore');
    case mv.pentecost: return s('Domenica di Pentecoste', 'rosso');
    case mv.trinity: return s('Santissima Trinità');
    case mv.corpusDomini: return s('Santissimo Corpo e Sangue di Cristo');
    case mv.sacredHeart: return s('Sacratissimo Cuore di Gesù');
    case mv.christTheKing: return s("Nostro Signore Gesù Cristo Re dell'universo");
    case mv.baptism: return { name: 'Battesimo del Signore', rank: 'festa', color: 'bianco' };
    case mv.holyFamily: return { name: 'Santa Famiglia di Gesù, Maria e Giuseppe', rank: 'festa', color: 'bianco' };
    default: return null;
  }
}

/**
 * Where a fixed solemnity that collides with a privileged day is moved to
 * (returns the day number it is actually celebrated on).
 */
function transferredFixedDate(c: FixedCelebration, year: number, mv: MovableDates): number {
  const n = dayNum(year, c.month, c.day);
  const isSunday = weekdayOf(n) === 0;
  const inHolyWeek = n >= mv.palmSunday && n < mv.easter;
  const inEasterOctave = n >= mv.easter && n <= mv.divineMercy;
  const inLent = n >= mv.ashWednesday && n < mv.palmSunday;

  if (c.month === 3 && c.day === 19) {
    if (inHolyWeek) return mv.palmSunday - 1; // Saturday before Palm Sunday
    if (inLent && isSunday) return n + 1;
  }
  if (c.month === 3 && c.day === 25) {
    if (inHolyWeek || inEasterOctave) return mv.divineMercy + 1; // Monday after the 2nd Sunday of Easter
    if (inLent && isSunday) return n + 1;
  }
  if (c.month === 12 && c.day === 8 && isSunday) return n + 1; // Sunday of Advent wins
  return n;
}

function fixedCelebration(n: number, mv: MovableDates, seasonIsPrivileged: boolean): Celebration | null {
  const { year } = fromDayNumber(n);
  const isSunday = weekdayOf(n) === 0;
  for (const c of FIXED) {
    if (transferredFixedDate(c, year, mv) !== n) continue;
    if (c.rank === 'solennità') {
      // Sundays of Advent, Lent and Easter take precedence over solemnities
      // (the transfers above handle the ones that can collide).
      if (isSunday && seasonIsPrivileged && !(c.month === 12 && c.day === 25)) continue;
      return c;
    }
    // feasts: displaced by any Sunday, except feasts of the Lord on Sundays of
    // Ordinary Time / Christmas; never celebrated in Holy Week / Easter octave
    if (n >= mv.palmSunday && n <= mv.divineMercy) continue;
    if (isSunday && !(c.ofTheLord && !seasonIsPrivileged)) continue;
    return c;
  }
  return null;
}

/**
 * The fixed solemnity or feast of this calendar date when it is not celebrated
 * on it (impeded by a Sunday, Ash Wednesday, Holy Week or the Easter octave, or
 * transferred), with the day it is moved to, if any.
 */
export function displacedCelebration(date: CivilDate): { name: string; rank: Rank; movedTo: CivilDate | null } | null {
  const c = FIXED.find((f) => f.month === date.month && f.day === date.day);
  if (!c) return null;
  const n = toDayNumber(date);
  if (liturgicalDay(date).celebration?.name === c.name) return null;
  const at = transferredFixedDate(c, date.year, movableDates(date.year));
  return { name: c.name, rank: c.rank, movedTo: at !== n ? fromDayNumber(at) : null };
}

// --- season computation -----------------------------------------------------

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII',
  'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII',
  'XXXIII', 'XXXIV'];

export const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre',
  'ottobre', 'novembre', 'dicembre'];

export function formatCivilDate(d: CivilDate, withWeekday = true): string {
  const wd = WEEKDAY_NAMES[weekdayOf(toDayNumber(d))].toLowerCase();
  return `${withWeekday ? wd + ' ' : ''}${d.day} ${MONTH_NAMES[d.month - 1]} ${d.year}`;
}

function psalter(n: number): 1 | 2 | 3 | 4 {
  return ((((n - 1) % 4) + 4) % 4 + 1) as 1 | 2 | 3 | 4;
}

function weekdayPhrase(weekday: number, week: string, of: string): string {
  return weekday === 0 ? `${week} Domenica ${of}` : `${WEEKDAY_NAMES[weekday]} della ${week} settimana ${of}`;
}

export function liturgicalDay(date: CivilDate): LiturgicalDay {
  const n = toDayNumber(date);
  const weekday = weekdayOf(n);
  const year = date.year;
  const mv = movableDates(year);
  const prev = movableDates(year - 1);

  let season: Season;
  let seasonWeek: number;
  let psalterWeek: 1 | 2 | 3 | 4;
  let inOctave: LiturgicalDay['inOctave'] = null;
  let label: string;

  const christmasThisYear = dayNum(year, 12, 25);

  if (n >= mv.adventStart && n < christmasThisYear) {
    // Advent
    season = 'avvento';
    seasonWeek = Math.floor((n - mv.adventStart) / 7) + 1;
    psalterWeek = psalter(seasonWeek);
    label = weekdayPhrase(weekday, ROMAN[seasonWeek], "di Avvento");
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

  const privileged = season === 'avvento' || season === 'quaresima' || season === 'pasqua' || season === 'triduo';
  const celebration = movableCelebration(n, mv) ?? (n <= mv.baptism ? movableCelebration(n, prev) : null)
    ?? fixedCelebration(n, mv, privileged);

  const paschal = season === 'pasqua';
  const memorials = celebration ? [] : memorialsOf(n, date, weekday, season, inOctave, mv);

  let color: LiturgicalColor;
  if (celebration) color = celebration.color;
  else if (season === 'avvento' || season === 'quaresima') color = 'viola';
  else if (season === 'triduo') color = n === mv.holyThursday + 1 ? 'rosso' : 'viola';
  else if (season === 'natale' || season === 'pasqua') color = 'bianco';
  else color = 'verde';
  if (weekday === 0 && !celebration && ((season === 'avvento' && seasonWeek === 3) || (season === 'quaresima' && seasonWeek === 4))) {
    color = 'rosaceo'; // Gaudete / Laetare
  }
  if (n === mv.palmSunday) color = 'rosso';
  // an obligatory memorial outside the privileged days gives its colour to the day
  const main = memorials.find((m) => m.rank === 'memoria' && !m.commemoration);
  if (main && !celebration) color = main.color;

  return { date, weekday, season, seasonWeek, psalterWeek, celebration, memorials, inOctave, paschal, color, label };
}

function memorialsOf(n: number, date: CivilDate, weekday: number, season: Season, inOctave: LiturgicalDay['inOctave'],
  mv: MovableDates): DayMemorial[] {
  if (weekday === 0 || inOctave || season === 'triduo') return [];
  // Ash Wednesday and Holy Week: no memorials at all
  if (n === mv.ashWednesday || (n >= mv.palmSunday && n < mv.easter)) return [];
  const commemoration = season === 'quaresima' || (date.month === 12 && date.day >= 17 && date.day <= 24);
  const list: Memorial[] = [...fixedMemorials(date.month, date.day)];
  if (n === mv.pentecost + 1) list.unshift(MARY_MOTHER_OF_CHURCH);
  if (n === mv.sacredHeart + 1) list.unshift(IMMACULATE_HEART);
  // an obligatory memorial excludes the optional ones of the same day
  const obligatory = list.filter((m) => m.rank === 'memoria');
  const result = obligatory.length ? obligatory : list;
  if (weekday === 6 && season === 'ordinario' && obligatory.length === 0) result.push(SATURDAY_OF_MARY);
  return result.map((m) => ({ ...m, commemoration }));
}

export function addDays(d: CivilDate, days: number): CivilDate {
  return fromDayNumber(toDayNumber(d) + days);
}

export function todayLocal(now: Date = new Date()): CivilDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
