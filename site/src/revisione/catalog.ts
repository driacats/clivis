// The chants to review: one per gabc file of gabc/index.json (a file can serve
// several places of the breviary), grouped as in the libretti.
import { ROMAN } from '../calendar/calendar';
import { chantFileName } from '../data/ids';
import { loadIndex } from '../data/loader';
import type { IndexEntry } from '../data/types';

export interface Canto {
  key: string;
  file: string;
  incipit: string;
  /** every place of the breviary that uses this file */
  usi: IndexEntry[];
  gruppo: string;
}

function gruppo(e: IndexEntry): [number, string] {
  const id = e.id;
  const ctx = e.printedContext ?? '';
  if (id.startsWith('lodi.LH')) return [10, 'Lodi · Inni del salterio'];
  if (id.startsWith('lodi.LA')) {
    const w = /settimana (\d)/.exec(ctx)?.[1];
    return [20 + Number(w ?? 0), `Lodi · Antifone dei salmi, settimana ${w ? ROMAN[Number(w)] : ''}`.trim()];
  }
  if (id.startsWith('lodi.LB')) return [30, 'Lodi · Antifone al Benedictus'];
  if (id.startsWith('lodi.LR')) return [31, 'Lodi · Responsori brevi'];
  if (id.startsWith('lodi.PT')) return [40, 'Lodi · Proprio del Tempo'];
  if (id.startsWith('lodi.CS')) {
    const name = /Comune:\s*([^,]+)/.exec(ctx)?.[1].trim() ?? 'Comune dei santi';
    return [50, `Lodi · Comune: ${name}`];
  }
  if (id.startsWith('ordinario.')) return [60, 'Introduzione, Pater noster e congedo'];
  if (id.startsWith('compieta.')) return [70, 'Compieta'];
  return [90, 'Altro'];
}

const pagina = (e: IndexEntry) => Number(/\d+/.exec(e.pdfPage ?? '')?.[0] ?? 9999);
const numero = (id: string) => Number(/(\d+)/.exec(id)?.[1] ?? 0);

export async function loadCatalog(): Promise<Canto[]> {
  const index = await loadIndex();
  const byKey = new Map<string, Canto & { ordine: number[] }>();
  for (const e of index) {
    if (!e.file || e.status !== 'found') continue;
    const key = chantFileName(e.file).replace(/\.gabc$/, '');
    const c = byKey.get(key);
    if (c) { c.usi.push(e); continue; }
    const [g, nome] = gruppo(e);
    byKey.set(key, { key, file: e.file, incipit: e.printedIncipit ?? key, usi: [e], gruppo: nome, ordine: [g, pagina(e), numero(e.id)] });
  }
  const list = [...byKey.values()];
  list.sort((a, b) => a.ordine[0] - b.ordine[0] || a.gruppo.localeCompare(b.gruppo) || a.ordine[1] - b.ordine[1] || a.ordine[2] - b.ordine[2]);
  return list.map(({ ordine: _o, ...c }) => c);
}

/** One place of the breviary that uses a chant: "inno · Lunedì della I settimana · p. 8". */
export const uso = (e: IndexEntry): string => [e.role, e.printedContext, e.pdfPage].filter(Boolean).join(' · ');

/** The first place that uses the chant. */
export const descrizione = (c: Canto): string => uso(c.usi[0]);

/** Link to the review of a chant. */
export const cantoHref = (key: string): string => `#/canto/${encodeURIComponent(key)}`;
