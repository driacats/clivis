// Login, own password, reviewers (admin) and the export of approved corrections.
import { downloadBlob, h, notice } from '../ui/dom';
import { api, ApiError, type Ruolo, type Utente } from './api';
import { backToList, errorMessage } from './ui';

function form(onSubmit: (data: FormData, msg: HTMLElement, btn: HTMLButtonElement) => Promise<void>, ...fields: Node[]): HTMLFormElement {
  const msg = h('div', { class: 'rev-form__msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'ed-button ed-button--primary' }, 'Invia');
  const f = h('form', { class: 'rev-form' }, ...fields, msg, h('div', { class: 'ed-actions' }, btn));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.replaceChildren();
    btn.disabled = true;
    try { await onSubmit(new FormData(f), msg, btn); } catch (e) { msg.replaceChildren(notice(errorMessage(e), 'error')); } finally { btn.disabled = false; }
  });
  return f;
}

/** Minimum length of a password, as required by the service (server/revisione.mjs). */
const MIN_PASSWORD = 8;

const field = (label: string, input: HTMLElement) => h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label' }, label), input);
const input = (name: string, type = 'text', attrs: Record<string, string | boolean> = {}) =>
  h('input', { class: 'ed-input', name, type, required: true, ...attrs });

export function renderLogin(onLogin: (u: Utente) => void): HTMLElement {
  const f = form(async (d) => {
    const u = await api.accedi(String(d.get('nome')), String(d.get('password')));
    onLogin(u);
  },
  field('Nome utente', input('nome', 'text', { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' })),
  field('Password', input('password', 'password', { autocomplete: 'current-password' })));
  f.querySelector('button')!.textContent = 'Entra';
  return h('main', { class: 'rev-wrap rev-login' },
    h('div', { class: 'rev-card' },
      h('h1', { class: 'rev-title' }, 'Revisione degli spartiti'),
      h('p', { class: 'rev-intro' }, 'Area riservata a chi controlla e corregge le melodie del breviario. Le credenziali te le dà Andrea.'),
      f),
    h('p', { class: 'rev-login__back' }, h('a', { href: './', class: 'back-link' }, '← Torna al breviario')));
}

export function renderAccount(me: Utente): HTMLElement {
  const f = form(async (d, msg) => {
    if (d.get('nuova') !== d.get('ripeti')) throw new ApiError(400, 'Le due password nuove non coincidono.');
    await api.cambiaPassword(String(d.get('attuale')), String(d.get('nuova')));
    (msg.closest('form') as HTMLFormElement).reset();
    msg.replaceChildren(notice('Password cambiata.'));
  },
  field('Password attuale', input('attuale', 'password', { autocomplete: 'current-password' })),
  field(`Nuova password (almeno ${MIN_PASSWORD} caratteri)`, input('nuova', 'password', { autocomplete: 'new-password', minlength: String(MIN_PASSWORD) })),
  field('Ripeti la nuova password', input('ripeti', 'password', { autocomplete: 'new-password', minlength: String(MIN_PASSWORD) })));
  f.querySelector('button')!.textContent = 'Cambia password';
  return h('main', { class: 'rev-wrap' },
    backToList(),
    h('h1', { class: 'rev-title' }, 'Il tuo account'),
    h('p', { class: 'rev-intro' }, `Sei entrato come ${me.nomeVisibile} (${me.nome}).`),
    h('section', { class: 'rev-card' }, h('h2', { class: 'rubric' }, 'Cambia password'), f));
}

export function renderUsers(me: Utente): HTMLElement {
  const list = h('div', {});
  const ROLE: Record<Ruolo, string> = { admin: 'Amministratore', revisore: 'Revisore' };

  async function load(): Promise<void> {
    try {
      const users = await api.utenti();
      list.replaceChildren(h('ul', { class: 'rev-users' }, ...users.map((u) => {
        const pw = h('input', { class: 'ed-input', type: 'password', placeholder: 'Nuova password', autocomplete: 'new-password', 'aria-label': `Nuova password per ${u.nome}` });
        const msg = h('span', { class: 'rev-users__msg', role: 'status' });
        const reset = h('button', { type: 'button', class: 'ed-button' }, 'Imposta password');
        reset.addEventListener('click', async () => {
          try { await api.modificaUtente(u.nome, { password: pw.value }); pw.value = ''; msg.textContent = 'Password impostata.'; } catch (e) { msg.textContent = errorMessage(e); }
        });
        const del = h('button', { type: 'button', class: 'ed-button ed-button--danger', disabled: u.nome === me.nome }, 'Elimina');
        del.addEventListener('click', async () => {
          if (!confirm(`Eliminare l’utente ${u.nomeVisibile}? Le sue revisioni restano.`)) return;
          try { await api.eliminaUtente(u.nome); load(); } catch (e) { msg.textContent = errorMessage(e); }
        });
        return h('li', { class: 'rev-users__item' },
          h('div', { class: 'rev-users__name' }, h('strong', {}, u.nomeVisibile), ` · ${u.nome} · ${ROLE[u.ruolo]}`),
          h('div', { class: 'ed-actions' }, pw, reset, del),
          msg);
      })));
    } catch (e) {
      list.replaceChildren(notice(errorMessage(e), 'error'));
    }
  }
  load();

  const add = form(async (d, msg, btn) => {
    await api.creaUtente({
      nome: String(d.get('nome')), nomeVisibile: String(d.get('nomeVisibile')),
      password: String(d.get('password')), ruolo: d.get('ruolo') === 'admin' ? 'admin' : 'revisore',
    });
    btn.closest('form')!.reset();
    msg.replaceChildren(notice('Utente creato: comunicagli nome e password.'));
    load();
  },
  h('div', { class: 'ed-row' },
    field('Nome utente', input('nome', 'text', { pattern: '[a-z0-9._\\-]{2,32}', autocapitalize: 'none', placeholder: 'es. mario.rossi' })),
    field('Nome e cognome', input('nomeVisibile', 'text', { placeholder: 'es. Mario Rossi' }))),
  h('div', { class: 'ed-row' },
    field(`Password (almeno ${MIN_PASSWORD} caratteri)`, input('password', 'text', { minlength: String(MIN_PASSWORD), autocomplete: 'off' })),
    field('Ruolo', h('select', { class: 'ed-input', name: 'ruolo' }, h('option', { value: 'revisore' }, 'Revisore'), h('option', { value: 'admin' }, 'Amministratore')))));
  add.querySelector('button')!.textContent = 'Aggiungi';

  return h('main', { class: 'rev-wrap' },
    backToList(),
    h('h1', { class: 'rev-title' }, 'Revisori'),
    h('p', { class: 'rev-intro' }, 'I revisori correggono e inviano; solo gli amministratori approvano, gestiscono gli utenti ed esportano le correzioni.'),
    list,
    h('section', { class: 'rev-card' }, h('h2', { class: 'rubric' }, 'Nuovo utente'), add),
    exportBox());
}

function exportBox(): HTMLElement {
  const msg = h('div', {});
  const btn = h('button', { type: 'button', class: 'ed-button ed-button--primary' }, 'Scarica le correzioni approvate');
  btn.addEventListener('click', async () => {
    try {
      const data = await api.esporta();
      if (data.correzioni.length === 0) { msg.replaceChildren(notice('Non ci sono correzioni approvate da portare sul sito.')); return; }
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `revisioni-${data.esportato.slice(0, 10)}.json`);
      msg.replaceChildren(notice(`${data.correzioni.length} correzioni esportate.`));
    } catch (e) {
      msg.replaceChildren(notice(errorMessage(e), 'error'));
    }
  });
  return h('section', { class: 'rev-card', id: 'esporta' },
    h('h2', { class: 'rubric' }, 'Portare le correzioni sul sito'),
    h('p', {}, 'Le correzioni approvate non cambiano subito il sito: scarica il file, poi applicalo al repository con ',
      h('code', {}, 'node gabc/tools/applica-revisioni.mjs revisioni-….json'), ' (o passalo a Claude), fai il commit e ripubblica il sito. Quando il sito ha il testo approvato, il canto risulta «sul sito».'),
    h('div', { class: 'ed-actions' }, btn),
    msg);
}
