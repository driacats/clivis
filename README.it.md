<p align="center">
  <img src="site/logo-mlg.svg" alt="Logo di Clivis" width="96">
</p>

<h1 align="center">Clivis</h1>

<p align="center"><a href="README.md">English</a> · <strong>Italiano</strong></p>

<p align="center">La Liturgia delle Ore in canto gregoriano, per il Movimento Liturgico Giovanile.</p>

Il nome viene dalla clivis, il neuma di due note discendenti che è anche il logo del sito.

Il sito apre sul giorno di oggi, calcola da solo quale ufficio pregare secondo il calendario romano in uso in Italia e mostra l'ora completa: testi in italiano e latino, spartiti in notazione quadrata e melodie da ascoltare. Il repository contiene sia il sito sia il database da cui legge, ricavato dai libretti del Movimento (Lodi e Compieta).

## Funzionalità

- **Il giorno di oggi**: data, giorno liturgico, colore, tempo e settimana del salterio; santo o memoria del giorno; i prossimi sette giorni con i loro colori e le feste.
- **Lodi** del salterio delle quattro settimane, con «Deus in adiutorium» nel tono del giorno, inno, salmodia, lettura breve, responsorio, Benedictus, invocazioni, Pater noster e orazione. Il Proprio del Tempo e il Comune dei santi sono in corso di inserimento (per ora l'Avvento fino al 16 dicembre e il Comune della Dedicazione).
- **Compieta** di ogni giorno, con esame di coscienza, inni selezionabili, responsorio breve, Nunc dimittis e antifona mariana del tempo.
- **Spartiti gregoriani** disegnati nel browser a partire dal codice GABC, con il motore [exsurge](https://github.com/driacats/exsurge).
- **Ascolto delle melodie**: antifona, intonazione (Euouae) e tono del salmo, con velocità regolabile, esportazione MIDI e segui-nota che evidenzia sullo spartito la nota che sta suonando.
- **Salmi** in italiano, latino o entrambi affiancati.
- **Tema chiaro e scuro**, impaginazione pensata anche per il telefono.
- **Revisione degli spartiti** (`revisione.html`, protetta da password): i revisori correggono gli spartiti con un editor visuale (clic su una nota per spostarla, cambiarne la forma, aggiungere o togliere note, sillabe e divisioni) e li inviano per l'approvazione; una pagina mostra che cosa è stato rivisto e che cosa manca.

## Come si usa

Il sito si apre e si usa senza installare nulla: la pagina iniziale porta alle Lodi o alla Compieta del giorno, e la striscia «I prossimi giorni» porta a quelle dei giorni successivi.

Per farlo girare in locale servono Node.js 18 o successivo e il repository di exsurge accanto a questo:

```sh
git clone https://github.com/driacats/mlg-breviary.git
git clone https://github.com/driacats/exsurge.git
cd mlg-breviary/site
npm install
npm run dev      # sito in locale su http://localhost:5173
npm test         # test del calendario liturgico e del player
npm run build    # sito statico in dist/, pubblicabile su qualsiasi hosting (anche GitHub Pages)
```

## Struttura

- `site/` — il sito (TypeScript + Vite). Dettagli su calendario e scelta dell'ufficio in [`site/README.it.md`](site/README.it.md).
- `gabc/` — i canti in formato GABC (`chants/`), l'indice dei pezzi (`index.json`) e la struttura delle ore (`liturgy.json`).
- `salmi/`, `letture/`, `testi/` — salmi e cantici, letture brevi, inni tradotti, orazioni e altri testi, in JSON.
- `gabc/tools/` — gli script per verificare il database e applicare le revisioni; `gabc/tools/archivio/` conserva gli script una tantum con cui è stato costruito (già applicati, da non rilanciare).
- `server/` — il piccolo servizio Node dietro la pagina di revisione (accesso, stato di ogni canto, correzioni proposte), senza dipendenze.
- `deploy/` — configurazione di Docker Compose e nginx per il sito con il servizio di revisione.

## Revisione degli spartiti

La pagina di revisione ha bisogno del servizio `server/revisione.mjs` accanto al sito: nginx serve il sito e gli passa `/api/` (vedi `deploy/`). Il servizio non scrive mai nei file del sito: le correzioni approvate si scaricano dalla pagina e si applicano al repository con `node gabc/tools/applica-revisioni.mjs revisioni-….json`; poi commit e nuova pubblicazione del sito.

I revisori li crea un amministratore dalla pagina («Revisori ed esportazione») oppure da riga di comando con `node server/revisione.mjs utente NOME [--admin]`. Test: `node --test server/revisione.test.mjs`.
