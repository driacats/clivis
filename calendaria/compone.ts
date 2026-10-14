// Builds the calendars of the site: for every place in loca.json, merges its
// layers (strata.ts) and writes the liturgical days of the year (dies.ts):
//
//   calendarium/index.json            places, default place, years
//   calendarium/<place>/<year>.json   the days, by ISO date
//
// Run by the build of the site (site/vite.config.ts, also in `npm run dev`),
// or by hand from site/:
//   npx vite-node ../calendaria/compone.ts -- <output folder> [year]
// The year is the current one, or the ANNUS environment variable.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { yearDays, type CalendarIndex, type DayRecord, type MergedCalendar } from './dies';
import { mergeLayers, type Layer, type Places } from './strata';

const HERE = dirname(fileURLToPath(import.meta.url));
/** testi/comuni.json: the Comuni a celebration can refer to. */
const COMUNI_FILE = join(HERE, '..', 'testi', 'comuni.json');

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf-8')) as T;

export function readPlaces(dir = HERE): Places {
  return readJson<Places>(join(dir, 'loca.json'));
}

/** The calendar of a chain of layers, read from calendaria/. */
export function readCalendar(layerNames: string[], dir = HERE): MergedCalendar {
  const comuni = new Set(readJson<{ comuni: { id: string }[] }>(COMUNI_FILE).comuni.map((c) => c.id));
  return mergeLayers(layerNames.map((n) => ({ file: `${n}.json`, data: readJson<Layer>(join(dir, `${n}.json`)) })), comuni);
}

export function currentYear(): number {
  return process.env.ANNUS ? Number(process.env.ANNUS) : new Date().getFullYear();
}

/** All the files of calendarium/, by path. */
export function composeSite(year = currentYear(), dir = HERE): Map<string, string> {
  const places = readPlaces(dir);
  if (!places.places[places.default]) throw new Error(`calendaria/loca.json: il luogo predefinito «${places.default}» non è tra i "places"`);
  const files = new Map<string, string>();
  const index: CalendarIndex = { default: places.default, years: [year], places: {} };
  for (const [id, place] of Object.entries(places.places)) {
    const cal = readCalendar(place.layers, dir);
    const days: Record<string, DayRecord> = {};
    for (const [iso, { date: _date, ...rest }] of yearDays(cal, year)) days[iso] = rest;
    files.set(`${id}/${year}.json`, JSON.stringify({ place: id, name: place.name, year, days }));
    index.places[id] = { name: place.name };
  }
  files.set('index.json', JSON.stringify(index));
  return files;
}

// by hand: vite-node ../calendaria/compone.ts -- <output folder> [year]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const out = args[0] ?? 'calendarium';
  const files = composeSite(args[1] ? Number(args[1]) : currentYear());
  for (const [path, content] of files) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  console.log(`calendarium: ${files.size} file in ${out}`);
}
