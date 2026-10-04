# Clivis — sito

Lodi (salterio delle quattro settimane) e Compieta in canto gregoriano, per il
Movimento Liturgico Giovanile. Il sito apre sul giorno di oggi e calcola da solo
quale pagina del libretto usare.

## Avvio

Il sito usa exsurge (il motore che disegna gli spartiti) come cartella sorella:
deve esistere `../../exsurge` accanto a questo repository.

```sh
npm install
npm run dev      # sito in locale su http://localhost:5173
npm test         # test del calendario liturgico
npm run build    # sito statico in dist/, pubblicabile così com'è
```

`public/` contiene solo collegamenti ai dati del repository (`gabc/`, `salmi/`,
`letture/`): il sito legge direttamente il database, senza copie.

## Come sceglie l'ufficio del giorno

`src/calendar/calendar.ts` calcola il giorno liturgico secondo il calendario
romano generale con le scelte della CEI (Epifania il 6 gennaio, Ascensione e
Corpus Domini la domenica): tempo, settimana, settimana del salterio, colore,
solennità e feste (comprese le trasferite). Le memorie sono ignorate perché
non cambiano il salterio.

`src/calendar/plan.ts` traduce il giorno in pezzi del database:

- **Lodi**: settimana e giorno del salterio; nel Tempo pasquale le antifone
  pasquali; nelle solennità, feste e ottave un avviso che l'ufficio è proprio.
- **Compieta**: Domenica I o II Vespri o giorno feriale (anche intorno alle
  solennità), inno secondo tempo e grado, responsorio breve e antifona mariana
  del tempo.

Le date di confine sono coperte dai test in `src/calendar/calendar.test.ts`.

## Cosa manca

Il Proprio del Tempo e dei Santi, le altre ore, la melodia generica
«Allelúia, allelúia, allelúia» del Tempo pasquale, il cantico di Zaccaria e le
orazioni. Il sito lo segnala nei giorni in cui serve.
