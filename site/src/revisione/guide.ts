// The reviewers' guide (#/guida): how the review works and every command of the editor.
import { h } from '../ui/dom';
import type { Utente } from './api';
import { icon } from './icons';
import { resetTours } from './tour';
import { statoPill } from './ui';

const kbd = (...keys: string[]): HTMLElement =>
  h('span', { class: 'kbd-group' }, ...keys.flatMap((k, i) => [i ? ' + ' : '', h('kbd', {}, k)]));

function pic(key: string): HTMLElement {
  const el = h('span', { class: 'guide-pic', 'aria-hidden': 'true' });
  el.innerHTML = icon(key) ?? '';
  return el;
}

/** A list of options with their little picture, as on the editor's buttons. */
const options = (rows: [string, string, string][]): HTMLElement =>
  h('dl', { class: 'guide-options' }, ...rows.flatMap(([key, name, text]) => [
    h('dt', {}, pic(key), name),
    h('dd', {}, text),
  ]));

const table = (rows: [Node | string, string][]): HTMLElement =>
  h('table', { class: 'guide-keys' }, h('tbody', {}, ...rows.map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v)))));

const section = (id: string, title: string, ...content: Node[]): HTMLElement =>
  h('section', { class: 'office-section guide-section', id }, h('h2', { class: 'rubric' }, title), ...content);

const p = (...c: (Node | string)[]) => h('p', {}, ...c);

export function renderGuide(me: Utente): HTMLElement {
  const admin = me.ruolo === 'admin';
  const replay = h('button', { type: 'button', class: 'ed-button' }, 'Rivedi la presentazione');
  replay.addEventListener('click', () => { resetTours(); location.hash = '#/'; });

  const toc: [string, string][] = [
    ['come', 'Come funziona la revisione'], ['elenco', 'L’elenco dei canti'], ['selezione', 'Selezionare le note'],
    ['nota', 'La scheda «Nota»'], ['sillaba', 'La scheda «Sillaba»'], ['brano', 'La scheda «Brano»'],
    ['ascolto', 'Ascoltare e confrontare'], ['invio', 'Salvare e inviare'], ['tastiera', 'Tastiera'],
    ...(admin ? [['admin', 'Per l’amministratore'] as [string, string]] : []),
  ];

  return h('main', { class: 'rev-wrap rev-guide' },
    h('a', { href: '#/', class: 'back-link' }, '← Tutti i canti'),
    h('h1', { class: 'rev-title' }, 'Guida alla revisione'),
    h('p', { class: 'rev-intro' }, 'Tutto quello che serve per controllare e correggere le melodie di Clivis, con i comandi dell’editor.'),
    h('nav', { class: 'guide-toc', 'aria-label': 'Indice' },
      h('ol', {}, ...toc.map(([id, t]) => h('li', {}, h('a', { href: `#/guida/${id}` }, t))))),

    section('come', 'Come funziona la revisione',
      p('Ogni canto del breviario va confrontato con lo spartito del libretto (Lodi complete o Compieta piccola). Se qualcosa non corrisponde lo correggi qui; se è già giusto lo invii così com’è. In tutti e due i casi il canto passa ad Andrea, che lo approva.'),
      h('ol', { class: 'guide-flow' },
        h('li', {}, statoPill('da-rivedere'), ' nessuno l’ha ancora aperto.'),
        h('li', {}, statoPill('in-corso'), ' qualcuno ha salvato una bozza.'),
        h('li', {}, statoPill('inviato'), ' inviato: aspetta l’approvazione.'),
        h('li', {}, statoPill('rimandato'), ' rimandato indietro con una nota su che cosa sistemare.'),
        h('li', {}, statoPill('approvato'), ' fatto. Se c’erano correzioni, arrivano sul sito alla pubblicazione successiva.')),
      p('Le correzioni non cambiano subito il sito: restano proposte finché non vengono approvate e pubblicate. Puoi quindi provare senza paura di rompere qualcosa.')),

    section('elenco', 'L’elenco dei canti',
      p('I canti sono divisi per sezione come nel libretto, ognuno con la pagina, lo stato, chi l’ha toccato per ultimo e quanti commenti ha. La barra in alto mostra quanti sono già approvati.'),
      p('Con i pulsanti degli stati, il menu delle sezioni e la ricerca (incipit, giorno, pagina) restringi l’elenco: il filtro resta anche quando torni. Dentro un canto, «Precedente» e «Successivo» seguono lo stesso filtro, così puoi lavorare per esempio su tutti i canti «Da rivedere» di una sezione uno dopo l’altro.')),

    section('selezione', 'Selezionare le note',
      p('Fai clic su una nota dello spartito: compare un riquadro rosso attorno ad essa e il pannello a destra mostra che nota è e che cosa puoi cambiare. Nei neumi con le note una sopra l’altra (il pes, per esempio) si seleziona proprio la nota su cui fai clic.'),
      table([
        ['Clic', 'seleziona una nota'],
        [kbd('Maiusc', 'clic'), 'seleziona tutte le note dalla prima scelta fino a questa'],
        [kbd('Ctrl', 'clic'), 'aggiunge o toglie una nota dalla selezione (sul Mac ⌘ + clic)'],
        ['Doppio clic', 'seleziona tutto il neuma (anche con il pulsante «Neuma»)'],
        [kbd('←'), 'nota precedente'],
        [kbd('→'), 'nota seguente'],
        [kbd('Maiusc', '← →'), 'allarga la selezione'],
        [kbd('Esc'), 'toglie la selezione'],
      ]),
      p('Con più note selezionate, ogni modifica vale per tutte: puoi spostare di un grado un pes intero o mettere la mora a più note in un colpo. Un pulsante appare attivo solo se vale per tutte le note selezionate.')),

    section('nota', 'La scheda «Nota»',
      p('Le frecce ▲ ▼ (o i tasti ↑ ↓) alzano e abbassano le note selezionate di un grado; accanto c’è il nome della nota secondo la chiave.'),
      h('h3', { class: 'guide-sub' }, 'Forma'),
      options([
        ['punctum', 'Punctum', 'la nota quadrata normale.'],
        ['virga', 'Virga', 'nota con il gambo a destra.'],
        ['inclinatum', 'Rombo', 'punctum inclinatum, le note a losanga nelle discese.'],
        ['quilisma', 'Quilisma', 'la nota dentellata, «a zig zag».'],
        ['oriscus', 'Oriscus', 'la nota ondulata.'],
        ['stropha', 'Stropha', 'la nota con la piccola coda, ripetuta nelle bistrophae e tristrophae.'],
        ['cavum', 'Cavum', 'nota vuota (rara).'],
      ]),
      h('h3', { class: 'guide-sub' }, 'Liquescenza'),
      options([
        ['liq-none', 'Nessuna', 'nota normale.'],
        ['liq-deminutus', 'Deminutus', 'l’ultima nota di un neuma più piccola (il segno ~).'],
        ['liq-ascendente', 'Ascendente', 'liquescente verso l’alto, come nell’epiphonus.'],
        ['liq-discendente', 'Discendente', 'liquescente verso il basso, come nel cephalicus.'],
      ]),
      h('h3', { class: 'guide-sub' }, 'Alterazione'),
      options([
        ['acc-nessuna', 'Nessuna', 'nessun segno prima della nota.'],
        ['acc-x', 'Bemolle', 'il bemolle prima della nota (di solito sul si). Vale fino alla fine della parola o alla prossima stanghetta.'],
        ['acc-y', 'Bequadro', 'annulla un bemolle precedente.'],
      ]),
      p('Se sposti una nota che ha il bemolle, il bemolle si sposta con lei. Il si bemolle in chiave si sceglie invece nella scheda «Brano» (chiave «Do♭»).'),
      h('h3', { class: 'guide-sub' }, 'Segni'),
      options([
        ['mora', 'Mora', 'il punto dopo la nota (raddoppia la durata).'],
        ['episema', 'Episema', 'la lineetta orizzontale sopra la nota.'],
        ['ictus', 'Ictus', 'la lineetta verticale sotto la nota.'],
        ['debilis', 'Debilis', 'initio debilis: la prima nota del neuma più piccola.'],
      ]),
      h('h3', { class: 'guide-sub' }, 'Con la nota seguente'),
      p('Dice quanto la nota è vicina alla successiva nella stessa sillaba: «Unita» le lega nello stesso neuma (un pes, una clivis…), «Vicina», «Staccata» e «Separata» lasciano spazi sempre più grandi.'),
      options([
        ['unita', 'Unita', 'stesso neuma.'],
        ['vicina', 'Vicina', 'un piccolo spazio.'],
        ['staccata', 'Staccata', 'uno spazio medio.'],
        ['separata', 'Separata', 'neumi distinti.'],
      ]),
      h('h3', { class: 'guide-sub' }, 'Aggiungere ed eliminare'),
      p('«+ Unita» aggiunge una nota subito dopo, nello stesso neuma; «+ Staccata» la aggiunge un po’ più in là. La nuova nota nasce alla stessa altezza: poi la sposti con ▲ ▼. «Elimina» (o il tasto Canc) toglie le note selezionate; ogni sillaba però deve tenerne almeno una.')),

    section('sillaba', 'La scheda «Sillaba»',
      p('Riguarda la sillaba della nota selezionata (sottolineata in alto nel pannello).'),
      h('ul', {},
        h('li', {}, h('strong', {}, 'Testo'), ': correggi la sillaba e premi Invio.'),
        h('li', {}, h('strong', {}, 'Divisione dopo la sillaba'), ': le stanghette tra le frasi.')),
      options([
        ['bar-`', 'Virgula', 'un respiro breve.'],
        ['bar-,', 'Quarto', 'la divisione minima (quarto di stanghetta).'],
        ['bar-;', 'Mezza', 'mezza stanghetta.'],
        ['bar-:', 'Intera', 'stanghetta intera, fine di frase.'],
        ['bar-::', 'Doppia', 'doppia stanghetta, fine del canto o di una strofa.'],
      ]),
      p('«+ Sillaba» aggiunge una sillaba nella stessa parola, «+ Parola» una parola nuova; «Elimina» toglie la sillaba con le sue note.')),

    section('brano', 'La scheda «Brano»',
      p('Qui ci sono la chiave iniziale e il modo (il numero romano all’inizio dello spartito). C’è anche il codice GABC, per chi lo conosce: si può modificare direttamente e applicare. Non è necessario usarlo.')),

    section('ascolto', 'Ascoltare e confrontare',
      p('Sotto lo spartito, «Ascolta» suona la melodia così com’è adesso, con le tue correzioni: è un buon controllo a orecchio. Le sillabe che hai cambiato sono evidenziate in giallo; aprendo «Com’è ora sul sito» vedi lo spartito originale per confrontarlo.')),

    section('invio', 'Salvare e inviare',
      h('ul', {},
        h('li', {}, h('strong', {}, 'Salva'), ' (in cima al pannello, o ', kbd('Ctrl', 'S'), ') conserva il lavoro come bozza: puoi riprenderlo più tardi, anche da un altro computer.'),
        h('li', {}, h('strong', {}, '↶ ↷'), ' annullano e ripetono le ultime modifiche (', kbd('Ctrl', 'Z'), ').'),
        h('li', {}, h('strong', {}, 'Invia per l’approvazione'), ' (in fondo alla pagina) chiude il tuo lavoro sul canto. Se non c’era niente da correggere il pulsante diventa «Conforme al libretto: invia»: anche questo conta come rivisto.'),
        h('li', {}, 'Nel riquadro delle note scrivi che cosa hai cambiato o i dubbi (per esempio «a p. 12 la terza nota è un la, non un sol»). «Solo commento» aggiunge una nota senza cambiare lo stato.')),
      p('Se esci dalla pagina con modifiche non salvate, il sito te lo chiede prima. Se due persone salvano lo stesso canto nello stesso momento, la seconda riceve un avviso e deve ricaricare la pagina.')),

    section('tastiera', 'Tastiera',
      table([
        [kbd('←'), 'nota precedente'],
        [kbd('→'), 'nota seguente'],
        [kbd('Maiusc', '← →'), 'allarga la selezione'],
        [kbd('↑'), 'alza le note selezionate'],
        [kbd('↓'), 'abbassa le note selezionate'],
        [kbd('Canc'), 'elimina le note selezionate'],
        [kbd('Ctrl', 'Z'), 'annulla'],
        [kbd('Ctrl', 'Maiusc', 'Z'), 'ripeti (anche Ctrl + Y)'],
        [kbd('Ctrl', 'S'), 'salva la bozza'],
        [kbd('Esc'), 'toglie la selezione'],
      ]),
      p('Sul Mac, al posto di Ctrl si può usare ⌘.')),

    admin ? section('admin', 'Per l’amministratore',
      h('ul', {},
        h('li', {}, 'Il filtro «Da approvare» mostra i canti inviati. Aprendone uno vedi la storia, i commenti, le sillabe cambiate e «Com’è ora sul sito».'),
        h('li', {}, h('strong', {}, 'Approva'), ' chiude il canto; ', h('strong', {}, 'Rimanda al revisore'), ' lo restituisce con la nota che scrivi nel riquadro (obbligatoria); ', h('strong', {}, 'Riapri'), ' rimette in revisione un canto approvato. Puoi anche correggere tu e approvare direttamente.'),
        h('li', {}, 'In «Revisori ed esportazione» crei gli utenti, imposti le password e scarichi le correzioni approvate; poi ', h('code', {}, 'node gabc/tools/applica-revisioni.mjs file.json'), ' le scrive nel repository. Dopo commit e pubblicazione, il canto risulta «sul sito».'))) : null,

    h('section', { class: 'guide-section guide-replay' },
      p('Vuoi rivedere la presentazione iniziale?'), replay));
}
