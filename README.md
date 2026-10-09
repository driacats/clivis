<p align="center">
  <img src="site/logo-mlg.svg" alt="Clivis logo" width="96">
</p>

<h1 align="center">Clivis</h1>

<p align="center"><strong>English</strong> · <a href="README.it.md">Italiano</a></p>

<p align="center">The Liturgy of the Hours in Gregorian chant, for the Movimento Liturgico Giovanile.</p>

The name comes from the clivis, the two-note descending neume that is also the site's logo.

The site opens on today's date, works out which office to pray according to the Roman calendar in use in Italy, and shows the whole hour: texts in Italian and Latin, scores in square notation and melodies you can listen to. The repository holds both the site and the database it reads, drawn from the Movimento's booklets (Lodi and Compieta).

## Features

- **Today**: date, liturgical day, colour, season and psalter week; the saint or memorial of the day; the next seven days with their colours and feasts.
- **Lodi** (Morning Prayer) from the four-week psalter, with «Deus in adiutorium» in the tone of the day, hymn, psalmody, short reading, responsory, Benedictus, intercessions, Pater noster and collect. The Proper of Seasons and the Commons of Saints are being added (so far Advent up to 16 December and the Common of the Dedication of a Church).
- **Compieta** (Night Prayer) for every day, with examination of conscience, a choice of hymns, short responsory, Nunc dimittis and the Marian antiphon of the season.
- **Gregorian scores** drawn in the browser from GABC code by the [exsurge](https://github.com/driacats/exsurge) engine.
- **Listening**: antiphon, intonation (Euouae) and psalm tone, at three speeds, with MIDI export and a follow-the-note band that marks on the score the note being played.
- **Psalms** in Italian, Latin or both side by side.
- **Light and dark theme**, with a layout designed for phones too.
- **Score review** (`revisione.html`, password protected): reviewers correct the scores with a visual editor (click a note to move it, change its shape, add or remove notes, syllables and bars) and send them for approval; a progress page shows what has been reviewed and what is left.

The texts of the offices are in Italian and Latin, as in the booklets.

## Usage

The site needs no installation: the home page leads to today's Lodi or Compieta, and the «I prossimi giorni» strip to those of the following days.

To run it locally you need Node.js 18 or later and the exsurge repository next to this one:

```sh
git clone https://github.com/driacats/mlg-breviary.git
git clone https://github.com/driacats/exsurge.git
cd mlg-breviary/site
npm install
npm run dev      # local site at http://localhost:5173
npm test         # tests of the liturgical calendar and of the player
npm run build    # static site in dist/, ready for any hosting (GitHub Pages too)
```

## Structure

- `site/` — the site (TypeScript + Vite). How it picks the office of the day is explained in [`site/README.md`](site/README.md).
- `gabc/` — the chants in GABC format (`chants/`), the index of the pieces (`index.json`) and the structure of the hours (`liturgy.json`).
- `salmi/`, `letture/`, `testi/` — psalms and canticles, short readings, hymn translations, collects and other texts, in JSON.
- `gabc/tools/` — the scripts used to check the database and apply review corrections; `gabc/tools/archivio/` keeps the one-off scripts that built it (already applied, do not run them again).
- `server/` — the small Node service behind the review page (login, state of each chant, proposed corrections); no dependencies.
- `deploy/` — Docker Compose and nginx configuration for the site with the review service.

## Score review

The review page needs the service in `server/revisione.mjs` next to the site: nginx serves the site and passes `/api/` to it (see `deploy/`). The service never writes to the site: approved corrections are downloaded from the page and applied to the repository with `node gabc/tools/applica-revisioni.mjs revisioni-….json`; then commit and publish the site again.

Reviewers are created by an administrator from the page («Revisori ed esportazione»), or from the command line with `node server/revisione.mjs utente NAME [--admin]`. Tests: `node --test server/revisione.test.mjs`.
