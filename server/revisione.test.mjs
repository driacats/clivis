// node --test server/revisione.test.mjs
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { apriArchivio, creaServizio } from './revisione.mjs';

const base = mkdtempSync(join(tmpdir(), 'clivis-'));
const sito = join(base, 'sito');
mkdirSync(join(sito, 'gabc', 'chants'), { recursive: true });
const ORIGINALE = 'name:Prova;\nmode:1;\n%%\n(c4) A(f)men.(f) (::)\n';
writeFileSync(join(sito, 'gabc', 'chants', 'prova.gabc'), ORIGINALE);
writeFileSync(join(sito, 'gabc', 'index.json'), JSON.stringify([
  { id: 'x.1', status: 'found', file: 'gabc/chants/prova.gabc' },
  { id: 'x.2', status: 'found', file: 'gabc/chants/prova.gabc' },
]));

const arch = apriArchivio({ dati: join(base, 'dati'), sito });
arch.impostaUtente({ nome: 'andrea', password: 'password-admin', ruolo: 'admin' });
arch.impostaUtente({ nome: 'mario', password: 'password-mario', nomeVisibile: 'Mario Rossi' });

let server, url;
before(async () => {
  server = createServer(creaServizio(arch));
  await new Promise((r) => server.listen(0, r));
  url = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function call(path, { method = 'GET', body, cookie, csrf = true } = {}) {
  const res = await fetch(url + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-Clivis': '1' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

const login = async (nome, password) => (await call('/accesso', { method: 'POST', body: { nome, password } })).cookie;

test('accesso', async () => {
  assert.equal((await call('/canti')).status, 401);
  assert.equal((await call('/accesso', { method: 'POST', body: { nome: 'mario', password: 'sbagliata' } })).status, 401);
  assert.equal((await call('/accesso', { method: 'POST', body: { nome: 'mario', password: 'password-mario' }, csrf: false })).status, 403);
  const c = await login('mario', 'password-mario');
  const io = await call('/io', { cookie: c });
  assert.deepEqual(io.json, { nome: 'mario', nomeVisibile: 'Mario Rossi', ruolo: 'revisore' });
  assert.equal((await call('/io', { cookie: c.replace(/.$/, 'x') })).status, 401);
});

test('revisione di un canto', async () => {
  const mario = await login('mario', 'password-mario');
  const andrea = await login('andrea', 'password-admin');

  let r = await call('/canti/prova', { cookie: mario });
  assert.equal(r.json.stato, 'da-rivedere');
  assert.equal(r.json.sito, ORIGINALE);
  assert.equal((await call('/canti/..%2Futenti', { cookie: mario })).status, 404);
  assert.equal((await call('/canti/nessuno', { cookie: mario })).status, 404);

  const proposta = ORIGINALE.replace('A(f)', 'A(g)');
  r = await call('/canti/prova', { method: 'PUT', cookie: mario, body: { azione: 'salva', versione: 0, gabc: proposta } });
  assert.equal(r.json.stato, 'in-corso');
  assert.equal(r.json.riassunto.diverso, true);

  // versione vecchia: conflitto
  assert.equal((await call('/canti/prova', { method: 'PUT', cookie: mario, body: { azione: 'salva', versione: 0, gabc: proposta } })).status, 409);
  // il revisore non approva
  assert.equal((await call('/canti/prova', { method: 'PUT', cookie: mario, body: { azione: 'approva', versione: 1 } })).status, 403);

  r = await call('/canti/prova', { method: 'PUT', cookie: mario, body: { azione: 'invia', versione: 1, gabc: proposta, commento: 'Nota corretta a p. 3' } });
  assert.equal(r.json.stato, 'inviato');
  assert.equal(r.json.commenti.length, 1);

  assert.equal((await call('/canti/prova', { method: 'PUT', cookie: andrea, body: { azione: 'rimanda', versione: 2 } })).status, 400);
  r = await call('/canti/prova', { method: 'PUT', cookie: andrea, body: { azione: 'approva', versione: 2 } });
  assert.equal(r.json.stato, 'approvato');
  assert.equal(r.json.riassunto.cambiato, true);
  assert.equal(r.json.riassunto.applicato, false);

  const elenco = await call('/canti', { cookie: mario });
  assert.equal(elenco.json.canti.prova.stato, 'approvato');
  assert.equal(elenco.json.nomi.mario, 'Mario Rossi');

  assert.equal((await call('/esporta', { cookie: mario })).status, 403);
  const exp = await call('/esporta', { cookie: andrea });
  assert.equal(exp.json.correzioni.length, 1);
  assert.equal(exp.json.correzioni[0].gabc, proposta);

  // la correzione arriva sul sito: applicata, niente più da esportare
  writeFileSync(join(sito, 'gabc', 'chants', 'prova.gabc'), proposta);
  assert.equal((await call('/canti', { cookie: andrea })).json.canti.prova.applicato, true);
  assert.equal((await call('/esporta', { cookie: andrea })).json.correzioni.length, 0);

  // approvato: il revisore non lo modifica più
  assert.equal((await call('/canti/prova', { method: 'PUT', cookie: mario, body: { azione: 'salva', versione: 3, gabc: proposta } })).status, 409);
});

test('utenti', async () => {
  const andrea = await login('andrea', 'password-admin');
  const mario = await login('mario', 'password-mario');
  assert.equal((await call('/utenti', { cookie: mario })).status, 403);
  assert.equal((await call('/utenti', { method: 'POST', cookie: andrea, body: { nome: 'lucia', password: 'corta' } })).status, 400);
  assert.equal((await call('/utenti', { method: 'POST', cookie: andrea, body: { nome: 'lucia', password: 'password-lucia' } })).status, 201);
  assert.equal((await call('/utenti', { method: 'POST', cookie: andrea, body: { nome: 'lucia', password: 'password-lucia' } })).status, 409);
  assert.equal((await call('/utenti/andrea', { method: 'DELETE', cookie: andrea })).status, 400);
  assert.equal((await call('/utenti/andrea', { method: 'PUT', cookie: andrea, body: { ruolo: 'revisore' } })).status, 400);
  assert.equal((await call('/utenti/lucia', { method: 'DELETE', cookie: andrea })).status, 200);

  // cambio password: le vecchie sessioni non valgono più
  const r = await call('/io/password', { method: 'POST', cookie: mario, body: { attuale: 'password-mario', nuova: 'nuova-password' } });
  assert.equal(r.status, 200);
  assert.equal((await call('/io', { cookie: mario })).status, 401);
  assert.equal((await call('/io', { cookie: r.cookie })).status, 200);
});

test('troppi tentativi', async () => {
  for (let i = 0; i < 10; i++) await call('/accesso', { method: 'POST', body: { nome: 'x', password: 'y' } });
  assert.equal((await call('/accesso', { method: 'POST', body: { nome: 'andrea', password: 'password-admin' } })).status, 429);
});
