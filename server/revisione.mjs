#!/usr/bin/env node
// Clivis — servizio della revisione degli spartiti.
//
// Un piccolo server Node senza dipendenze che sta accanto al sito (nginx gli
// passa /api/): accesso dei revisori con password, stato di ogni canto e
// correzioni proposte. Non scrive mai nei file del sito: le correzioni
// approvate si esportano e si applicano al repository (vedi README).
//
// Variabili d'ambiente:
//   PORTA                  porta di ascolto (3000)
//   DATI                   cartella dei dati, scrivibile (/dati)
//   SITO                   cartella del sito pubblicato, in sola lettura (/sito)
//   CLIVIS_ADMIN           nome dell'amministratore creato al primo avvio (andrea)
//   CLIVIS_ADMIN_PASSWORD  la sua password: serve solo finché non esistono utenti
//
// Comandi:
//   node revisione.mjs                         avvia il servizio
//   node revisione.mjs utente NOME [--admin]   crea un utente o ne cambia la password
//                                              (la password si scrive quando viene chiesta)

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const SESSIONE_GIORNI = 30;
const COOKIE = 'clivis_revisione';
const MAX_CORPO = 1024 * 1024;

export const STATI = ['da-rivedere', 'in-corso', 'inviato', 'rimandato', 'approvato'];

const sha = (s) => createHash('sha256').update(s).digest('hex');
const ora = () => new Date().toISOString();

class Errore extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// --- archivio su file ------------------------------------------------------------

function scriviJson(file, dati) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(dati, null, 2) + '\n');
  renameSync(tmp, file);
}

const leggiJson = (file, base) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : base);

export function apriArchivio({ dati, sito }) {
  mkdirSync(join(dati, 'revisioni'), { recursive: true });
  const fileUtenti = join(dati, 'utenti.json');
  const fileSegreto = join(dati, 'segreto');
  if (!existsSync(fileSegreto)) writeFileSync(fileSegreto, randomBytes(32).toString('hex'), { mode: 0o600 });
  const segreto = readFileSync(fileSegreto, 'utf8').trim();

  // -- utenti
  const utenti = () => leggiJson(fileUtenti, { utenti: [] }).utenti;
  const salvaUtenti = (lista) => scriviJson(fileUtenti, { utenti: lista });

  function impostaUtente({ nome, nomeVisibile, password, ruolo }) {
    nome = String(nome ?? '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,32}$/.test(nome)) throw new Errore(400, 'Il nome utente può avere solo lettere minuscole, cifre, punto, trattino (2-32 caratteri).');
    const lista = utenti();
    let u = lista.find((x) => x.nome === nome);
    if (!u) {
      if (!password) throw new Errore(400, 'Serve una password.');
      u = { nome, nomeVisibile: nome, ruolo: 'revisore', creato: ora() };
      lista.push(u);
    }
    if (nomeVisibile !== undefined) u.nomeVisibile = String(nomeVisibile).trim().slice(0, 60) || nome;
    if (ruolo !== undefined) {
      if (ruolo !== 'admin' && ruolo !== 'revisore') throw new Errore(400, 'Ruolo sconosciuto.');
      u.ruolo = ruolo;
    }
    if (password) {
      if (String(password).length < 8) throw new Errore(400, 'La password deve avere almeno 8 caratteri.');
      u.sale = randomBytes(16).toString('hex');
      u.hash = scryptSync(String(password), u.sale, 64).toString('hex');
    }
    if (!lista.some((x) => x.ruolo === 'admin')) throw new Errore(400, 'Deve restare almeno un amministratore.');
    salvaUtenti(lista);
    return pubblico(u);
  }

  function eliminaUtente(nome) {
    const lista = utenti().filter((x) => x.nome !== nome);
    if (!lista.some((x) => x.ruolo === 'admin')) throw new Errore(400, 'Deve restare almeno un amministratore.');
    salvaUtenti(lista);
  }

  function verifica(nome, password) {
    const u = utenti().find((x) => x.nome === String(nome ?? '').trim().toLowerCase());
    // stesso lavoro anche per un utente che non esiste
    const sale = u?.sale ?? '00';
    const atteso = Buffer.from(u?.hash ?? '0'.repeat(128), 'hex');
    const dato = scryptSync(String(password ?? ''), sale, 64);
    return u && timingSafeEqual(atteso, dato) ? u : null;
  }

  // -- sessioni: nome.scadenza.firma (la firma cambia con la password)
  const firma = (nome, scade, hash) => createHmac('sha256', segreto).update(`${nome}.${scade}.${hash}`).digest('hex');

  function creaSessione(u) {
    const scade = Date.now() + SESSIONE_GIORNI * 864e5;
    return `${u.nome}.${scade}.${firma(u.nome, scade, u.hash)}`;
  }

  function leggiSessione(valore) {
    const [nome, scade, f] = String(valore ?? '').split('.');
    if (!nome || !scade || !f || Number(scade) < Date.now()) return null;
    const u = utenti().find((x) => x.nome === nome);
    if (!u) return null;
    const atteso = Buffer.from(firma(nome, scade, u.hash));
    const dato = Buffer.from(f);
    return atteso.length === dato.length && timingSafeEqual(atteso, dato) ? u : null;
  }

  // -- canti del sito: uno per file gabc
  let indice = null;
  let indiceMtime = 0;
  function canti() {
    const file = join(sito, 'gabc', 'index.json');
    const m = statSync(file).mtimeMs;
    if (!indice || m !== indiceMtime) {
      indice = new Map();
      for (const e of JSON.parse(readFileSync(file, 'utf8'))) {
        if (!e.file || e.status !== 'found') continue;
        const key = basename(e.file).replace(/\.gabc$/, '');
        if (!indice.has(key)) indice.set(key, e.file);
      }
      indiceMtime = m;
    }
    return indice;
  }

  function fileDelCanto(key) {
    const file = canti().get(key);
    if (!file) throw new Errore(404, 'Canto sconosciuto.');
    return file;
  }

  const testoSito = (key) => readFileSync(join(sito, fileDelCanto(key)), 'utf8');

  const fileRevisione = (key) => join(dati, 'revisioni', `${key}.json`);

  function revisione(key) {
    const file = fileDelCanto(key);
    return leggiJson(fileRevisione(key), {
      key, file, stato: 'da-rivedere', versione: 0, gabc: null, originale: null,
      aggiornato: null, da: null, storia: [], commenti: [],
    });
  }

  function riassunto(r, sito) {
    const proposta = r.gabc !== null && r.gabc !== undefined;
    return {
      stato: r.stato,
      versione: r.versione,
      aggiornato: r.aggiornato,
      da: r.da,
      // la proposta è diversa dal file del sito di adesso
      diverso: proposta && r.gabc !== sito,
      // approvata con modifiche, e il sito ha già il testo approvato
      applicato: r.stato === 'approvato' && !!r.cambiato && proposta && r.gabc === sito,
      cambiato: !!r.cambiato,
      commenti: r.commenti.length,
    };
  }

  function elenco() {
    const out = {};
    for (const key of canti().keys()) {
      if (!existsSync(fileRevisione(key))) continue;
      out[key] = riassunto(revisione(key), testoSito(key));
    }
    return out;
  }

  const AZIONI = {
    salva: { stato: (r) => (r.stato === 'inviato' ? 'inviato' : 'in-corso') },
    invia: { stato: () => 'inviato' },
    commenta: { stato: (r) => r.stato },
    approva: { admin: true, stato: () => 'approvato' },
    rimanda: { admin: true, stato: () => 'rimandato', commento: true },
    riapri: { admin: true, stato: () => 'in-corso' },
  };

  function aggiorna(key, utente, { azione, versione, gabc, commento }) {
    const a = AZIONI[azione];
    if (!a) throw new Errore(400, 'Azione sconosciuta.');
    const admin = utente.ruolo === 'admin';
    if (a.admin && !admin) throw new Errore(403, 'Solo l’amministratore può farlo.');
    const r = revisione(key);
    if (Number(versione) !== r.versione) {
      throw new Errore(409, `Questo canto è stato modificato nel frattempo${r.da ? ` da ${nomeDi(r.da)}` : ''}: ricarica la pagina.`);
    }
    if (r.stato === 'approvato' && !admin && azione !== 'commenta') throw new Errore(409, 'Questo canto è già approvato.');
    const testo = String(commento ?? '').trim().slice(0, 4000);
    if (a.commento && !testo) throw new Errore(400, 'Scrivi che cosa va rivisto.');

    const sitoOra = testoSito(key);
    if (r.originale === null) r.originale = sitoOra;
    if (gabc !== undefined && azione !== 'commenta') {
      if (gabc !== null && (typeof gabc !== 'string' || !gabc.includes('%%') || gabc.length > 200_000)) throw new Errore(400, 'Spartito non valido.');
      r.gabc = gabc === sitoOra ? null : gabc;
    }
    if (azione === 'approva') r.cambiato = r.gabc !== null && r.gabc !== sitoOra;
    if (azione === 'riapri' || azione === 'rimanda') r.cambiato = false;
    const prima = r.stato;
    r.stato = a.stato(r);
    r.versione += 1;
    r.aggiornato = ora();
    r.da = utente.nome;
    r.storia.push({ quando: r.aggiornato, chi: utente.nome, azione, da: prima, a: r.stato });
    if (testo) r.commenti.push({ quando: r.aggiornato, chi: utente.nome, testo });
    scriviJson(fileRevisione(key), r);
    return { ...r, riassunto: riassunto(r, sitoOra) };
  }

  function nomeDi(nome) {
    return utenti().find((x) => x.nome === nome)?.nomeVisibile ?? nome;
  }

  /** Correzioni approvate che il sito non ha ancora. */
  function esporta() {
    const out = [];
    for (const f of readdirSync(join(dati, 'revisioni'))) {
      if (!f.endsWith('.json')) continue;
      const r = leggiJson(join(dati, 'revisioni', f), null);
      if (!r || r.stato !== 'approvato' || r.gabc === null || !canti().has(r.key)) continue;
      if (r.gabc === testoSito(r.key)) continue;
      out.push({ key: r.key, file: r.file, gabc: r.gabc, approvato: r.aggiornato });
    }
    return out;
  }

  return {
    utenti, impostaUtente, eliminaUtente, verifica, creaSessione, leggiSessione,
    revisione, elenco, aggiorna, esporta, nomeDi, testoSito,
  };
}

const pubblico = (u) => ({ nome: u.nome, nomeVisibile: u.nomeVisibile, ruolo: u.ruolo });

// --- HTTP ----------------------------------------------------------------------------

function cookie(req, nome) {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

function leggiCorpo(req) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const parti = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > MAX_CORPO) { reject(new Errore(413, 'Richiesta troppo grande.')); req.destroy(); return; }
      parti.push(c);
    });
    req.on('end', () => {
      if (n === 0) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(parti).toString('utf8'))); } catch { reject(new Errore(400, 'JSON non valido.')); }
    });
    req.on('error', reject);
  });
}

export function creaServizio(arch) {
  // tentativi di accesso sbagliati: al massimo 10 ogni 15 minuti per indirizzo
  const tentativi = new Map();
  const ip = (req) => String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '');

  function limita(req) {
    const k = ip(req);
    const t = tentativi.get(k);
    if (t && t.fino > Date.now() && t.n >= 10) throw new Errore(429, 'Troppi tentativi: riprova tra qualche minuto.');
  }
  function sbagliato(req) {
    const k = ip(req);
    const t = tentativi.get(k);
    if (!t || t.fino < Date.now()) tentativi.set(k, { n: 1, fino: Date.now() + 15 * 60e3 });
    else t.n++;
  }

  return async function gestisci(req, res) {
    const invia = (status, dati, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
      res.end(JSON.stringify(dati));
    };
    try {
      const url = new URL(req.url, 'http://x');
      const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
      const metodo = req.method ?? 'GET';

      // le richieste che cambiano qualcosa arrivano solo dalla pagina (difesa CSRF)
      if (metodo !== 'GET' && req.headers['x-clivis'] !== '1') throw new Errore(403, 'Richiesta non permessa.');

      const sicuro = req.headers['x-forwarded-proto'] === 'https';
      const cookieSessione = (valore, eta) =>
        `${COOKIE}=${valore}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${eta}${sicuro ? '; Secure' : ''}`;

      if (path === '/accesso' && metodo === 'POST') {
        limita(req);
        const { nome, password } = await leggiCorpo(req);
        const u = arch.verifica(nome, password);
        if (!u) { sbagliato(req); throw new Errore(401, 'Nome o password non corretti.'); }
        return invia(200, pubblico(u), { 'Set-Cookie': cookieSessione(arch.creaSessione(u), SESSIONE_GIORNI * 86400) });
      }
      if (path === '/uscita' && metodo === 'POST') {
        return invia(200, {}, { 'Set-Cookie': cookieSessione('', 0) });
      }

      const utente = arch.leggiSessione(cookie(req, COOKIE));
      if (!utente) throw new Errore(401, 'Accedi per continuare.');
      const admin = utente.ruolo === 'admin';
      const soloAdmin = () => { if (!admin) throw new Errore(403, 'Solo l’amministratore può farlo.'); };

      if (path === '/io' && metodo === 'GET') return invia(200, pubblico(utente));
      if (path === '/io/password' && metodo === 'POST') {
        const { attuale, nuova } = await leggiCorpo(req);
        if (!arch.verifica(utente.nome, attuale)) throw new Errore(400, 'La password attuale non è corretta.');
        const u = arch.impostaUtente({ nome: utente.nome, password: nuova });
        const fresco = arch.utenti().find((x) => x.nome === u.nome);
        return invia(200, u, { 'Set-Cookie': cookieSessione(arch.creaSessione(fresco), SESSIONE_GIORNI * 86400) });
      }

      if (path === '/canti' && metodo === 'GET') {
        const nomi = Object.fromEntries(arch.utenti().map((u) => [u.nome, u.nomeVisibile]));
        return invia(200, { canti: arch.elenco(), nomi });
      }
      const mCanto = /^\/canti\/([A-Za-z0-9._-]+)$/.exec(path);
      if (mCanto && metodo === 'GET') {
        const r = arch.revisione(mCanto[1]);
        const nomi = Object.fromEntries(arch.utenti().map((u) => [u.nome, u.nomeVisibile]));
        return invia(200, { ...r, sito: arch.testoSito(mCanto[1]), nomi });
      }
      if (mCanto && metodo === 'PUT') {
        const corpo = await leggiCorpo(req);
        const r = arch.aggiorna(mCanto[1], utente, corpo);
        return invia(200, { ...r, sito: arch.testoSito(mCanto[1]) });
      }

      if (path === '/esporta' && metodo === 'GET') {
        soloAdmin();
        return invia(200, { esportato: new Date().toISOString(), correzioni: arch.esporta() });
      }

      if (path === '/utenti' && metodo === 'GET') {
        soloAdmin();
        return invia(200, arch.utenti().map(pubblico));
      }
      if (path === '/utenti' && metodo === 'POST') {
        soloAdmin();
        const corpo = await leggiCorpo(req);
        if (arch.utenti().some((u) => u.nome === String(corpo.nome ?? '').trim().toLowerCase())) throw new Errore(409, 'Esiste già un utente con questo nome.');
        return invia(201, arch.impostaUtente(corpo));
      }
      const mUtente = /^\/utenti\/([a-z0-9._-]+)$/.exec(path);
      if (mUtente && metodo === 'PUT') {
        soloAdmin();
        if (!arch.utenti().some((u) => u.nome === mUtente[1])) throw new Errore(404, 'Utente sconosciuto.');
        const { nomeVisibile, password, ruolo } = await leggiCorpo(req);
        return invia(200, arch.impostaUtente({ nome: mUtente[1], nomeVisibile, password, ruolo }));
      }
      if (mUtente && metodo === 'DELETE') {
        soloAdmin();
        if (mUtente[1] === utente.nome) throw new Errore(400, 'Non puoi eliminare te stesso.');
        arch.eliminaUtente(mUtente[1]);
        return invia(200, {});
      }

      throw new Errore(404, 'Non trovato.');
    } catch (err) {
      const status = err instanceof Errore ? err.status : 500;
      if (status === 500) console.error(err);
      invia(status, { errore: status === 500 ? 'Errore del server.' : err.message });
    }
  };
}

// --- avvio ---------------------------------------------------------------------------

function chiedi(domanda) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(domanda, (r) => { rl.close(); resolve(r); }));
}

async function main() {
  const dati = process.env.DATI ?? '/dati';
  const sito = process.env.SITO ?? '/sito';
  if (!existsSync(join(sito, 'gabc', 'index.json'))) {
    console.error(`Non trovo ${join(sito, 'gabc', 'index.json')}: SITO deve essere la cartella del sito pubblicato (o la radice del repository).`);
    process.exit(1);
  }
  const arch = apriArchivio({ dati, sito });
  const [comando, nome, ...opz] = process.argv.slice(2);

  if (comando === 'utente') {
    if (!nome) { console.error('uso: node revisione.mjs utente NOME [--admin]'); process.exit(1); }
    const password = process.env.PASSWORD ?? await chiedi(`Password per ${nome}: `);
    const esiste = arch.utenti().some((u) => u.nome === nome);
    const u = arch.impostaUtente({ nome, password, ruolo: opz.includes('--admin') ? 'admin' : esiste ? undefined : 'revisore' });
    console.log(`${esiste ? 'Aggiornato' : 'Creato'}: ${u.nome} (${u.ruolo})`);
    return;
  }

  if (arch.utenti().length === 0) {
    const pw = process.env.CLIVIS_ADMIN_PASSWORD;
    if (!pw) console.warn('Nessun utente: imposta CLIVIS_ADMIN_PASSWORD oppure usa «node revisione.mjs utente NOME --admin».');
    else {
      const u = arch.impostaUtente({ nome: process.env.CLIVIS_ADMIN ?? 'andrea', password: pw, ruolo: 'admin' });
      console.log(`Creato l’amministratore ${u.nome}.`);
    }
  }

  const porta = Number(process.env.PORTA ?? 3000);
  createServer(creaServizio(arch)).listen(porta, () => console.log(`Revisione Clivis in ascolto sulla porta ${porta}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
