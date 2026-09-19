import { fetchPsalm } from '../data/loader';
import { resolvePiece } from '../liturgy/resolve';
import { renderChant } from './chantVisual';
import { gapWarning } from './gapWarning';
import { psalmView } from './psalmView';

/** The core reusable card: a single gabc/index.json id's chant, plus (when the
 * entry carries a `psalm` field, i.e. it's an antiphon/canticle) the linked
 * psalm/canticle text below it. Optionally prefixed with a small label (e.g.
 * "1a antifona", "oppure (LHG)") for use inside a day view. */
export async function pieceView(id: string, label?: string): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.className = 'piece-view';

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'piece-view__label';
    labelEl.textContent = label;
    card.appendChild(labelEl);
  }

  await renderChant(card, id);

  const entry = resolvePiece(id);
  if (entry?.psalm) {
    try {
      const doc = await fetchPsalm(entry.psalm.file);
      card.appendChild(psalmView(doc));
    } catch (err) {
      card.appendChild(gapWarning(`Errore nel caricamento del salmo: ${(err as Error).message}`));
    }
  }

  return card;
}
