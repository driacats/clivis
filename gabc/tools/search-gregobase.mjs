// Searches the cached gabc/cache/incipit-index.json for candidates matching a
// printed incipit. Prefix/substring match on normalized text.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLatin } from './gregobase-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.resolve(__dirname, '..', 'cache', 'incipit-index.json');

let cachedIndex = null;
function loadIndex() {
  if (!cachedIndex) {
    cachedIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  return cachedIndex;
}

// Returns candidate entries whose normalized title starts with (or very
// closely matches the start of) the normalized query text.
export function searchByIncipit(text, { maxResults = 40 } = {}) {
  const index = loadIndex();
  const q = normalizeLatin(text);
  if (!q) return [];

  const exact = [];
  const prefix = [];
  const substring = [];

  for (const entry of index) {
    const t = entry.normalizedTitle;
    if (t === q) exact.push(entry);
    else if (t.startsWith(q) || q.startsWith(t)) prefix.push(entry);
    else if (t.includes(q)) substring.push(entry);
  }

  const results = [...exact, ...prefix, ...substring];
  // de-dup by id (an entry could theoretically match more than one bucket)
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    deduped.push(r);
  }
  return deduped.slice(0, maxResults);
}
