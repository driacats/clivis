// Fetches (with caching) the details of a single GregoBase chant: its raw
// GABC download (most reliable source for mode/office-part/book) and its
// chant.php HTML page (for transcriber/tags, kept for audit).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithCache } from './gregobase-client.mjs';
import { parseHeader } from './gabc-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GABC_DIR = path.resolve(__dirname, '..');
const CHANT_CACHE_DIR = path.join(GABC_DIR, 'cache', 'chant');

// Returns { id, exists, header: {...}, gabcRaw, htmlPath } for a GregoBase chant id.
// exists=false means download.php returned an empty body (invalid/missing id).
export async function getChantDetail(id) {
  const gabcCachePath = path.join(CHANT_CACHE_DIR, `${id}.gabc`);
  const htmlCachePath = path.join(CHANT_CACHE_DIR, `${id}.html`);

  const gabcRaw = await fetchWithCache(`download.php?id=${id}&format=gabc`, gabcCachePath);
  await fetchWithCache(`chant.php?id=${id}`, htmlCachePath);

  if (!gabcRaw || gabcRaw.trim().length === 0) {
    return { id, exists: false, header: {}, gabcRaw: '', htmlPath: htmlCachePath };
  }

  const sepIdx = gabcRaw.indexOf('%%');
  const headerText = sepIdx === -1 ? gabcRaw : gabcRaw.slice(0, sepIdx);
  const header = parseHeader(headerText);

  return { id, exists: true, header, gabcRaw, htmlPath: htmlCachePath, gabcCachePath };
}
