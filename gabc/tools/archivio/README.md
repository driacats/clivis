# Archivio

Script una tantum con cui è stato costruito il database dei canti, con i loro dati di partenza e i report prodotti. Sono **già stati applicati**: sono qui solo come documentazione.

Non rilanciarli: `match-inventory.mjs`, `apply-disambiguation.mjs` e `generate-report.mjs` riscrivono `gabc/index.json` e `REPORT.md`, che da allora sono stati corretti a mano; `convert-psalms-to-json.py` cancella i `.txt` da cui parte.

| Script | Che cosa faceva |
|---|---|
| `build-lodi-inventory.mjs` | tabelle di Lodi da `PDF-INVENTORY.md` a `gabc/inventory.json` |
| `fetch-incipit-index.mjs`, `search-gregobase.mjs`, `fetch-chant.mjs`, `gregobase-client.mjs` | indice degli incipit di GregoBase e scaricamento dei canti |
| `match-inventory.mjs` | abbinamento delle righe dell'inventario ai canti di GregoBase |
| `apply-disambiguation.mjs` + `disambiguation-decisions.json` | scelte manuali tra più candidati |
| `generate-report.mjs` | `REPORT.md` |
| `build-liturgy-lodi.mjs` | prima struttura delle Lodi per `gabc/liturgy.json` |
| `convert-psalms-to-json.py` + `*-psalm-links.json` | salmi da testo a JSON |
| `extract-lodi-conclusioni.py` | invocazioni e orazioni in `testi/lodi-conclusioni.json` |
