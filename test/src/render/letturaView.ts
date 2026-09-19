import type { LetturaDoc } from '../data/types';

/** Renders a letture/*.json document: reference + Italian paragraph, with the
 * Latin paragraph alongside/below when present. */
export function letturaView(doc: LetturaDoc): HTMLElement {
  const el = document.createElement('div');
  el.className = 'lettura-view';
  el.innerHTML = `<h4 class="lettura-view__ref"></h4>`;
  el.querySelector('.lettura-view__ref')!.textContent = `Lettura breve — ${doc.ref}`;

  const body = document.createElement('div');
  body.className = 'lettura-view__body';
  const it = document.createElement('p');
  it.className = 'lettura-view__it';
  it.textContent = doc.it;
  body.appendChild(it);
  if (doc.la) {
    const la = document.createElement('p');
    la.className = 'lettura-view__la';
    la.textContent = doc.la;
    body.appendChild(la);
  }
  el.appendChild(body);
  return el;
}
