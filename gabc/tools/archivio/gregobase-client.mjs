// Shared helpers for talking to gregobase.selapa.net: a polite cached fetch,
// and Latin-text normalization used for incipit matching.

import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://gregobase.selapa.net/';
const USER_AGENT = 'mlg-breviary-gabc-db/1.0 (research tool, personal liturgical project)';
const DELAY_MS = 300;

let lastRequestAt = 0;

async function politeDelay() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < DELAY_MS) {
    await new Promise((r) => setTimeout(r, DELAY_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

// Fetches `BASE + urlPath`, caching the raw response body at cachePath.
// Returns the cached content on subsequent calls without hitting the network.
export async function fetchWithCache(urlPath, cachePath) {
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  await politeDelay();
  const res = await fetch(BASE + urlPath, { headers: { 'User-Agent': USER_AGENT } });
  const text = await res.text();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, text);
  return text;
}

const ACCENTS = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ā: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e', ē: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i', ī: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', ō: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u', ū: 'u',
  ý: 'y', ÿ: 'y',
  æ: 'ae', œ: 'oe',
};

export function normalizeLatin(str) {
  if (!str) return '';
  let s = str.toLowerCase();
  s = s.replace(/[áàäâāéèëêēíìïîīóòöôōúùüûūýÿæœ]/g, (c) => ACCENTS[c] || c);
  s = s.replace(/<[^>]+>/g, ' '); // strip any stray HTML tags/italics markers
  s = s.replace(/[.,;:!?()"']/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
