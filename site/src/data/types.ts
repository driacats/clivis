// Types mirroring the JSON files of the database: gabc/index.json,
// gabc/liturgy.json, salmi/*.json and letture/*.json.

export type Office = 'compieta' | 'lodi';

export interface IndexEntry {
  id: string;
  office: Office;
  role: string;
  printedIncipit: string | null;
  printedContext: string;
  pdfPage?: string;
  status: 'found' | 'not-found' | 'not-applicable';
  file?: string; // repo-relative, e.g. "gabc/chants/....gabc"
  notFoundReason?: string;
  notApplicableReason?: string;
  psalm?: { ref: string; title: string; file: string }; // repo-relative "salmi/....json"
}

export type SlotRef =
  | { kind: 'lettura'; file: string }
  | { kind: 'gap'; reason: 'not-applicable' | 'not-extracted'; note: string };

export interface AntiphonSlot {
  slot: '1a' | '2a' | '3a' | 'unica';
  primary: string;
  alternatives?: { tag: string; ref: string }[];
  paschalSubstitute?: string;
}

export interface VespersBlock {
  id: string;
  label: string;
  psalmAntiphons: AntiphonSlot[];
  letturaBreve: SlotRef;
}

export interface CompietaStructure {
  openingVersicle: string;
  vespersBlocks: VespersBlock[];
  hymns: { text: string; variants: { context: string; ref: string }[] }[];
  nuncDimittis: { canticleRef: string; antiphonRef: string };
  congedo: string;
  marianAntiphons: {
    tonoSemplice: string[];
    tonoSempliceSolenne: string[];
    tonoSolenneMonastico: string[];
    adLibitum: string[];
  };
}

export interface LodiDay {
  day: string;
  hymn: string;
  psalmAntiphons: AntiphonSlot[];
  responsory: string;
  benedictusAntiphon: string | Extract<SlotRef, { kind: 'gap' }>;
  letturaBreve: SlotRef;
}

/** Proprio del Tempo of the libretto (pp. 177 ff.): hymn and short responsory of a season. */
export interface LodiSeasonProper {
  id: string;
  label: string;
  pdfPage: string;
  hymn: string;
  responsory: { domeniche: string; ferie: string };
}

export interface LiturgyData {
  compieta: CompietaStructure;
  lodi: { weeks: { week: number; days: LodiDay[] }[]; proprioTempo: LodiSeasonProper[] };
}

export interface PsalmDoc {
  ref: string;
  title: string;
  epigraph: string | null;
  verses: { it: string; la: string | null }[];
}

export interface LetturaDoc {
  ref: string;
  it: string;
  la: string | null;
}

export interface GabcPiece {
  mode: string | null;
  body: string;
}

// --- prayer texts (testi/*.json) ---------------------------------------------

export interface Bilingual {
  it: string;
  la: string;
}

export interface LodiConclusion {
  week: number;
  day: string;
  invocazioni: { intro: string; response: string; intercessions: { petition: string; answer: string }[] };
  /** null on Sundays: "Orazione dal Proprio". */
  orazione: string | null;
}

export interface Ordinario {
  paterNoster: Bilingual & { invito: Bilingual };
  benedizione: Record<'conMinistro' | 'senzaMinistro' | 'benedicamus', Bilingual & { titolo: string }>;
}

export interface Texts {
  lodi: LodiConclusion[];
  /** keyed by vespersBlock id, plus "solennita" */
  compietaOrazioni: Record<string, Bilingual & { titolo: string }>;
  ordinario: Ordinario;
  esame: EsameCoscienza;
  /** Italian translation of the Marian antiphons, by index id. */
  marianeIt: Record<string, string>;
  /** Italian translation of the hymns and responsories of the Proprio del Tempo, by index id. */
  proprioTempoIt: Record<string, string>;
  comuni: Comune[];
}

// --- Comune dei santi (testi/comuni.json) -------------------------------------------

export type ComunePart = 'inno' | 'ant1' | 'ant2' | 'ant3' | 'lettura' | 'responsorio' | 'benedictus' | 'invocazioni' | 'orazione';

export interface ComuneVariant {
  /** Rubric of the libretto ("Per un martire", "Nel Tempo Pasquale", "oppure"…). */
  rubrica: string | null;
  /** Italian text printed in the libretto (null when only the melody is printed). */
  it: string | LodiConclusion['invocazioni'] | null;
  /** Biblical reference of the short reading. */
  rif?: string;
  /** Proper to Eastertide. */
  tp?: boolean;
  /** gabc/index.json id of the melody, once transcribed. */
  canto?: string;
  /** The libretto refers to the same part of another Comune. */
  vedi?: string;
}

export interface Comune {
  id: string;
  titolo: string;
  pagine: string;
  /** "feria": the psalmody is always the weekday's (Saturday of Our Lady). */
  salmodia?: 'feria';
  /** Comune whose orations are used. */
  orazione?: string;
  /** Parts taken from another Comune. */
  eredita?: Partial<Record<ComunePart, string>>;
  /** In Eastertide these parts come from this other Comune (martyrs). */
  tempoPasquale?: string;
  note: string[];
  parti: Partial<Record<ComunePart, ComuneVariant[]>>;
}

export interface EsameCoscienza {
  introduzione: string;
  schemi: { id: string; titolo: string; voci: { etichetta?: string; testo: string }[] }[];
  giorni: Record<string, { nota?: string; voci: { n: string; testo: string }[] }[]>;
  attoPenitenziale: {
    rubrica: string;
    confiteor: Bilingual;
    alternative: [string, string][][];
    conclusione: Bilingual & { rubrica: string };
  };
}
