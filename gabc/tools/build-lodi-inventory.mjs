// One-off: parses the Lodi tables out of PDF-INVENTORY.md and merges them
// into gabc/inventory.json as office:"lodi" rows (LH/LR/LB/LA), leaving the
// existing compieta rows untouched. Re-run is idempotent (replaces all
// office:"lodi" rows each time).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const MD_PATH = path.join(ROOT, 'PDF-INVENTORY.md');
const INVENTORY_PATH = path.join(ROOT, 'gabc', 'inventory.json');

const md = fs.readFileSync(MD_PATH, 'utf8');

function extractSection(heading, nextHeadingPrefixes) {
  const startIdx = md.indexOf(heading);
  if (startIdx === -1) throw new Error(`heading not found: ${heading}`);
  const rest = md.slice(startIdx + heading.length);
  let endIdx = rest.length;
  for (const p of nextHeadingPrefixes) {
    const i = rest.indexOf(p);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  return rest.slice(0, endIdx);
}

function parseTableRows(section) {
  const lines = section.split('\n').filter((l) => l.trim().startsWith('|'));
  // drop header row and separator row (--- | --- | ...)
  const dataLines = lines.filter((l) => !/^\|\s*-+\s*\|/.test(l) && !/^\|\s*#\s*\|/.test(l));
  return dataLines.map((line) => {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    return cells;
  });
}

function stripBold(s) {
  return s.replace(/\*\*/g, '').trim();
}

const inniSection = extractSection('### Inni (14 testi unici', ['### Responsori brevi']);
const respSection = extractSection('### Responsori brevi', ['### Antifone al Benedictus']);
const benSection = extractSection('### Antifone al Benedictus', ['### Antifone salmiche']);
const antSection = extractSection('### Antifone salmiche', ['### Allelúia pasquale']);

const rows = [];

// --- Inni: # | Testo latino | Giorno | Dove usato | Tono | Pagina/e ---
for (const [id, text, giorno, doveUsato, tono, pagina] of parseTableRows(inniSection)) {
  if (!id.startsWith('LH')) continue;
  rows.push({
    id,
    office: 'lodi',
    role: 'inno',
    text: stripBold(text),
    context: `${giorno}, ${doveUsato}`,
    mode: tono || null,
    page: pagina,
    verificare: false,
  });
}

// --- Responsori: # | Testo latino | Giorno | Settimane | Pagina/e ---
for (const [id, text, giorno, settimane, pagina] of parseTableRows(respSection)) {
  if (!id.startsWith('LR')) continue;
  rows.push({
    id,
    office: 'lodi',
    role: 'responsorio breve',
    text: stripBold(text),
    context: `${giorno}, ${settimane}`,
    mode: null,
    page: pagina,
    verificare: false,
  });
}

// --- Benedictus: # | Testo latino | Giorno | Settimane | Rif. biblico | Pagina/e ---
for (const [id, text, giorno, settimane, rif, pagina] of parseTableRows(benSection)) {
  if (!id.startsWith('LB')) continue;
  rows.push({
    id,
    office: 'lodi',
    role: 'antifona (Benedictus)',
    text: stripBold(text),
    context: `${giorno}, ${settimane}${rif && rif !== '-' ? ` (${rif})` : ''}`,
    mode: null,
    page: pagina,
    verificare: false,
  });
}

// --- Antifone: # | Settimana | Giorno | Ant. | Testo latino | Salmo/Cantico | Pagina ---
const TP_PREFIX_RE = /^\*\*\(T\.P\., sostituto pasquale di (LA\d+)\)\*\*\s*(.*)$/s;
const BOLD_VERIFICARE_RE = /^\*\*\(verificare([^)]*)\)\*\*\s*(.*)$/s;

for (const [id, settimana, giorno, ant, testoRaw, salmoCantico, pagina] of parseTableRows(antSection)) {
  if (!id.startsWith('LA')) continue;
  let text = testoRaw;
  let isPaschalSubstitute = false;
  let substituteFor = null;
  let verificare = false;
  let verificareNote = null;
  let skip = false;

  const tpMatch = text.match(TP_PREFIX_RE);
  if (tpMatch) {
    isPaschalSubstitute = true;
    substituteFor = tpMatch[1];
    text = tpMatch[2].trim();
  }

  const vMatch = text.match(BOLD_VERIFICARE_RE);
  if (vMatch) {
    verificare = true;
    verificareNote = vMatch[1].replace(/^[\s—-]+/, '').trim() || null;
    text = vMatch[2].trim();
  }

  // plain (unbolded) "(verificare ...)" remainder with no real text follows -> nothing to search
  if (/^\(verificare\b/i.test(text)) {
    skip = true;
    verificare = true;
    verificareNote = (verificareNote ? verificareNote + '; ' : '') + stripBold(text).replace(/^\(|\)$/g, '');
    text = null;
  } else if (text.includes(' — ')) {
    // trailing free-text commentary after the real Latin incipit
    const [latin, ...commentaryParts] = text.split(' — ');
    text = latin.trim();
    const commentary = commentaryParts.join(' — ').trim();
    if (commentary) verificareNote = (verificareNote ? verificareNote + '; ' : '') + commentary;
  }

  rows.push({
    id,
    office: 'lodi',
    role: 'antifona (salmo/cantico)',
    text: skip ? null : stripBold(text),
    context: `settimana ${settimana.replace(/^Sett\.\s*/i, '')}, ${giorno}, ${ant} ant., ${salmoCantico}`,
    mode: null,
    page: pagina,
    isPaschalSubstitute,
    substituteFor,
    verificare,
    verificareNote,
    skip,
  });
}

console.log(`Parsed: ${rows.filter((r) => r.id.startsWith('LH')).length} LH, ${rows.filter((r) => r.id.startsWith('LR')).length} LR, ${rows.filter((r) => r.id.startsWith('LB')).length} LB, ${rows.filter((r) => r.id.startsWith('LA')).length} LA`);
const skipped = rows.filter((r) => r.skip);
console.log(`Skipped (no real text): ${skipped.map((r) => r.id).join(', ') || 'none'}`);

const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
inventory.rows = [...inventory.rows.filter((r) => r.office !== 'lodi'), ...rows];
fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2));
console.log(`Wrote ${inventory.rows.length} total rows to ${INVENTORY_PATH}`);
