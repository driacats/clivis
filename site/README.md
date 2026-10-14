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
npm run typecheck
npm run build    # static site in dist/, ready to publish as is
```

`public/` only holds links to the repository's data (`gabc/`, `salmi/`,
`letture/`, `testi/`): the site reads the database directly, with no copies.

## How it is built

- `../calendaria/` — the liturgical calendar, computed at build time (the
  Vite plugin in `vite.config.ts`, also during `npm run dev`):
  - the layers `generale.json`, `europa.json`, `italia.json`, `genua.json`,
    merged and checked by `strata.ts` (which also describes the format);
    `loca.json` chooses the place;
  - `tempus.ts`: dates, movable feasts, seasons and the four-week psalter;
    `dies.ts`: the days of a year with the table of precedence (transfers
    included), the memorials and the «saint of the day»;
  - `compone.ts` writes `calendarium/index.json` and
    `calendarium/<place>/<year>.json` (the current year, or `ANNUS`).
- `src/calendar/` — the calendar in the site, with no user interface:
  - `calendar.ts` loads the generated year and looks the days up; a date
    outside it shows a notice;
  - `plan.ts` turns the day into pieces of the database: psalter week and day,
    Proper of Seasons, Common of Saints, tones of the opening, of the Pater
    noster and of the dismissal; for Compieta, Sunday I or II Vespers or
    weekday, hymn, responsory and Marian antiphon of the season.
- `src/data/` — reading the database (`loader.ts`), its types, and the chant
  ids and data files the code names directly (`ids.ts`).
- `src/ui/` — the pages: `home.ts`, `office-page.ts` (an office with its side
  column, `aside.ts`: memorials and month calendar), `day.ts` (header of the
  day), `opening.ts`, `lodi.ts`, `comune.ts`, `compieta.ts`, `esame.ts`; the
  shared pieces (score, psalm, reading, choices) are in `pieces.ts`, the DOM
  helpers in `dom.ts`.
- `src/storage.ts` — the preferences remembered in the browser (theme, psalm
  language, speed, review filter); `src/theme.ts` — light and dark theme.
- `src/audio/` — the listen bar under each score: antiphon, EUOUAE and psalm tone (playback, MIDI and follow-the-note come from exsurge).
- `src/revisione/` — the score review page (`revisione.html`): list of the chants with their state, visual editor (the score is exsurge's `<chant-editor>`, with its gabc model; the tools and the review are here), reviewers and export. It talks to `../server/revisione.mjs` under `/api/` (`npm run dev` forwards it to port 3000, or to `PORTA`). The names and help of the notation options are in `notation.ts`, shared by the editor and the guide.
- `src/style.css` — all of the styling. Colours, fonts, sizes and layers are
  variables at the top of the file, the colours once per theme (`data-theme`
  on `<html>`); the day's liturgical colour is `--day-color` (`data-color`).

Scores are exsurge `<chant-visual>` elements: until they are drawn they stay
empty and the site shows an empty staff in their place, so the GABC code is
never seen.

Edge dates are covered by the tests in `src/calendar/*.test.ts`, which compute the days straight from the layers (`testDays.ts`).

## Still missing

The rest of the Proper of Seasons and of the Commons of Saints, the other hours
and the generic «Allelúia, allelúia, allelúia» melody of Eastertide. The site
says so on the days where it matters.
