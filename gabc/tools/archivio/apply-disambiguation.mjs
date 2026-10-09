// Applies the user's visual-disambiguation decisions (collected via the
// review Artifact) to gabc/index.json: resolves each former "needs-review"
// row to found/not-found, downloading the chosen GABC file when needed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChantDetail } from './fetch-chant.mjs';
import { normalizeLatin } from './gregobase-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GABC_DIR = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(GABC_DIR, 'index.json');
const CHANTS_DIR = path.join(GABC_DIR, 'chants');

function slugify(text) {
  return normalizeLatin(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function loadIndex() {
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}
function saveIndex(index) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

const decisions = JSON.parse(fs.readFileSync(path.join(__dirname, 'disambiguation-decisions.json'), 'utf8'));

async function downloadChosen(entry, candidateMeta) {
  const detail = await getChantDetail(candidateMeta.id);
  if (!detail.exists) {
    throw new Error(`chant #${candidateMeta.id} (${entry.id}) has an empty download - cannot use it`);
  }
  const slug = slugify(entry.printedIncipit);
  const filename = `${candidateMeta.id}-${slug}.gabc`;
  const destPath = path.join(CHANTS_DIR, filename);
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(CHANTS_DIR, { recursive: true });
    fs.writeFileSync(destPath, detail.gabcRaw);
  }
  return { filename, detail };
}

async function main() {
  const index = loadIndex();
  const byId = new Map(index.map((e) => [e.id, e]));

  let found = 0, notFound = 0, custom = 0;

  for (const dec of decisions) {
    const entry = byId.get(dec.rowId);
    if (!entry) throw new Error(`row ${dec.rowId} not found in index.json`);
    if (entry.status !== 'needs-review') {
      console.log(`${dec.rowId}: SKIP (status is already "${entry.status}", not needs-review)`);
      continue;
    }

    const priorCandidatesConsidered = entry.allCandidatesConsidered || (entry.candidates || []).map((c) => c.id);

    if (!dec.noMatch && dec.candidateId != null) {
      // Picked from the existing shortlist.
      const chosenMeta = (entry.candidates || []).find((c) => c.id === dec.candidateId);
      if (!chosenMeta) throw new Error(`${dec.rowId}: candidateId ${dec.candidateId} not in its candidates list`);
      const { filename } = await downloadChosen(entry, chosenMeta);
      let matchNotes = 'Confermato dall\'utente durante la disambiguazione visiva (immagine del libretto + anteprima GregoBase).';
      if (dec.note) matchNotes += ` Nota dell'utente: ${dec.note}`;
      byId.set(dec.rowId, {
        id: entry.id,
        office: entry.office,
        role: entry.role,
        printedIncipit: entry.printedIncipit,
        printedContext: entry.printedContext,
        pdfPage: entry.pdfPage,
        status: 'found',
        gregobase: { id: chosenMeta.id, url: chosenMeta.url },
        file: `gabc/chants/${filename}`,
        matchNotes,
        candidatesConsidered: priorCandidatesConsidered,
      });
      found++;
      console.log(`${dec.rowId}: FOUND (user-picked) #${chosenMeta.id} -> ${filename}`);
      continue;
    }

    if (dec.noMatch && dec.note && /chant\.php\?id=(\d+)/.test(dec.note)) {
      // User found the right chant themselves, outside the shortlist.
      const customId = Number(dec.note.match(/chant\.php\?id=(\d+)/)[1]);
      const detail = await getChantDetail(customId);
      if (!detail.exists) throw new Error(`${dec.rowId}: user-provided id ${customId} has empty download`);
      const slug = slugify(entry.printedIncipit);
      const filename = `${customId}-${slug}.gabc`;
      const destPath = path.join(CHANTS_DIR, filename);
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(CHANTS_DIR, { recursive: true });
        fs.writeFileSync(destPath, detail.gabcRaw);
      }
      const url = `https://gregobase.selapa.net/chant.php?id=${customId}`;
      byId.set(dec.rowId, {
        id: entry.id,
        office: entry.office,
        role: entry.role,
        printedIncipit: entry.printedIncipit,
        printedContext: entry.printedContext,
        pdfPage: entry.pdfPage,
        status: 'found',
        gregobase: { id: customId, url },
        file: `gabc/chants/${filename}`,
        matchNotes: `Individuato dall'utente direttamente su GregoBase durante la disambiguazione visiva (non incluso nella shortlist generata automaticamente). Modo/office-part: ${detail.header.mode ?? 'n/d'} / ${detail.header['office-part'] ?? 'n/d'}.`,
        candidatesConsidered: [...priorCandidatesConsidered, customId],
      });
      found++;
      custom++;
      console.log(`${dec.rowId}: FOUND (user's own search) #${customId} -> ${filename}`);
      continue;
    }

    if (dec.noMatch) {
      // User says the shown booklet page doesn't contain this antiphon at all -
      // likely a page-reference bug upstream, not proof the chant is absent from GregoBase.
      byId.set(dec.rowId, {
        id: entry.id,
        office: entry.office,
        role: entry.role,
        printedIncipit: entry.printedIncipit,
        printedContext: entry.printedContext,
        pdfPage: entry.pdfPage,
        status: 'not-found',
        notFoundReason: `L'utente segnala che la pagina del libretto mostrata durante la disambiguazione non contiene questa antifona (nota utente: "${dec.note}"): probabile errore nel riferimento di pagina in PDF-INVENTORY.md/gabc/inventory.json, da riverificare manualmente sul PDF sorgente — non è detto che il canto non esista su GregoBase.`,
        candidatesConsidered: priorCandidatesConsidered,
      });
      notFound++;
      console.log(`${dec.rowId}: NOT-FOUND (page mismatch reported by user)`);
      continue;
    }

    throw new Error(`${dec.rowId}: unhandled decision shape ${JSON.stringify(dec)}`);
  }

  const finalIndex = [...byId.values()];
  saveIndex(finalIndex);

  console.log('\n=== Summary ===');
  console.log(`found: ${found} (of which user's own GregoBase search: ${custom}), not-found: ${notFound}`);

  const statusCounts = {};
  for (const e of finalIndex) statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  console.log('Final gabc/index.json status counts:', statusCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
