# Clivis — site

**English** · [Italiano](README.it.md)

The Liturgy of the Hours in Gregorian chant for the Movimento Liturgico
Giovanile. The site opens on today's date and works out by itself which page
of the booklet to use.

## Getting started

The site uses exsurge (the engine that draws the scores) as a sibling folder:
`../../exsurge` must exist next to this repository.

```sh
npm install
npm run dev      # local site at http://localhost:5173
npm test         # tests of the calendar and of the melodies
npm run build    # static site in dist/, ready to publish as is
```

`public/` only holds links to the repository's data (`gabc/`, `salmi/`,
`letture/`, `testi/`): the site reads the database directly, with no copies.

## How it is built

- `src/calendar/` — the calendar, with no user interface:
  - `calendar.ts` computes the liturgical day according to the General Roman
    Calendar with the choices of the Italian Bishops' Conference (Epiphany on
    6 January, Ascension and Corpus Christi on Sunday): season, week, psalter
    week, colour, solemnities and feasts (transferred ones included) and
    memorials;
  - `santi.ts` is the single list of the saints' memorials, each with its
    Common; `saints.ts` prepares the «saint of the day» of the home page;
  - `plan.ts` turns the day into pieces of the database: psalter week and day,
    Proper of Seasons, Common of Saints, tones of the opening, of the Pater
    noster and of the dismissal; for Compieta, Sunday I or II Vespers or
    weekday, hymn, responsory and Marian antiphon of the season.
- `src/data/` — reading the database (`loader.ts`) and its types.
- `src/ui/` — the pages: `home.ts`, `day.ts` (header of the day), `lodi.ts`,
  `comune.ts`, `compieta.ts`, `esame.ts`; the shared pieces (score, psalm,
  reading, choices) are in `pieces.ts`.
- `src/audio/` — listening to the melodies, psalm tone, MIDI and follow-the-note.
- `src/style.css` — all of the styling. The colours are defined once per theme
  at the top of the file (`data-theme` on `<html>`).

Scores are exsurge `<chant-visual>` elements: until they are drawn they stay
empty and the site shows an empty staff in their place, so the GABC code is
never seen.

Edge dates are covered by the tests in `src/calendar/*.test.ts`.

## Still missing

The rest of the Proper of Seasons and of the Commons of Saints, the other hours
and the generic «Allelúia, allelúia, allelúia» melody of Eastertide. The site
says so on the days where it matters.
