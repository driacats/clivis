// Shared types mirroring the JSON schemas in gabc/index.json, gabc/liturgy.json,
// salmi/*.json and letture/*.json. Kept intentionally loose (optional fields) since
// the underlying data is a hand-reviewed but still evolving dataset.

export type Office = 'compieta' | 'lodi';

export interface IndexEntry {
  id: string;
  office: Office;
  role: string;
  printedIncipit: string | null;
  printedContext: string;
  pdfPage?: string;
  status: 'found' | 'not-found' | 'not-applicable';
  gregobase?: { id: number; url: string };
  file?: string; // repo-relative, e.g. "gabc/chants/....gabc"
  matchNotes?: string;
  notFoundReason?: string;
  notApplicableReason?: string;
  psalm?: { ref: string; title: string; file: string }; // repo-relative, e.g. "salmi/....json"
}

export type IndexData = IndexEntry[];

export type SlotRef =
  | { kind: 'lettura'; file: string }
  | { kind: 'gap'; reason: 'not-applicable' | 'not-extracted'; note: string };

export interface AntiphonAlternative {
  tag: string;
  ref: string;
}

export interface AntiphonSlot {
  slot: '1a' | '2a' | '3a' | 'unica';
  primary: string;
  alternatives?: AntiphonAlternative[];
  paschalSubstitute?: string;
}

export interface HymnVariant {
  context: string;
  ref: string;
}

export interface HymnGroup {
  text: string;
  variants: HymnVariant[];
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
  hymns: HymnGroup[];
  responsorioBreve: { variants: HymnVariant[] };
  nuncDimittis: { canticleRef: string; antiphonRef: string };
  congedo: string;
  marianAntiphons: {
    tonoSemplice: string[];
    tonoSempliceSolenne: string[];
    tonoSolenneMonastico: string[];
    adLibitum: string[];
  };
}

export type GapRef = Extract<SlotRef, { kind: 'gap' }>;

export interface LodiDay {
  day: string;
  hymn: string;
  psalmAntiphons: AntiphonSlot[];
  responsory: string;
  benedictusAntiphon: string | GapRef; // only ever a real id or a "gap" (never "lettura")
  letturaBreve: SlotRef;
}

export interface LodiWeek {
  week: number;
  days: LodiDay[];
}

export interface LodiStructure {
  weeks: LodiWeek[];
}

export interface LiturgyData {
  compieta: CompietaStructure;
  lodi: LodiStructure;
}

export interface PsalmVerse {
  it: string;
  la: string | null;
}

export interface PsalmDoc {
  ref: string;
  title: string;
  epigraph: string | null;
  verses: PsalmVerse[];
}

export interface LetturaDoc {
  ref: string;
  it: string;
  la: string;
}

export interface GabcPiece {
  mode: string | null;
  body: string;
}
