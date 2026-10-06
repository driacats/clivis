// A short guided tour: the page darkens, one part of it stays lit, and a card
// next to it says what it is for. Shown once per page and per browser (it can be
// seen again from the guide).
import { h } from '../ui/dom';

export interface TourStep {
  /** what to light up (the first match); none: the card in the middle of the screen */
  target?: string;
  title: string;
  text: string;
}

const KEY = (name: string) => `revisioneTour:${name}`;

export function tourSeen(name: string): boolean {
  try { return localStorage.getItem(KEY(name)) === '1'; } catch { return false; }
}

function markSeen(name: string): void {
  try { localStorage.setItem(KEY(name), '1'); } catch { /* storage unavailable: it will show again */ }
}

/** Forgets every tour, so each shows again on its page. */
export function resetTours(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('revisioneTour:')) localStorage.removeItem(k);
  } catch { /* ignore */ }
}

let running: (() => void) | null = null;

/** Starts a tour (closing any other); `name` marks it as seen when it ends. */
export function startTour(name: string, steps: TourStep[]): void {
  running?.();
  const shown = steps.filter((s) => !s.target || document.querySelector(s.target));
  if (shown.length === 0) return;

  const veil = h('div', { class: 'tour', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title' });
  const spot = h('div', { class: 'tour__spot', 'aria-hidden': 'true' });
  const card = h('div', { class: 'tour__card' });
  veil.append(spot, card);
  document.body.append(veil);
  const before = document.activeElement as HTMLElement | null;
  let i = 0;

  function place(): void {
    const step = shown[i];
    const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!el) {
      spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0;`;
      card.style.cssText = `left:${Math.max(16, (vw - card.offsetWidth) / 2)}px;top:${Math.max(16, (vh - card.offsetHeight) / 2)}px;`;
      veil.classList.add('tour--center');
      return;
    }
    veil.classList.remove('tour--center');
    const r = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(r.top - pad, 4), bottom = Math.min(r.bottom + pad, vh - 4);
    spot.style.cssText = `left:${r.left - pad}px;top:${top}px;width:${r.width + 2 * pad}px;height:${Math.max(bottom - top, 0)}px;`;

    // the card goes where there is room: below, above, left or right of the lit part
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    let x: number, y: number;
    if (bottom + gap + ch < vh) { y = bottom + gap; x = r.left; }
    else if (top - gap - ch > 0) { y = top - gap - ch; x = r.left; }
    else if (r.left - gap - cw > 0) { x = r.left - gap - cw; y = top; }
    else if (r.right + gap + cw < vw) { x = r.right + gap; y = top; }
    else { x = (vw - cw) / 2; y = vh - ch - 16; }
    x = Math.min(Math.max(x, 12), vw - cw - 12);
    y = Math.min(Math.max(y, 12), vh - ch - 12);
    card.style.cssText = `left:${x}px;top:${y}px;`;
  }

  function show(): void {
    const step = shown[i];
    const last = i === shown.length - 1;
    const back = h('button', { type: 'button', class: 'ed-button', disabled: i === 0 }, 'Indietro');
    const next = h('button', { type: 'button', class: 'ed-button ed-button--primary' }, last ? 'Fine' : 'Avanti');
    const skip = h('button', { type: 'button', class: 'link-button tour__skip' }, 'Salta la presentazione');
    back.addEventListener('click', () => go(i - 1));
    next.addEventListener('click', () => (last ? end() : go(i + 1)));
    skip.addEventListener('click', end);
    card.replaceChildren(
      h('p', { class: 'tour__count' }, `${i + 1} di ${shown.length}`),
      h('h2', { class: 'tour__title', id: 'tour-title' }, step.title),
      h('p', { class: 'tour__text' }, step.text),
      h('div', { class: 'tour__actions' }, last ? h('span', {}) : skip, h('span', { class: 'tour__nav' }, back, next)));
    const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 60) el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center' });
    }
    requestAnimationFrame(() => { place(); next.focus(); });
  }

  function go(n: number): void {
    i = Math.min(Math.max(n, 0), shown.length - 1);
    show();
  }

  function end(): void {
    markSeen(name);
    stop();
  }

  function stop(): void {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    veil.remove();
    running = null;
    before?.focus?.();
  }

  function onKey(ev: KeyboardEvent): void {
    // the tour keeps the keyboard: the editor's shortcuts wait until it is closed
    ev.stopPropagation();
    if (ev.key === 'Escape') { ev.preventDefault(); end(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); if (i < shown.length - 1) go(i + 1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(i - 1); }
  }

  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  running = stop;
  show();
}

/** Closes a running tour without marking it as seen (leaving the page). */
export function stopTour(): void {
  running?.();
}
