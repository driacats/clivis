import 'exsurge';
import '../fonts/fonts.css';
import '../style.css';
import { setupThemeToggle } from '../theme';
import { h, notice } from '../ui/dom';
import { renderAccount, renderLogin, renderUsers } from './account';
import { api, ApiError, type Riassunto, type Utente } from './api';
import { loadCatalog, type Canto } from './catalog';
import { renderEditor, type EditorPage } from './editor';
import { renderGuide } from './guide';
import { filtroSalvato, passa, renderList } from './list';
import { startTour, stopTour, tourSeen, type TourStep } from './tour';
import { backToList, errorMessage } from './ui';

// Routes: #/ the list · #/canto/<file> one chant · #/account own password · #/utenti reviewers (admin)

const app = document.getElementById('app')!;
const userbar = document.getElementById('userbar')!;
let me: Utente | null = null;
let catalogo: Canto[] | null = null;
let stati: Record<string, Riassunto> = {};
let nomi: Record<string, string> = {};
let editor: EditorPage | null = null;
let currentHash = location.hash;

function show(title: string, el: Node, scroll = true): void {
  editor?.dispose();
  editor = null;
  stopTour();
  document.body.classList.remove('ed-mode');
  document.title = `${title} · Revisione · Clivis`;
  app.replaceChildren(el);
  if (scroll) window.scrollTo({ top: 0 });
}

function renderUserbar(): void {
  if (!me) { userbar.replaceChildren(); userbar.hidden = true; return; }
  const out = h('button', { type: 'button', class: 'link-button' }, 'Esci');
  out.addEventListener('click', async () => {
    if (editor?.dirty() && !confirm('Ci sono modifiche non salvate. Uscire lo stesso?')) return;
    await api.esci().catch(() => undefined);
    me = null;
    route();
  });
  userbar.hidden = false;
  userbar.replaceChildren(h('div', { class: 'rev-userbar__inner' },
    h('a', { href: '#/', class: 'rev-userbar__home' }, 'Revisione degli spartiti'),
    h('span', { class: 'rev-userbar__right' },
      h('a', { href: '#/guida', class: 'rev-userbar__guide' }, 'Guida'),
      h('a', { href: '#/account', title: 'Il tuo account' }, me.nomeVisibile),
      me.ruolo === 'admin' ? h('a', { href: '#/utenti' }, 'Revisori ed esportazione') : null,
      out)));
}

async function refreshStati(): Promise<void> {
  const r = await api.canti();
  stati = r.canti;
  nomi = r.nomi;
}

async function route(): Promise<void> {
  renderUserbar();
  if (!me) {
    show('Accesso', renderLogin((u) => { me = u; route(); }));
    return;
  }
  const path = location.hash.replace(/^#\/?/, '');
  try {
    catalogo ??= await loadCatalog();
    if (path === 'account') return show('Account', renderAccount(me));
    const g = /^guida(?:\/(.+))?$/.exec(path);
    if (g) {
      show('Guida', renderGuide(me));
      if (g[1]) document.getElementById(g[1])?.scrollIntoView();
      return;
    }
    if (path === 'utenti' && me.ruolo === 'admin') return show('Revisori', renderUsers(me));

    const m = /^canto\/(.+)$/.exec(path);
    if (m) {
      const key = decodeURIComponent(m[1]);
      const i = catalogo.findIndex((c) => c.key === key);
      if (i < 0) return show('Canto sconosciuto', h('main', { class: 'rev-wrap' }, notice('Questo canto non è nel breviario.', 'error'), backToList()));
      const [rev] = await Promise.all([api.canto(key), refreshStati()]);
      // previous / next within the chants the list is showing
      const f = filtroSalvato();
      const visibili = catalogo.filter((c) => c.key === key || passa(c, stati[c.key], f, me!));
      const j = visibili.findIndex((c) => c.key === key);
      const page = renderEditor(catalogo[i], rev, me, { prev: visibili[j - 1], next: visibili[j + 1] }, () => { refreshStati().catch(() => undefined); });
      show(catalogo[i].incipit, page.el);
      // the editor fills the window: no footer under it, so the tools pane reaches the bottom
      document.body.classList.add('ed-mode');
      editor = page;
      // the first time: a short tour of the editor, once the score is drawn
      if (!tourSeen('editor')) page.el.addEventListener('chant-rendered', () => setTimeout(() => { if (editor === page) startTour('editor', EDITOR_TOUR); }, TOUR_DELAY_MS), { once: true });
      return;
    }

    await refreshStati();
    const y = path === '' ? listScroll : 0;
    show('Canti', renderList(catalogo, stati, nomi, me));
    if (y) window.scrollTo({ top: y });
    if (!tourSeen('elenco')) setTimeout(() => startTour('elenco', LIST_TOUR), TOUR_DELAY_MS);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return;
    show('Errore', h('main', { class: 'rev-wrap' }, notice(`Qualcosa non ha funzionato: ${errorMessage(e)}`, 'error')));
  }
}

// first-visit tours (the guide can show them again), started once the page has settled
const TOUR_DELAY_MS = 300;

const LIST_TOUR: TourStep[] = [
  { title: 'Benvenuto nella revisione di Clivis', text: 'Qui si controllano le melodie del breviario confrontandole con il libretto, e si correggono se serve. In un minuto ti mostro come funziona.' },
  { target: '.rev-progress', title: 'A che punto siamo', text: 'Quanti canti sono già approvati e quanti sono stati rivisti. Ogni colore è uno stato: da rivedere, in revisione, da approvare, da correggere, approvato.' },
  { target: '.rev-toolbar', title: 'Trovare i canti', text: 'Filtra per stato o per sezione del libretto, oppure cerca un incipit, un giorno o una pagina. Il filtro resta quando torni qui.' },
  { target: '.rev-row', title: 'Aprire un canto', text: 'Ogni riga è un canto, con la pagina del libretto e il suo stato. Aprine uno per cominciare: lì ti mostro l’editor.' },
  { target: '.rev-userbar__guide', title: 'La guida', text: 'Qui trovi la spiegazione di tutti i comandi, quando ti serve.' },
];

const EDITOR_TOUR: TourStep[] = [
  { target: '.ed-score', title: 'Lo spartito', text: 'Confrontalo con il libretto. Fai clic su una nota per selezionarla: Maiusc + clic seleziona fino a un’altra nota, Ctrl (⌘) + clic ne aggiunge una, il doppio clic prende tutto il neuma.' },
  { target: '.ed-tabs', title: 'Gli strumenti', text: '«Nota» cambia altezza, forma, liquescenza e segni delle note selezionate; «Sillaba» il testo e le stanghette; «Brano» chiave e modo. Con le frecce ↑ ↓ alzi e abbassi le note.' },
  { target: '.ed-panel__head', title: 'Annulla e salva', text: 'Le frecce curve annullano e ripetono. «Salva» conserva il lavoro come bozza: puoi riprenderlo quando vuoi.' },
  { target: '.ed-player', title: 'Ascolta', text: 'Suona la melodia con le tue correzioni. Le sillabe cambiate sono evidenziate in giallo, e «Com’è ora sul sito» mostra lo spartito originale.' },
  { target: '.ed-review', title: 'Invia', text: 'Quando hai finito, scrivi che cosa hai cambiato e invia per l’approvazione. Se era già tutto giusto, invialo comunque: conta come rivisto.' },
  { title: 'Buon lavoro!', text: 'Tutti i comandi sono spiegati nella Guida, in alto. Puoi rivedere questa presentazione da lì.' },
];

// back to the list where it was left
let listScroll = 0;

window.addEventListener('hashchange', () => {
  if (editor?.dirty() && !confirm('Ci sono modifiche non salvate a questo canto. Lasciarle?')) {
    history.replaceState(null, '', currentHash || '#/');
    return;
  }
  const leaving = currentHash.replace(/^#\/?/, '');
  if (leaving === '') listScroll = window.scrollY;
  currentHash = location.hash;
  route();
});

// session expired or logged out elsewhere
window.addEventListener('revisione:uscita', () => {
  if (!me) return;
  me = null;
  route();
});

setupThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);

api.io()
  .then((u) => { me = u; })
  .catch(() => { me = null; })
  .finally(() => route());
