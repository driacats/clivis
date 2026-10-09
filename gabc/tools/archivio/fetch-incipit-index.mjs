// Downloads (with caching) the GregoBase incipit-index pages for every letter
// needed by gabc/inventory.json, and parses them into one combined
// gabc/cache/incipit-index.json lookup table.
//
// Usage: node fetch-incipit-index.mjs [--office=compieta]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithCache, normalizeLatin } from './gregobase-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GABC_DIR = path.resolve(__dirname, '..', '..');
const INVENTORY_PATH = path.join(GABC_DIR, 'inventory.json');
const INCIPIT_CACHE_DIR = path.join(GABC_DIR, 'cache', 'incipit');
const COMBINED_INDEX_PATH = path.join(GABC_DIR, 'cache', 'incipit-index.json');

const officeFilter = process.argv.find((a) => a.startsWith('--office='))?.split('=')[1] ?? null;

function firstLetter(text) {
  const n = normalizeLatin(text);
  const m = n.match(/[a-z]/);
  return m ? m[0].toUpperCase() : null;
}

function parseLetterPage(html) {
  const entries = [];
  const re = /<li class="usage-marker\s*([a-z]*)">\s*<a href="chant\.php\?id=(\d+)">([\s\S]*?)<\/a>\s*<span class="version">\(([^)]*)\)<\/span>\s*<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, usageMarker, idStr, rawTitle, version] = m;
    const seasonMatch = rawTitle.match(/<i>\(([^)]*)\)<\/i>/);
    const plainTitle = rawTitle.replace(/<i>.*?<\/i>/, '').replace(/<[^>]+>/g, '').trim();
    entries.push({
      id: Number(idStr),
      title: plainTitle,
      titleRaw: rawTitle.trim(),
      season: seasonMatch ? seasonMatch[1] : null,
      version,
      usageMarker: usageMarker || null,
      normalizedTitle: normalizeLatin(plainTitle),
    });
  }
  return entries;
}

async function main() {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const rows = inventory.rows.filter((r) => !officeFilter || r.office === officeFilter);

  const letters = new Set();
  for (const row of rows) {
    const letter = firstLetter(row.text);
    if (letter) letters.add(letter);
  }

  console.log(`Letters needed: ${[...letters].sort().join(', ')}`);

  for (const letter of [...letters].sort()) {
    const cachePath = path.join(INCIPIT_CACHE_DIR, `${letter}.html`);
    const existed = fs.existsSync(cachePath);
    const html = await fetchWithCache(`incipit.php?letter=${letter}`, cachePath);
    console.log(`  ${letter}: ${existed ? 'cached' : 'fetched'} (${html.length} bytes)`);
  }

  // Parse ALL cached letter files (not just this run's) into the combined index,
  // so the index stays complete even as later passes (Lodi) add more letters.
  let combined = [];
  if (fs.existsSync(COMBINED_INDEX_PATH)) {
    // start fresh each time from cache/*.html to avoid stale duplicate entries
  }
  const cachedFiles = fs.existsSync(INCIPIT_CACHE_DIR) ? fs.readdirSync(INCIPIT_CACHE_DIR) : [];
  for (const file of cachedFiles) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(INCIPIT_CACHE_DIR, file), 'utf8');
    combined = combined.concat(parseLetterPage(html));
  }

  fs.writeFileSync(COMBINED_INDEX_PATH, JSON.stringify(combined, null, 2));
  console.log(`Combined index: ${combined.length} entries -> ${COMBINED_INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
