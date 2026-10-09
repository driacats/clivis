// Generates /REPORT.md from gabc/inventory.json (row order/context) and
// gabc/index.json (resolution status) — the "found vs not-found" deliverable.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GABC_DIR = path.resolve(__dirname, '..', '..');

const inventory = JSON.parse(fs.readFileSync(path.join(GABC_DIR, 'inventory.json'), 'utf8')).rows;
const index = JSON.parse(fs.readFileSync(path.join(GABC_DIR, 'index.json'), 'utf8'));
const byId = new Map(index.map((e) => [e.id, e]));

function entryFor(row) {
  return byId.get(`${row.office}.${row.id}`);
}

// Rows carrying a quality caveat even though marked "found" - surfaced up top.
const CAVEATS = {
  'lodi.LA9': 'manca l\'alleluia del tempo pasquale nella trascrizione GregoBase scelta',
  'lodi.LA38': '"Ant." di rubrica rimosso dall\'inizio del corpo GABC; manca ancora l\'alleluia del tempo pasquale (non ricostruibile automaticamente)',
  'lodi.LA79': 'manca l\'alleluia finale del tempo pasquale in fondo all\'antifona',
  'lodi.LA85': 'manca un alleluia per il tempo pasquale',
  'lodi.LA98': 'manca l\'alleluia del tempo pasquale',
  'lodi.LA16': 'il finale euouae della trascrizione GregoBase è diverso da quello del libretto (lasciato come scaricato, non ricostruito)',
  'lodi.LA59': 'l\'EUOUAE della trascrizione GregoBase è sbagliato/diverso rispetto al libretto',
  'compieta.C27': 'la trascrizione GregoBase originale includeva un incipit salmico aggiuntivo ("Consérva me, Deus" + EUOUAE) non facente parte dell\'antifona: rimosso dal file .gabc salvato in questo repository',
};

function statusLine(row) {
  const e = entryFor(row);
  if (!e) return `? ${row.text} (${row.context}) — riga non trovata in gabc/index.json (bug nel generatore, verificare)`;
  const ctx = row.context || '';
  if (e.status === 'found') {
    const caveat = CAVEATS[e.id];
    const mark = caveat ? '⚠' : '✓';
    const caveatTag = caveat ? ' *(vedi [Note e criticità](#note-e-criticità-da-verificare))*' : '';
    return `${mark} ${row.text} (${ctx}) — GregoBase #${e.gregobase.id} — \`${e.file}\`${caveatTag}`;
  }
  if (e.status === 'not-found') {
    return `✗ ${row.text} (${ctx}) — **non trovato**: ${e.notFoundReason}`;
  }
  if (e.status === 'not-applicable') {
    return `— ${row.text} (${ctx}) — non applicabile: ${e.notApplicableReason}`;
  }
  return `? ${row.text} (${ctx}) — stato sconosciuto "${e.status}"`;
}

function countStatuses(rows) {
  const c = { found: 0, 'not-found': 0, 'not-applicable': 0 };
  for (const row of rows) {
    const e = entryFor(row);
    if (e) c[e.status] = (c[e.status] || 0) + 1;
  }
  return c;
}

const compietaRows = inventory.filter((r) => r.office === 'compieta');
const lodiRows = inventory.filter((r) => r.office === 'lodi');
const lhRows = lodiRows.filter((r) => r.id.startsWith('LH'));
const lrRows = lodiRows.filter((r) => r.id.startsWith('LR'));
const lbRows = lodiRows.filter((r) => r.id.startsWith('LB'));
const laRows = lodiRows.filter((r) => r.id.startsWith('LA'));

const cCounts = countStatuses(compietaRows);
const lCounts = countStatuses(lodiRows);
const totalCounts = countStatuses(inventory);

let md = '';
md += '# Report — canti GABC trovati per Compieta e Lodi\n\n';
md += 'Riepiloga, per ogni canto gregoriano individuato nei due libretti sorgente, se è stata trovata (e con quale grado di confidenza) una trascrizione GABC corrispondente su [GregoBase](https://gregobase.selapa.net/), riusabile nel database `gabc/` di questo repository e renderizzabile con [exsurge](../../exsurge).\n\n';
md += '**Perimetro**: `sources/Compieta piccola.pdf` per intero (56 pagine); `sources/Lodi complete.2.pdf` solo pp. 1-176 (salterio delle quattro settimane) — la sezione "Proprio del Tempo" (Avvento, Natale, Quaresima, Pasqua, da p. 177 in poi) è esclusa volutamente, su indicazione dell\'utente, e non è coperta da questo report.\n\n';
md += 'Le corrispondenze sono state trovate in due fasi: (1) un abbinamento automatico per incipit/modo/office-part con preferenza per le edizioni Solesmes, come da nota del colophon di Compieta p. 54; (2) per i casi ambigui, una disambiguazione visiva in cui l\'utente ha confrontato l\'immagine della pagina del libretto con le anteprime dei candidati GregoBase e scelto la corrispondenza corretta (o segnalato l\'assenza di corrispondenza, o indicato di persona il canto giusto quando non era nella rosa automatica).\n\n';

md += '## Riepilogo\n\n';
md += '| Libretto | Trovati | Non trovati | Non applicabile | Totale |\n';
md += '| --- | --- | --- | --- | --- |\n';
md += `| Compieta | ${cCounts.found} | ${cCounts['not-found']} | ${cCounts['not-applicable'] || 0} | ${compietaRows.length} |\n`;
md += `| Lodi (sett. 1-4) | ${lCounts.found} | ${lCounts['not-found']} | ${lCounts['not-applicable'] || 0} | ${lodiRows.length} |\n`;
md += `| **Totale** | **${totalCounts.found}** | **${totalCounts['not-found']}** | **${totalCounts['not-applicable'] || 0}** | **${inventory.length}** |\n\n`;
md += 'Inoltre, il tempo pasquale sostituisce nella maggior parte delle antifone salmiche di Lodi il testo proprio con la formula generica "Allelúia, allelúia, allelúia": questa formula non è stata cercata riga per riga su GregoBase (sarebbero decine di ricerche identiche) — resta da coprire a parte con poche formule riusabili per modo, se e quando servirà.\n\n';

md += '## Note e criticità da verificare\n\n';
md += 'Le righe seguenti sono marcate **trovato** in questo report, ma portano un limite noto segnalato durante la disambiguazione — da tenere presente prima dell\'uso liturgico/di stampa:\n\n';
md += '**Alleluia del tempo pasquale mancante** (la trascrizione GregoBase scelta non include l\'alleluia proprio del tempo pasquale che il libretto prevede in coda all\'antifona — non ricostruito automaticamente):\n';
for (const id of ['lodi.LA9', 'lodi.LA38', 'lodi.LA79', 'lodi.LA85', 'lodi.LA98']) {
  const e = byId.get(id);
  md += `- \`${id}\` — ${e.printedIncipit} — \`${e.file}\`\n`;
}
md += '\n**EUOUAE (formula del Sæculorum Amen) diverso da quello del libretto**:\n';
for (const id of ['lodi.LA16', 'lodi.LA59']) {
  const e = byId.get(id);
  md += `- \`${id}\` — ${e.printedIncipit} — \`${e.file}\` — ${CAVEATS[id]}\n`;
}
md += '\n**Testo corretto manualmente rispetto al download GregoBase originale**:\n';
md += `- \`compieta.C27\` — Caro mea requiéscet in spe — \`gabc/chants/10086-caro-mea-requiescet-in-spe.gabc\` — la trascrizione originale includeva un incipit salmico aggiuntivo ("Consérva me, Deus" + formula EUOUAE) non facente parte dell'antifona: rimosso.\n`;
md += `- \`lodi.LA38\` — Exsultávit cor meum in Dómino — \`gabc/chants/4903-exsultavit-cor-meum-in-domino-qui-humiliat-et-sublevat.gabc\` — rimossa un'etichetta di rubrica "Ant." erroneamente inclusa all'inizio del corpo GABC (vedi anche l'alleluia mancante sopra).\n`;
md += '\n**Riferimento di pagina da riverificare** (l\'utente segnala che la pagina del libretto mostrata durante la disambiguazione non conteneva l\'antifona in questione — probabile errore nel riferimento di pagina raccolto in `PDF-INVENTORY.md`/`gabc/inventory.json`, non necessariamente assenza del canto da GregoBase):\n';
for (const id of ['lodi.LA20', 'lodi.LA58']) {
  const e = byId.get(id);
  md += `- \`${id}\` — ${e.printedIncipit} — ${e.notFoundReason}\n`;
}
md += '\n';

md += '## Compieta piccola.pdf\n\n';
for (const row of compietaRows) md += `- ${statusLine(row)}\n`;
md += '\n';

md += '## Lodi complete.2.pdf (pp. 1-176, salterio delle quattro settimane)\n\n';

md += '### Inni\n\n';
for (const row of lhRows) md += `- ${statusLine(row)}\n`;
md += '\n### Responsori brevi\n\n';
for (const row of lrRows) md += `- ${statusLine(row)}\n`;
md += '\n### Antifone al Benedictus\n\n';
for (const row of lbRows) md += `- ${statusLine(row)}\n`;

md += '\n### Antifone salmiche e al cantico\n\n';
let currentWeek = null;
for (const row of laRows) {
  const m = row.context.match(/settimana (\d)/);
  const week = m ? m[1] : null;
  if (week && week !== currentWeek) {
    md += `\n#### Settimana ${week}\n\n`;
    currentWeek = week;
  }
  md += `- ${statusLine(row)}\n`;
}

fs.writeFileSync(path.join(__dirname, 'REPORT.md'), md);
console.log('Wrote REPORT.md,', md.length, 'bytes');
