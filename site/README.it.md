# Clivis — sito

[English](README.md) · **Italiano**

La Liturgia delle Ore in canto gregoriano per il Movimento Liturgico
Giovanile. Il sito apre sul giorno di oggi e calcola da solo quale pagina del
libretto usare.

## Avvio

Il sito usa exsurge (il motore che disegna gli spartiti) come cartella sorella:
deve esistere `../../exsurge` accanto a questo repository.

```sh
npm install
npm run dev      # sito in locale su http://localhost:5173
npm test         # test del calendario e delle melodie
npm run typecheck
npm run build    # sito statico in dist/, pubblicabile così com'è
```

`public/` contiene solo collegamenti ai dati del repository (`gabc/`, `salmi/`,
`letture/`, `testi/`): il sito legge direttamente il database, senza copie.

## Come è fatto

- `../calendaria/` — il calendario liturgico, calcolato in fase di build (il
  plugin di Vite in `vite.config.ts`, anche durante `npm run dev`):
  - gli strati `generale.json`, `europa.json`, `italia.json`, `genua.json`,
    uniti e controllati da `strata.ts` (che ne descrive anche il formato);
    `loca.json` sceglie il luogo;
  - `tempus.ts`: date, feste mobili, tempi e salterio di quattro settimane;
    `dies.ts`: i giorni di un anno con la tabella di precedenza (compresi i
    trasferimenti), le memorie e il «santo del giorno»;
  - `compone.ts` scrive `calendarium/index.json` e
    `calendarium/<luogo>/<anno>.json` (l'anno in corso, o `ANNUS`).
- `src/calendar/` — il calendario nel sito, senza interfaccia:
  - `calendar.ts` carica l'anno generato e vi cerca i giorni; una data fuori
    dall'anno mostra un avviso;
  - `plan.ts` traduce il giorno in pezzi del database: settimana e giorno del
    salterio, Proprio del Tempo, Comune dei santi, toni dell'introduzione, del
    Pater noster e del congedo; per la Compieta Domenica I o II Vespri o giorno
    feriale, inno, responsorio e antifona mariana del tempo.
- `src/data/` — lettura del database (`loader.ts`), i suoi tipi, e gli id dei
  canti e i file di dati che il codice nomina direttamente (`ids.ts`).
- `src/ui/` — le pagine: `home.ts`, `office-page.ts` (un ufficio con la sua
  colonna laterale, `aside.ts`: memorie e calendario del mese), `day.ts`
  (intestazione del giorno), `opening.ts`, `lodi.ts`, `comune.ts`,
  `compieta.ts`, `esame.ts`; i pezzi comuni (spartito, salmo, lettura, scelte)
  sono in `pieces.ts`, gli aiuti per il DOM in `dom.ts`.
- `src/storage.ts` — le preferenze ricordate nel browser (tema, lingua dei
  salmi, velocità, filtro della revisione); `src/theme.ts` — tema chiaro e scuro.
- `src/audio/` — la barra di ascolto sotto ogni spartito: antifona, Euouae e tono del salmo (riproduzione, MIDI e segui-nota vengono da exsurge).
- `src/revisione/` — la pagina di revisione degli spartiti (`revisione.html`): elenco dei canti con il loro stato, editor visuale (lo spartito è il `<chant-editor>` di exsurge, con il suo modello del gabc; qui ci sono gli strumenti e la revisione), revisori ed esportazione. Parla con `../server/revisione.mjs` sotto `/api/` (`npm run dev` lo inoltra alla porta 3000, o a `PORTA`). Nomi e spiegazioni delle opzioni della notazione sono in `notation.ts`, condivisi da editor e guida.
- `src/style.css` — tutta la grafica. Colori, font, misure e livelli sono
  variabili in cima al file, i colori una volta per tema (`data-theme` su
  `<html>`); il colore liturgico del giorno è `--day-color` (`data-color`).

Gli spartiti sono elementi `<chant-visual>` di exsurge: finché non sono
disegnati restano vuoti e il sito mostra un rigo vuoto al loro posto, così il
codice GABC non compare mai.

Le date di confine sono coperte dai test in `src/calendar/*.test.ts`, che calcolano i giorni direttamente dagli strati (`testDays.ts`).

## Cosa manca

Il resto del Proprio del Tempo e del Comune dei santi, le altre ore e la
melodia generica «Allelúia, allelúia, allelúia» del Tempo pasquale. Il sito lo
segnala nei giorni in cui serve.
