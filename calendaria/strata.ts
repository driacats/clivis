// Merging the layers of a calendar (generale.json, europa.json, italia.json,
// genua.json…) into one list of celebrations, with the checks that stop the
// build on a mistake. Pure functions: compone.ts reads the files, the tests
// import them directly.
//
// A layer is a JSON file:
//   { "name": "…", "source": "…", "settings": { … }, "celebrations": [ … ] }
// Each celebration has an "id". A new id needs date, name, rank, color and
// comuni; an id of a lower layer changes only the fields given (a new rank,
// name or date), and { "id": "…", "remove": true } removes it.
//
// Fields of a celebration:
//   id          stable identifier, used by the upper layers
//   date        "MM-DD"; a movable date: "pentecost+1", "easter-2"… (tempus.ts: MovableDates);
//               or the n-th Sunday of a month: "10-sun3" (third Sunday of October), "10-sun3-1" (the Saturday before)
//   name        as the reader sees it
//   rank        solemnity | feast | memorial | optional-memorial
//   color       white | red | violet | green | rose
//   comuni      Comuni of the libretto for the Lodi (testi/comuni.json), the first is the default; [] if none
//   ofTheLord   feast of the Lord: it replaces the Sundays of Ordinary Time and of Christmas
//   precedence  place in the table of precedence when it is not the usual one (Christmas: 2)
//   transfer    where the solemnity goes when impeded: after (default), before, before-holy-week

import { entryDay, type ComuneId, type Entry, type EntryColor, type EntryRank, type MergedCalendar } from './dies';
import { DEFAULT_SETTINGS, type Settings } from './tempus';

export interface Layer {
  name: string;
  source?: string;
  settings?: Partial<Settings>;
  celebrations: Record<string, unknown>[];
}

/** loca.json: the places to build, each with its chain of layers. */
export interface Places {
  /** the place the site shows */
  default: string;
  places: Record<string, { name: string; layers: string[] }>;
}

const RANKS: EntryRank[] = ['solemnity', 'feast', 'memorial', 'optional-memorial'];
const COLORS: EntryColor[] = ['white', 'red', 'violet', 'green', 'rose'];
const TRANSFERS = ['after', 'before', 'before-holy-week'];
const FIELDS = new Set(['id', 'date', 'name', 'rank', 'color', 'comuni', 'ofTheLord', 'precedence', 'transfer', 'remove']);

/**
 * Merges the layers in order (`file` is only for the error messages);
 * `comuni` are the ids of testi/comuni.json. Throws with a readable message
 * on any mistake.
 */
export function mergeLayers(layers: { file: string; data: Layer }[], comuni: Set<string>): MergedCalendar {
  const byId = new Map<string, Entry>();
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let name = '';

  layers.forEach(({ file, data }, layer) => {
    const fail = (id: unknown, msg: string): never => { throw new Error(`calendaria/${file}, «${String(id)}»: ${msg}`); };
    name = data.name;
    settings = { ...settings, ...data.settings };
    const seen = new Set<string>();

    for (const raw of data.celebrations) {
      const id = raw.id;
      if (typeof id !== 'string' || !id) fail(id, 'manca "id"');
      const key = id as string;
      if (seen.has(key)) fail(id, 'id ripetuto nello stesso file');
      seen.add(key);
      for (const k of Object.keys(raw)) if (!FIELDS.has(k)) fail(id, `campo sconosciuto "${k}"`);

      if (raw.remove === true) {
        if (!byId.delete(key)) fail(id, 'da togliere, ma nessuno strato precedente lo contiene');
        continue;
      }
      if (raw.rank !== undefined && !RANKS.includes(raw.rank as EntryRank)) fail(id, `"rank" deve essere uno di ${RANKS.join(', ')}`);
      if (raw.color !== undefined && !COLORS.includes(raw.color as EntryColor)) fail(id, `"color" deve essere uno di ${COLORS.join(', ')}`);
      if (raw.transfer !== undefined && !TRANSFERS.includes(raw.transfer as string)) fail(id, `"transfer" deve essere uno di ${TRANSFERS.join(', ')}`);
      if (raw.comuni !== undefined) {
        if (!Array.isArray(raw.comuni)) fail(id, '"comuni" deve essere un elenco');
        for (const c of raw.comuni as unknown[]) if (typeof c !== 'string' || !comuni.has(c)) fail(id, `Comune sconosciuto "${String(c)}" (vedi testi/comuni.json)`);
      }
      if (raw.date !== undefined) {
        try { entryDay(String(raw.date), 2000, settings); } catch (e) { fail(id, (e as Error).message); }
      }

      const old = byId.get(key);
      if (!old) {
        for (const k of ['date', 'name', 'rank', 'color', 'comuni']) if (raw[k] === undefined) fail(id, `celebrazione nuova: manca "${k}"`);
      }
      const entry: Entry = {
        id: key,
        date: (raw.date as string) ?? old!.date,
        name: (raw.name as string) ?? old!.name,
        rank: (raw.rank as EntryRank) ?? old!.rank,
        color: (raw.color as EntryColor) ?? old!.color,
        comuni: (raw.comuni as ComuneId[]) ?? old!.comuni,
        ofTheLord: (raw.ofTheLord as boolean) ?? old?.ofTheLord ?? false,
        precedence: (raw.precedence as number) ?? old?.precedence,
        transfer: (raw.transfer as Entry['transfer']) ?? old?.transfer ?? 'after',
        layer: old ? old.layer : layer,
        rankLayer: raw.rank !== undefined || !old ? layer : old.rankLayer,
      };
      if ((entry.rank === 'memorial' || entry.rank === 'optional-memorial') && entry.color !== 'white' && entry.color !== 'red') {
        fail(id, 'una memoria è bianca o rossa');
      }
      byId.set(key, entry);
    }
  });

  const entries = [...byId.values()];
  checkCollisions(entries);
  return { name, settings, entries };
}

/** Two solemnities or feasts on the same date would leave one of them out silently. */
function checkCollisions(entries: Entry[]): void {
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) {
    if ((e.rank === 'solemnity' || e.rank === 'feast') && /^\d\d-\d\d$/.test(e.date)) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }
  for (const [date, list] of byDate) {
    if (list.length > 1) throw new Error(`calendaria: più solennità o feste il ${date}: ${list.map((e) => e.id).join(', ')}`);
  }
}
