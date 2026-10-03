// Decides, for a liturgical day, which pieces of gabc/liturgy.json make up its
// Lodi (four-week psalter) and Compieta. Pure functions over ids, so they can
// be unit-tested without loading any data.

import { addDays, liturgicalDay, movableDates, toDayNumber, WEEKDAY_NAMES, type LiturgicalDay } from './calendar';

// --- Lodi ---------------------------------------------------------------------

export interface LodiPlan {
  week: 1 | 2 | 3 | 4;
  /** Day name as used in liturgy.json ("Domenica" … "Sabato"). */
  dayName: string;
  paschal: boolean;
  /**
   * Why the psalter page is not (entirely) what is prayed today, if it isn't:
   * the site shows a notice and still offers the psalter page.
   */
  properNotice: string | null;
  /** Parts proper to the season that the site does not contain yet. */
  seasonalNotice: string | null;
  /**
   * On proper days, the psalter page whose psalms are used (Sunday of week 1
   * for solemnities, feasts and the Easter octave), offered as a fallback.
   */
  fallback: { week: 1 | 2 | 3 | 4; dayName: string } | null;
}

export function lodiPlan(day: LiturgicalDay): LodiPlan {
  let properNotice: string | null = null;
  if (day.season === 'triduo') {
    properNotice = 'Nel Triduo pasquale le Lodi sono interamente proprie e non sono ancora in questo breviario.';
  } else if (day.inOctave === 'pasqua') {
    properNotice = "Nell'Ottava di Pasqua le Lodi sono proprie (salmi della Domenica della I settimana con antifone pasquali) e non sono ancora in questo breviario.";
  } else if (day.inOctave === 'natale') {
    properNotice = "Nell'Ottava di Natale le Lodi sono proprie e non sono ancora in questo breviario.";
  } else if (day.celebration) {
    const what = day.celebration.rank === 'solennità' ? 'Oggi è solennità' : 'Oggi è festa';
    properNotice = `${what}: ${day.celebration.name}. Le Lodi sono proprie (salmi della Domenica della I settimana) e non sono ancora in questo breviario.`;
  }

  let seasonalNotice: string | null = null;
  if (!properNotice && day.season !== 'ordinario') {
    const tempo = { avvento: "d'Avvento", natale: 'di Natale', quaresima: 'di Quaresima', pasqua: 'di Pasqua', triduo: '', ordinario: '' }[day.season];
    seasonalNotice = `Nel Tempo ${tempo} alcune parti delle Lodi (inno, lettura breve, responsorio, antifona al Benedictus) sono proprie del tempo e non sono ancora in questo breviario: qui trovi quelle del salterio.`;
  }

  const sundayPsalms = day.celebration !== null || day.inOctave === 'pasqua';
  const fallback = !properNotice ? null
    : sundayPsalms ? { week: 1 as const, dayName: 'Domenica' }
    : { week: day.psalterWeek, dayName: WEEKDAY_NAMES[day.weekday] };

  return {
    week: day.psalterWeek,
    dayName: WEEKDAY_NAMES[day.weekday],
    paschal: day.paschal,
    properNotice,
    seasonalNotice,
    fallback,
  };
}

// --- Compieta -------------------------------------------------------------------

export type HymnText = 'te-lucis' | 'christe' | 'iesu';
export type MarianSeason = 'alma' | 'ave' | 'regina' | 'salve';

export interface CompietaPlan {
  /** id of the vespersBlocks entry in liturgy.json */
  blockId: string;
  /** Which hymn texts are allowed today, in order of preference. */
  hymnTexts: HymnText[];
  /** liturgy.json hymn variant id for each allowed text */
  hymnRefs: Partial<Record<HymnText, string>>;
  responsoryRef: string;
  marian: MarianSeason;
  /** testi/compieta-orazioni.json key: the block id, or "solennita". */
  orationKey: string;
  /** Lent: the opening versicle is sung without Alleluia. */
  openingWithoutAlleluia: boolean;
  notice: string | null;
}

const BLOCK_BY_WEEKDAY = ['domenica-II-vespri', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'domenica-I-vespri'];

/** Compieta ids in gabc/index.json (see PDF-INVENTORY.md). */
const C = (n: number) => `compieta.C${n}`;

const HYMNS_ORDINARY: Record<'feria' | 'memoria' | 'festa' | 'domenica' | 'solennita', Record<'te-lucis' | 'christe', string>> = {
  feria: { 'te-lucis': C(2), christe: C(7) },
  memoria: { 'te-lucis': C(3), christe: C(8) },
  festa: { 'te-lucis': C(4), christe: C(9) },
  domenica: { 'te-lucis': C(5), christe: C(10) },
  solennita: { 'te-lucis': C(6), christe: C(11) },
};

export function compietaPlan(day: LiturgicalDay): CompietaPlan {
  const n = toDayNumber(day.date);
  const mv = movableDates(day.date.year);
  const tomorrow = liturgicalDay(addDays(day.date, 1));

  // which Compieta: Sunday-type after the I or II Vespers of a Sunday or solemnity
  let blockId = BLOCK_BY_WEEKDAY[day.weekday];
  let rank: keyof typeof HYMNS_ORDINARY = day.weekday === 0 ? 'domenica' : 'feria';
  const isHolyThursday = n === mv.holyThursday;
  if (day.season === 'triduo' || isHolyThursday || day.inOctave) {
    blockId = 'domenica-II-vespri';
  } else if (day.celebration?.rank === 'solennità') {
    blockId = 'domenica-II-vespri';
    rank = 'solennita';
  } else if (tomorrow.celebration?.rank === 'solennità' && day.weekday !== 6) {
    // the solemnity begins with its I Vespers this evening
    blockId = 'domenica-I-vespri';
    rank = 'solennita';
  } else if (day.celebration?.rank === 'festa') {
    rank = 'festa';
  }

  // hymn
  let hymnRefs: CompietaPlan['hymnRefs'];
  let hymnTexts: HymnText[];
  const dec17 = day.date.month === 12 && day.date.day >= 17;
  if (day.season === 'avvento') {
    hymnTexts = [dec17 ? 'christe' : 'te-lucis'];
    hymnRefs = dec17 ? { christe: C(31) } : { 'te-lucis': C(30) };
  } else if (day.season === 'natale') {
    const beforeEpiphany = day.date.month === 12 || day.date.day < 6;
    hymnTexts = [beforeEpiphany ? 'te-lucis' : 'christe'];
    hymnRefs = beforeEpiphany ? { 'te-lucis': C(32) } : { christe: C(33) };
  } else if (day.season === 'quaresima' || day.season === 'triduo') {
    const evenWeek = day.season === 'quaresima' && (day.seasonWeek === 2 || day.seasonWeek === 4);
    hymnTexts = [evenWeek ? 'christe' : 'te-lucis'];
    hymnRefs = evenWeek ? { christe: C(35) } : { 'te-lucis': C(34) };
  } else if (day.season === 'pasqua') {
    hymnTexts = ['iesu'];
    hymnRefs = { iesu: C(36) };
  } else {
    hymnTexts = ['te-lucis', 'christe'];
    hymnRefs = HYMNS_ORDINARY[rank];
  }

  // short responsory
  let responsoryRef: string;
  if (day.season === 'triduo' || isHolyThursday) responsoryRef = C(38);
  else if (day.inOctave === 'pasqua') responsoryRef = C(39);
  else if (day.season === 'pasqua') responsoryRef = C(40);
  else if (day.season === 'avvento' || day.season === 'quaresima') responsoryRef = C(37);
  else responsoryRef = C(12);

  // Marian antiphon (libretto p. 42-45): Alma from Advent until 2 February,
  // Ave Regina from 2 February until Holy Week, Regina caeli in Eastertide,
  // Salve Regina in Ordinary Time after Pentecost.
  let marian: MarianSeason;
  const feb2 = toDayNumber({ year: day.date.year, month: 2, day: 2 });
  // the Saturday evening before Advent already belongs to Advent
  if (n >= mv.adventStart - 1 || n < feb2) marian = 'alma';
  else if (n < mv.easter) marian = 'ave';
  else if (n <= mv.pentecost) marian = 'regina';
  else marian = 'salve';

  let notice: string | null = null;
  if (day.season === 'triduo' || isHolyThursday) {
    notice = 'Nel Triduo pasquale la Compieta è quella della Domenica dopo i II Vespri, con il responsorio proprio.';
  } else if (blockId === 'domenica-I-vespri' && day.weekday !== 6) {
    notice = `Domani è solennità (${tomorrow.celebration?.name}): stasera si dice la Compieta dopo i I Vespri della Domenica.`;
  } else if (day.celebration?.rank === 'solennità' && day.weekday !== 0) {
    notice = `Oggi è solennità (${day.celebration.name}): si dice la Compieta dopo i II Vespri della Domenica.`;
  } else if (day.inOctave) {
    notice = `Nell'Ottava di ${day.inOctave === 'pasqua' ? 'Pasqua' : 'Natale'} si dice la Compieta della Domenica.`;
  }

  return {
    blockId,
    hymnTexts,
    hymnRefs,
    responsoryRef,
    marian,
    orationKey: day.celebration?.rank === 'solennità' || day.season === 'triduo' || isHolyThursday ? 'solennita' : blockId,
    openingWithoutAlleluia: day.season === 'quaresima' || day.season === 'triduo',
    notice,
  };
}

/** Marian antiphon ids per season: simple tone first, then solemn (monastic) tone. */
export const MARIAN_REFS: Record<MarianSeason, { title: string; simple: string; solemn: string }> = {
  alma: { title: 'Alma Redemptóris Mater', simple: C(41), solemn: C(51) },
  ave: { title: 'Ave, Regína cælórum', simple: C(42), solemn: C(52) },
  regina: { title: 'Regína cæli', simple: C(43), solemn: C(53) },
  salve: { title: 'Salve, Regína', simple: C(44), solemn: C(54) },
};

// --- dismissal at the end of Lodi ---------------------------------------------

export type BenedicamusKey =
  | 'solennita' | 'feste' | 'pasqua' | 'tempo-pasquale' | 'avvento-quaresima' | 'domeniche' | 'ferie';

/**
 * Which "Benedicamus Domino" melody (Lodi complete, pp. 319-321) fits the day.
 * Memorials are not tracked by the calendar, so their melodies are offered as
 * alternatives only.
 */
export function benedicamusKey(day: LiturgicalDay): BenedicamusKey {
  if (day.inOctave === 'pasqua') return 'pasqua';
  if (day.celebration?.rank === 'solennità') return 'solennita';
  if (day.celebration?.rank === 'festa') return 'feste';
  if (day.season === 'pasqua') return 'tempo-pasquale';
  if (day.season === 'avvento' || day.season === 'quaresima' || day.season === 'triduo') return 'avvento-quaresima';
  if (day.weekday === 0) return 'domeniche';
  return 'ferie';
}

/** Solemn tone of the blessing on solemnities and feasts, simple tone otherwise. */
export function solemnBlessing(day: LiturgicalDay): boolean {
  return day.celebration !== null || day.inOctave !== null;
}
