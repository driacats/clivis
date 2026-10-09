// Calls to the review service (server/revisione.mjs), served by nginx under /api/.

export type Stato = 'da-rivedere' | 'in-corso' | 'inviato' | 'rimandato' | 'approvato';
export type Ruolo = 'admin' | 'revisore';
export type Azione = 'salva' | 'invia' | 'commenta' | 'approva' | 'rimanda' | 'riapri';

export interface Utente { nome: string; nomeVisibile: string; ruolo: Ruolo }

export interface Riassunto {
  stato: Stato;
  versione: number;
  aggiornato: string | null;
  da: string | null;
  diverso: boolean;
  applicato: boolean;
  cambiato: boolean;
  commenti: number;
}

export interface Revisione {
  key: string;
  file: string;
  stato: Stato;
  versione: number;
  /** the proposed file; null: no changes */
  gabc: string | null;
  /** the site's file when the review started */
  originale: string | null;
  /** the site's file now */
  sito: string;
  aggiornato: string | null;
  da: string | null;
  storia: { quando: string; chi: string; azione: Azione; da: Stato; a: Stato }[];
  commenti: { quando: string; chi: string; testo: string }[];
  nomi?: Record<string, string>;
  riassunto?: Riassunto;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(new URL(`api${path}`, document.baseURI), {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Clivis': '1' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Il servizio di revisione non risponde: controlla la connessione.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/accesso') window.dispatchEvent(new Event('revisione:uscita'));
    throw new ApiError(res.status, data.errore ?? `Errore ${res.status}`);
  }
  return data as T;
}

export const api = {
  accedi: (nome: string, password: string) => call<Utente>('/accesso', { method: 'POST', body: { nome, password } }),
  esci: () => call<object>('/uscita', { method: 'POST' }),
  io: () => call<Utente>('/io'),
  cambiaPassword: (attuale: string, nuova: string) => call<Utente>('/io/password', { method: 'POST', body: { attuale, nuova } }),
  canti: () => call<{ canti: Record<string, Riassunto>; nomi: Record<string, string> }>('/canti'),
  canto: (key: string) => call<Revisione>(`/canti/${encodeURIComponent(key)}`),
  aggiorna: (key: string, body: { azione: Azione; versione: number; gabc?: string | null; commento?: string }) =>
    call<Revisione>(`/canti/${encodeURIComponent(key)}`, { method: 'PUT', body }),
  esporta: () => call<{ esportato: string; correzioni: { key: string; file: string; gabc: string; approvato: string }[] }>('/esporta'),
  utenti: () => call<Utente[]>('/utenti'),
  creaUtente: (u: { nome: string; nomeVisibile: string; password: string; ruolo: Ruolo }) => call<Utente>('/utenti', { method: 'POST', body: u }),
  modificaUtente: (nome: string, u: { nomeVisibile?: string; password?: string; ruolo?: Ruolo }) =>
    call<Utente>(`/utenti/${encodeURIComponent(nome)}`, { method: 'PUT', body: u }),
  eliminaUtente: (nome: string) => call<object>(`/utenti/${encodeURIComponent(nome)}`, { method: 'DELETE' }),
};

export const STATO_NOME: Record<Stato, string> = {
  'da-rivedere': 'Da rivedere',
  'in-corso': 'In revisione',
  inviato: 'Da approvare',
  rimandato: 'Da correggere',
  approvato: 'Approvato',
};

/** The states in the order of the filters (the service lists the same ones in its own order, server/revisione.mjs). */
export const STATI: Stato[] = ['da-rivedere', 'in-corso', 'rimandato', 'inviato', 'approvato'];
