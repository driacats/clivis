import { DAY_MS } from '../calendar/calendar';
import { h } from '../ui/dom';
import { STATO_NOME, type Stato } from './api';

export const statoPill = (s: Stato, extra?: string): HTMLElement =>
  h('span', { class: `stato stato--${s}` }, STATO_NOME[s], extra ? h('span', { class: 'stato__extra' }, extra) : null);

const fmtData = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

/** "oggi 14:05", "ieri 9:30", "3 ott." */
export function quando(iso: string): string {
  const d = new Date(iso);
  const oggi = new Date();
  const giorni = Math.round((new Date(oggi.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / DAY_MS);
  if (giorni === 0) return `oggi ${fmtOra.format(d)}`;
  if (giorni === 1) return `ieri ${fmtOra.format(d)}`;
  return fmtData.format(d);
}

/** "← Tutti i canti", back to the list. */
export const backToList = (): HTMLElement => h('a', { href: '#/', class: 'back-link' }, '← Tutti i canti');

/** The message of an error thrown by the service (or by anything else). */
export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
