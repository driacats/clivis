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
npm run build    # sito statico in dist/, pubblicabile così com'è
```

`public/` contiene solo collegamenti ai dati del repository (`gabc/`, `salmi/`,
`letture/`, `testi/`): il sito legge direttamente il database, senza copie.

## Come è fatto

- `src/calendar/` — il calendario, senza interfaccia:
  - `calendar.ts` calcola il giorno liturgico secondo il calendario romano
    generale con le scelte della CEI (Epifania il 6 gennaio, Ascensione e
    Corpus Domini la domenica): tempo, settimana, settimana del salterio,
    colore, solennità e feste (comprese le trasferite) e memorie;
  - `santi.ts` è l'unico elenco delle memorie dei santi, ciascuna con il suo
    Comune; `saints.ts` prepara il «santo del giorno» della homepage;
  - `plan.ts` traduce il giorno in pezzi del database: settimana e giorno del
    salterio, Proprio del Tempo, Comune dei santi, toni dell'introduzione, del
    Pater noster e del congedo; per la Compieta Domenica I o II Vespri o giorno
    feriale, inno, responsorio e antifona mariana del tempo.
- `src/data/` — lettura del database (`loader.ts`) e i suoi tipi.
- `src/ui/` — le pagine: `home.ts`, `day.ts` (intestazione del giorno),
  `lodi.ts`, `comune.ts`, `compieta.ts`, `esame.ts`; i pezzi comuni (spartito,
  salmo, lettura, scelte) sono in `pieces.ts`.
- `src/audio/` — ascolto delle melodie, tono del salmo, MIDI e segui-nota.
- `src/revisione/` — la pagina di revisione degli spartiti (`revisione.html`): elenco dei canti con il loro stato, editor visuale (`gabcModel.ts` legge e scrive il gabc senza perdere nulla, `score.ts` rende cliccabili le note), revisori ed esportazione. Parla con `../server/revisione.mjs` sotto `/api/` (`npm run dev` lo inoltra alla porta 3000).
- `src/style.css` — tutta la grafica. I colori sono definiti una volta per
  tema in cima al file (`data-theme` su `<html>`).

Gli spartiti sono elementi `<chant-visual>` di exsurge: finché non sono
disegnati restano vuoti e il sito mostra un rigo vuoto al loro posto, così il
codice GABC non compare mai.

Le date di confine sono coperte dai test in `src/calendar/*.test.ts`.

## Cosa manca

Il resto del Proprio del Tempo e del Comune dei santi, le altre ore e la
melodia generica «Allelúia, allelúia, allelúia» del Tempo pasquale. Il sito lo
segnala nei giorni in cui serve.
