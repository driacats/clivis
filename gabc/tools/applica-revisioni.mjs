#!/usr/bin/env node
// Applies the corrections approved on the review page (the file downloaded
// from «Revisori ed esportazione») to the chants of the repository:
//
//   node gabc/tools/applica-revisioni.mjs revisioni-2026-10-05.json
//
// Every correction replaces the whole gabc file it refers to. Then check the
// diff, commit and publish the site again.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = process.argv[2];
if (!file) {
  console.error('uso: node gabc/tools/applica-revisioni.mjs revisioni-AAAA-MM-GG.json');
  process.exit(1);
}
const { correzioni } = JSON.parse(readFileSync(file, 'utf8'));
let n = 0;
for (const c of correzioni) {
  if (!/^gabc\/chants\/[A-Za-z0-9._-]+\.gabc$/.test(c.file)) {
    console.warn(`saltato (percorso non valido): ${c.file}`);
    continue;
  }
  const path = join(repo, c.file);
  if (!existsSync(path)) {
    console.warn(`saltato (non esiste nel repository): ${c.file}`);
    continue;
  }
  if (readFileSync(path, 'utf8') === c.gabc) {
    console.log(`già applicato: ${c.file}`);
    continue;
  }
  writeFileSync(path, c.gabc);
  console.log(`aggiornato: ${c.file}`);
  n++;
}
console.log(`${n} file aggiornati.`);
