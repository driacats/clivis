import type { PsalmDoc } from '../data/types';

/** Renders a salmi/*.json document: title, epigraph, then each verse's Italian
 * text with the Latin alongside (when present — Compieta only). */
export function psalmView(doc: PsalmDoc): HTMLElement {
  const el = document.createElement('div');
  el.className = 'psalm-view';

  const header = document.createElement('div');
  header.className = 'psalm-view__header';
  header.innerHTML = `<h4 class="psalm-view__title"></h4>`;
  header.querySelector('.psalm-view__title')!.textContent = `${doc.ref} — ${doc.title}`;
  if (doc.epigraph) {
    const ep = document.createElement('p');
    ep.className = 'psalm-view__epigraph';
    ep.textContent = doc.epigraph;
    header.appendChild(ep);
  }
  el.appendChild(header);

  const hasLatin = doc.verses.some((v) => v.la);
  const list = document.createElement('div');
  list.className = hasLatin ? 'psalm-view__verses psalm-view__verses--bilingual' : 'psalm-view__verses';

  for (const verse of doc.verses) {
    const row = document.createElement('div');
    row.className = 'psalm-view__verse';
    const it = document.createElement('p');
    it.className = 'psalm-view__it';
    it.textContent = verse.it;
    row.appendChild(it);
    if (verse.la) {
      const la = document.createElement('p');
      la.className = 'psalm-view__la';
      la.textContent = verse.la;
      row.appendChild(la);
    }
    list.appendChild(row);
  }
  el.appendChild(list);

  return el;
}
