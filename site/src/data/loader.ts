import { headerField, splitFile } from 'exsurge';
import { DATA_FILES, READINGS_DIR } from './ids';
import type { GabcPiece, IndexEntry, LetturaDoc, LiturgyData, PsalmDoc, Texts } from './types';

// Data files are served next to the site (public/ links to the database
// folders), resolved against the page so the site works from any sub-path.
const url = (path: string) => new URL(path, document.baseURI).toString();

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => cache.delete(key)); // allow a retry after a network error
  }
  return p;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`impossibile caricare ${path} (${res.status})`);
  return res.text();
}

const fetchJson = async <T>(path: string): Promise<T> => JSON.parse(await fetchText(path)) as T;

/** gabc/index.json, loaded once (the review page reads it too). */
export const loadIndex = () => cached('index', () => fetchJson<IndexEntry[]>(DATA_FILES.index));

let indexById: Map<string, IndexEntry> | null = null;

let texts: Texts | null = null;

export async function loadDatabase(): Promise<LiturgyData> {
  const [index, liturgy, lodi, compietaOrazioni, ordinario, esame, marianeIt, proprioTempoIt, comuni] = await Promise.all([
    loadIndex(),
    fetchJson<LiturgyData>(DATA_FILES.liturgy),
    fetchJson<Texts['lodi']>(DATA_FILES.lodiConclusions),
    fetchJson<Texts['compietaOrazioni']>(DATA_FILES.compietaOrations),
    fetchJson<Texts['ordinario']>(DATA_FILES.ordinario),
    fetchJson<Texts['esame']>(DATA_FILES.esame),
    fetchJson<Texts['marianeIt']>(DATA_FILES.marianIt),
    fetchJson<Texts['proprioTempoIt']>(DATA_FILES.seasonProperIt),
    fetchJson<{ comuni: Texts['comuni'] }>(DATA_FILES.comuni),
  ]);
  indexById = new Map(index.map((e) => [e.id, e]));
  texts = { lodi, compietaOrazioni, ordinario, esame, marianeIt, proprioTempoIt, comuni: comuni.comuni };
  return liturgy;
}

/** Prayer texts (invocations, orations, Pater noster…). Must be called after loadDatabase(). */
export function getTexts(): Texts {
  if (!texts) throw new Error('getTexts() prima di loadDatabase()');
  return texts;
}

export function getEntry(id: string): IndexEntry | undefined {
  if (!indexById) throw new Error('getEntry() prima di loadDatabase()');
  return indexById.get(id);
}

export function fetchGabc(id: string): Promise<GabcPiece> {
  return cached(`gabc:${id}`, async () => {
    const entry = getEntry(id);
    if (!entry?.file || entry.status !== 'found') throw new Error(`nessuno spartito per ${id}`);
    // some GregoBase files carry a second header block: splitFile takes the
    // notation after the last "%%", and the mode from the first block
    const { header, body } = splitFile(await fetchText(entry.file));
    return { mode: headerField(header, 'mode') || null, body: body.trim() };
  });
}

export const fetchPsalm = (file: string) => cached(`psalm:${file}`, () => fetchJson<PsalmDoc>(file));

export const fetchLettura = (file: string) => cached(`lettura:${file}`, () => fetchJson<LetturaDoc>(READINGS_DIR + file));
