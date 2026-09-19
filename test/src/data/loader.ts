import type { GabcPiece, IndexData, IndexEntry, LetturaDoc, LiturgyData, PsalmDoc } from './types';

let indexPromise: Promise<IndexData> | null = null;
let liturgyPromise: Promise<LiturgyData> | null = null;
let indexById: Map<string, IndexEntry> | null = null;

const gabcCache = new Map<string, Promise<GabcPiece>>();
const psalmCache = new Map<string, Promise<PsalmDoc>>();
const letturaCache = new Map<string, Promise<LetturaDoc>>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export function loadIndex(): Promise<IndexData> {
  if (!indexPromise) {
    indexPromise = fetchJson<IndexData>('/gabc/index.json').then((data) => {
      indexById = new Map(data.map((e) => [e.id, e]));
      return data;
    });
  }
  return indexPromise;
}

export function loadLiturgy(): Promise<LiturgyData> {
  if (!liturgyPromise) {
    liturgyPromise = fetchJson<LiturgyData>('/gabc/liturgy.json');
  }
  return liturgyPromise;
}

/** Looks up a gabc/index.json entry by id. Must be called after loadIndex() has resolved. */
export function getIndexEntry(id: string): IndexEntry | undefined {
  if (!indexById) {
    throw new Error('getIndexEntry called before loadIndex() resolved');
  }
  return indexById.get(id);
}

function splitGabc(raw: string): { header: string; body: string } {
  const sep = raw.indexOf('%%');
  if (sep === -1) return { header: '', body: raw.trim() };
  return { header: raw.slice(0, sep), body: raw.slice(sep + 2).trim() };
}

function extractMode(header: string): string | null {
  const m = /^mode:\s*(.+?);?\s*$/m.exec(header);
  return m ? m[1].trim() : null;
}

/**
 * exsurge's GABC parser doesn't interpret GABC's `<sp>`/`<v>` markup macros — it
 * renders them as literal text. Normalize the known ones (found across gabc/chants/*.gabc)
 * before handing the body to <chant-visual>.
 */
function sanitizeGabcBody(body: string): string {
  return body
    .replace(/<sp>'?æ<\/sp>|<sp>'ae<\/sp>/g, 'ǽ') // ǽ (LATIN SMALL LETTER AE WITH ACUTE)
    .replace(/<sp>V\/<\/sp>/g, '℣') // ℣
    .replace(/<sp>R\/<\/sp>/g, '℟') // ℟
    .replace(/<sp>([^<]*)<\/sp>/g, '$1') // any other <sp>: keep inner text, drop tags
    .replace(/<v>[^<]*<\/v>/g, ''); // <v>...</v> wraps non-lyric macros (\copyright, \greheightstar) — drop entirely
}

/** Fetches and parses the .gabc file for an index entry with status "found". */
export function fetchGabc(id: string): Promise<GabcPiece> {
  const cached = gabcCache.get(id);
  if (cached) return cached;

  const promise = (async () => {
    const entry = getIndexEntry(id);
    if (!entry || entry.status !== 'found' || !entry.file) {
      throw new Error(`fetchGabc: entry ${id} has no available .gabc file`);
    }
    const res = await fetch('/' + entry.file);
    if (!res.ok) throw new Error(`fetch /${entry.file} failed: ${res.status}`);
    const raw = await res.text();
    const { header, body } = splitGabc(raw);
    return { mode: extractMode(header), body: sanitizeGabcBody(body) };
  })();

  gabcCache.set(id, promise);
  return promise;
}

/** `file` is repo-relative (e.g. "salmi/ps-62-....json"), same convention as IndexEntry.file. */
export function fetchPsalm(file: string): Promise<PsalmDoc> {
  const cached = psalmCache.get(file);
  if (cached) return cached;
  const promise = fetchJson<PsalmDoc>('/' + file);
  psalmCache.set(file, promise);
  return promise;
}

export function fetchLettura(file: string): Promise<LetturaDoc> {
  const cached = letturaCache.get(file);
  if (cached) return cached;
  const promise = fetchJson<LetturaDoc>('/letture/' + file);
  letturaCache.set(file, promise);
  return promise;
}
