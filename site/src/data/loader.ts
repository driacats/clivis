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

let indexById: Map<string, IndexEntry> | null = null;

let texts: Texts | null = null;

export async function loadDatabase(): Promise<LiturgyData> {
  const [index, liturgy, lodi, compietaOrazioni, ordinario] = await Promise.all([
    cached('index', () => fetchJson<IndexEntry[]>('gabc/index.json')),
    cached('liturgy', () => fetchJson<LiturgyData>('gabc/liturgy.json')),
    cached('lodi-conclusioni', () => fetchJson<Texts['lodi']>('testi/lodi-conclusioni.json')),
    cached('compieta-orazioni', () => fetchJson<Texts['compietaOrazioni']>('testi/compieta-orazioni.json')),
    cached('ordinario', () => fetchJson<Texts['ordinario']>('testi/ordinario.json')),
  ]);
  indexById = new Map(index.map((e) => [e.id, e]));
  texts = { lodi, compietaOrazioni, ordinario };
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
    const raw = await fetchText(entry.file);
    // Some GregoBase files carry a second header block (a copy of the
    // metadata ending with another "%%" line): the notation is after the last one.
    const separators = [...raw.matchAll(/^%%\s*$/gm)];
    const first = separators[0]?.index ?? -1;
    const last = separators[separators.length - 1];
    const header = first >= 0 ? raw.slice(0, first) : '';
    const body = (last ? raw.slice(last.index! + last[0].length) : raw).trim();
    const mode = /^mode:\s*([^;\n]+)/m.exec(header)?.[1].trim() ?? null;
    return { mode, body };
  });
}

export const fetchPsalm = (file: string) => cached(`psalm:${file}`, () => fetchJson<PsalmDoc>(file));

export const fetchLettura = (file: string) => cached(`lettura:${file}`, () => fetchJson<LetturaDoc>(`letture/${file}`));
