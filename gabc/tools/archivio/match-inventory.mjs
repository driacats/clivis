// Matches gabc/inventory.json rows against the GregoBase incipit index,
// downloads the best candidate's GABC when confident, and writes/updates
// gabc/index.json. Ambiguous or unmatched rows are flagged for human review
// instead of being guessed.
//
// Usage: node match-inventory.mjs --office=compieta

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchByIncipit } from './search-gregobase.mjs';
import { getChantDetail } from './fetch-chant.mjs';
import { normalizeLatin } from './gregobase-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GABC_DIR = path.resolve(__dirname, '..', '..');
const INVENTORY_PATH = path.join(GABC_DIR, 'inventory.json');
const INDEX_PATH = path.join(GABC_DIR, 'index.json');
const CHANTS_DIR = path.join(GABC_DIR, 'chants');

const officeFilter = process.argv.find((a) => a.startsWith('--office='))?.split('=')[1] ?? null;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function parseModeNumber(modeStr) {
  if (!modeStr) return null;
  const upper = modeStr.toUpperCase();
  // try Roman numerals, longest token first to avoid "I" matching inside "VIII"
  const romanSorted = [...ROMAN].sort((a, b) => b.length - a.length);
  for (const r of romanSorted) {
    const re = new RegExp(`(^|[^A-Z])${r}([^A-Z]|$)`);
    if (re.test(upper)) return ROMAN.indexOf(r) + 1;
  }
  const digitMatch = upper.match(/\b([1-8])\b/);
  if (digitMatch) return Number(digitMatch[1]);
  return null;
}

function gregobaseModeNumber(headerMode) {
  if (!headerMode) return null;
  const m = String(headerMode).match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

// Very small keyword map from the printed booklet's Italian/Latin season
// context to substrings that might appear in a GregoBase entry's season
// parenthetical or source/version text. Best-effort narrowing only.
const SEASON_KEYWORDS = {
  avvento: ['adv'],
  natale: ['nat', 'christmas', 'epiphan'],
  epifania: ['epiphan'],
  quaresima: ['quadr', 'lent'],
  pasqua: ['pasch', 'easter', 'resurrect'],
  pentecoste: ['pentecost'],
  feste: ['fest'],
  solennit: ['solemn', 'dupl'],
  domenich: ['dom'],
  memorie: ['memor'],
  triduo: ['trid', 'passion'],
  ferie: ['feri'],
  ferial: ['feri'],
  ordinario: ['feri', 'per annum'],
};

// Editions/traditions other than the Solesmes/Vatican Roman-office mainstream
// (Dominican rite, Verona breviary, the Hartker antiphoner manuscript,
// Sandhofe/Annamitice/Graece/Cistercian/etc. transcriptions) that the
// colophon's Solesmes/LHG preference note (PDF-INVENTORY.md) means we should
// only fall back to when nothing Solesmes-tagged is available.
const NON_MAINSTREAM_VERSION = /dominican|verona|hartker|sandhofe|annamitice|graece|cistercian|toledo|still river|polish|chmerice|sinice|osb\b/i;

function preferMainstreamEdition(details, row) {
  const roleCtx = normalizeLatin(`${row.role} ${row.context}`);
  // "tono semplice" rows: GregoBase tags the Marian-antiphon simple tone as version "Simplex".
  if (roleCtx.includes('tono semplice')) {
    const simplex = details.filter((d) => normalizeLatin(d.version || '').includes('simplex'));
    if (simplex.length > 0) return simplex;
  }
  // "tono solenne monastico" rows: GregoBase tags these with season "monasticum".
  if (roleCtx.includes('solenne monastico') || roleCtx.includes('monastic')) {
    const monastic = details.filter((d) => normalizeLatin(`${d.season || ''} ${d.version || ''}`).includes('monastic'));
    if (monastic.length > 0) return monastic;
  }
  // Otherwise, prefer Solesmes-tagged editions over other rites/traditions,
  // per the colophon note (melodies follow Solesmes/LHG).
  const solesmes = details.filter((d) => normalizeLatin(d.version || '').includes('solesmes'));
  if (solesmes.length > 0) return solesmes;
  const nonMainstreamExcluded = details.filter((d) => !NON_MAINSTREAM_VERSION.test(d.version || ''));
  if (nonMainstreamExcluded.length > 0) return nonMainstreamExcluded;
  return details;
}

function seasonHints(context) {
  const c = normalizeLatin(context || '');
  const hints = [];
  for (const [key, words] of Object.entries(SEASON_KEYWORDS)) {
    if (c.includes(key)) hints.push(...words);
  }
  return hints;
}

function roleOfficePartHint(role) {
  const r = normalizeLatin(role || '');
  if (r.includes('inno')) return 'hymn';
  if (r.includes('responsorio')) return 'respons';
  if (r.includes('antifona') || r.includes('cantico')) return 'antiph';
  if (r.includes('versicolo')) return 'vers';
  if (r.includes('congedo')) return null;
  return null;
}

function slugify(text) {
  return normalizeLatin(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function loadIndex() {
  if (fs.existsSync(INDEX_PATH)) {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  return [];
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

function reuseKey(row) {
  return `${normalizeLatin(row.text)}|${row.role}|${parseModeNumber(row.mode) ?? ''}`;
}

async function matchRow(row, index) {
  const candidates = searchByIncipit(row.text, { maxResults: 60 });
  if (candidates.length === 0) {
    return {
      id: `${row.office}.${row.id}`,
      office: row.office,
      role: row.role,
      printedIncipit: row.text,
      printedContext: [row.context, row.mode].filter(Boolean).join(', '),
      pdfPage: row.page,
      status: 'not-found',
      notFoundReason: 'Nessuna voce nell\'indice GregoBase (incipit.php) corrisponde a questo incipit.',
    };
  }

  const hints = seasonHints(row.context);
  let shortlist = candidates;
  if (hints.length > 0) {
    const filtered = candidates.filter((c) => {
      const hay = normalizeLatin(`${c.season ?? ''} ${c.version ?? ''} ${c.titleRaw ?? ''}`);
      return hints.some((h) => hay.includes(h));
    });
    if (filtered.length > 0) shortlist = filtered;
  }
  // Prioritize Solesmes-tagged / mainstream-edition candidates before capping
  // network fetches, so a relevant edition isn't dropped just for appearing
  // late in GregoBase's listing order.
  shortlist = [...shortlist].sort((a, b) => {
    const score = (c) => (normalizeLatin(c.version || '').includes('solesmes') ? 0 : NON_MAINSTREAM_VERSION.test(c.version || '') ? 2 : 1);
    return score(a) - score(b);
  });
  shortlist = shortlist.slice(0, 20);

  const details = [];
  for (const cand of shortlist) {
    const detail = await getChantDetail(cand.id);
    if (!detail.exists) continue;
    details.push({
      id: cand.id,
      title: cand.title,
      season: cand.season,
      version: cand.version,
      url: `https://gregobase.selapa.net/chant.php?id=${cand.id}`,
      mode: detail.header.mode ?? null,
      officePart: detail.header['office-part'] ?? null,
      book: detail.header.book ?? null,
      gabcRaw: detail.gabcRaw,
    });
  }

  if (details.length === 0) {
    return {
      id: `${row.office}.${row.id}`,
      office: row.office,
      role: row.role,
      printedIncipit: row.text,
      printedContext: [row.context, row.mode].filter(Boolean).join(', '),
      pdfPage: row.page,
      status: 'not-found',
      notFoundReason: `Trovate ${candidates.length} voci simili nell'indice ma nessuna aveva un file GABC scaricabile (download vuoto).`,
      candidatesConsidered: shortlist.map((c) => c.id),
    };
  }

  const rowModeNum = parseModeNumber(row.mode);
  const officeHint = roleOfficePartHint(row.role);

  let filtered = details;
  if (rowModeNum != null) {
    const modeMatched = filtered.filter((d) => gregobaseModeNumber(d.mode) === rowModeNum);
    if (modeMatched.length > 0) filtered = modeMatched;
  }
  if (officeHint) {
    const officeMatched = filtered.filter((d) => normalizeLatin(d.officePart || '').includes(officeHint));
    if (officeMatched.length > 0) filtered = officeMatched;
  }
  filtered = preferMainstreamEdition(filtered, row);

  const candidateSummary = details.map(({ gabcRaw, ...rest }) => rest);

  if (filtered.length === 1) {
    const chosen = filtered[0];
    const slug = slugify(row.text);
    const filename = `${chosen.id}-${slug}.gabc`;
    const destPath = path.join(CHANTS_DIR, filename);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(CHANTS_DIR, { recursive: true });
      fs.writeFileSync(destPath, chosen.gabcRaw);
    }
    return {
      id: `${row.office}.${row.id}`,
      office: row.office,
      role: row.role,
      printedIncipit: row.text,
      printedContext: [row.context, row.mode].filter(Boolean).join(', '),
      pdfPage: row.page,
      status: 'found',
      gregobase: { id: chosen.id, url: chosen.url },
      file: `gabc/chants/${filename}`,
      matchNotes: `incipit corrispondente${rowModeNum != null ? `; modo GregoBase ${chosen.mode} coerente con "${row.mode}"` : ''}${officeHint ? `; office-part="${chosen.officePart}"` : ''}.`,
      candidatesConsidered: details.map((d) => d.id),
    };
  }

  // Ambiguous: 0 or >1 after filtering -> needs-review
  return {
    id: `${row.office}.${row.id}`,
    office: row.office,
    role: row.role,
    printedIncipit: row.text,
    printedContext: [row.context, row.mode].filter(Boolean).join(', '),
    pdfPage: row.page,
    status: 'needs-review',
    reviewReason: filtered.length === 0
      ? 'Nessun candidato coerente con il modo/ruolo indicato dal libretto; elenco completo dei candidati considerati sotto.'
      : `${filtered.length} candidati restano plausibili anche dopo il filtro per modo/ruolo.`,
    candidates: (filtered.length > 0 ? filtered : details).map(({ gabcRaw, ...rest }) => rest),
    allCandidatesConsidered: candidateSummary.map((d) => d.id),
  };
}

async function main() {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const rows = inventory.rows.filter((r) => !officeFilter || r.office === officeFilter);

  let index = loadIndex();
  const byRowId = new Map(index.map((e) => [e.id, e]));
  const resolvedByKey = new Map();
  for (const entry of index) {
    if (entry.status === 'found') {
      resolvedByKey.set(entry._reuseKey || '', entry);
    }
  }

  let found = 0, needsReview = 0, notFound = 0, reused = 0;

  for (const row of rows) {
    const fullId = `${row.office}.${row.id}`;
    const key = reuseKey(row);
    const existingFoundWithKey = index.find((e) => e.status === 'found' && e._reuseKey === key);

    let entry;
    if (row.skip || !row.text) {
      entry = {
        id: fullId,
        office: row.office,
        role: row.role,
        printedIncipit: row.text,
        printedContext: [row.context, row.mode].filter(Boolean).join(', '),
        pdfPage: row.page,
        status: 'not-applicable',
        notApplicableReason: row.verificareNote || 'Il libretto non riporta un testo reale per questo slot (verificare).',
      };
      console.log(`${fullId}: SKIP (not-applicable) - ${entry.notApplicableReason}`);
    } else if (existingFoundWithKey && existingFoundWithKey.id !== fullId) {
      entry = {
        ...existingFoundWithKey,
        id: fullId,
        role: row.role,
        printedIncipit: row.text,
        printedContext: [row.context, row.mode].filter(Boolean).join(', '),
        pdfPage: row.page,
        matchNotes: `${existingFoundWithKey.matchNotes} Riusato da ${existingFoundWithKey.id} (stesso incipit+ruolo+modo).`,
      };
      reused++;
      console.log(`${fullId}: REUSED from ${existingFoundWithKey.id} -> ${entry.file}`);
    } else {
      console.log(`${fullId}: searching "${row.text}" (${row.context || ''} ${row.mode || ''})...`);
      entry = await matchRow(row, index);
      entry._reuseKey = key;
      if (entry.status === 'found') { found++; console.log(`  -> FOUND #${entry.gregobase.id} ${entry.file}`); }
      else if (entry.status === 'needs-review') { needsReview++; console.log(`  -> NEEDS-REVIEW (${entry.candidates?.length ?? 0} candidates)`); }
      else { notFound++; console.log(`  -> NOT-FOUND: ${entry.notFoundReason}`); }
    }

    byRowId.set(fullId, entry);
    index = [...byRowId.values()];
    saveIndex(index); // save incrementally so a crash doesn't lose progress
  }

  console.log('\n=== Summary ===');
  console.log(`found: ${found}, reused: ${reused}, needs-review: ${needsReview}, not-found: ${notFound}, total rows: ${rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
