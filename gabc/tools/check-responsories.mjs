// Checks that every short responsory in index.json is written in its printed
// form — respond with an asterisk, then two verses each starting with
// "<sp>V/</sp>" — so the site can play it as it is sung, with its repeats
// (exsurge `splitResponsory`). Lists the files that are not.
//
//   node gabc/tools/check-responsories.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, INDEX, readJson } from './lib/paths.mjs';
// plain TypeScript without imports: Node runs it directly
import { parseGabcMelody, responsorySequence, splitResponsory } from '../../../exsurge/src/Exsurge.Audio.ts';

const index = readJson(INDEX);

/** Runs of notes separated by a double bar (a rest of 1.5 beats or more). */
function phrases(gabc) {
  let runs = 0;
  let inRun = false;
  for (const e of parseGabcMelody(gabc)) {
    if (e.pitch !== null) { if (!inRun) runs++; inRun = true; }
    else if (e.beats >= 1.5) inRun = false;
  }
  return runs;
}

let ok = 0;
const bad = [];
for (const entry of index) {
  if (!entry.role?.startsWith('responsorio breve') || !entry.file) continue;
  const raw = readFileSync(join(ROOT, entry.file), 'utf8');
  // as the site reads it: the body after the last "%%"
  const body = raw.slice(raw.lastIndexOf('%%') + 2).trim();
  const verses = (body.match(/<sp>V\/<\/sp>/g) ?? []).length;
  const parts = splitResponsory(body);
  const problem = !parts ? `${verses} V/ o asterisco mancante`
    // a written-out cue ("(::) In ma(f)nus.(f) (::)") would be sung twice
    : Object.entries(parts).find(([, gabc]) => phrases(gabc) > 1)?.[0];
  if (!problem && responsorySequence(body)) { ok++; continue; }
  bad.push(`${entry.id}  ${entry.file}  (${parts ? `rimando scritto in ${problem}` : problem})`);
}

console.log(`${ok} responsori in forma canonica.`);
if (bad.length) {
  console.log(`${bad.length} da sistemare:`);
  for (const b of bad) console.log('  ' + b);
  process.exitCode = 1;
}
