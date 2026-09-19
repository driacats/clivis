import { fetchGabc } from '../data/loader';
import { resolvePiece } from '../liturgy/resolve';
import { gapWarning } from './gapWarning';

/** Renders the chant for a single gabc/index.json id into `container`: a caption
 * (printed incipit + context) followed by either a rendered <chant-visual> or a
 * gap warning when the piece is not-found / not-applicable. */
export async function renderChant(container: HTMLElement, id: string): Promise<void> {
  const entry = resolvePiece(id);
  const wrapper = document.createElement('div');
  wrapper.className = 'chant-piece';

  if (!entry) {
    wrapper.appendChild(gapWarning(`Riferimento sconosciuto: ${id}`));
    container.appendChild(wrapper);
    return;
  }

  const caption = document.createElement('div');
  caption.className = 'chant-piece__caption';
  const incipit = entry.printedIncipit ?? entry.role;
  caption.innerHTML = `<span class="chant-piece__incipit"></span><span class="chant-piece__context"></span>`;
  caption.querySelector('.chant-piece__incipit')!.textContent = incipit;
  caption.querySelector('.chant-piece__context')!.textContent = entry.printedContext;
  wrapper.appendChild(caption);

  if (entry.status === 'not-found') {
    wrapper.appendChild(gapWarning(entry.notFoundReason ?? 'Canto non trovato su GregoBase.'));
    container.appendChild(wrapper);
    return;
  }
  if (entry.status === 'not-applicable') {
    wrapper.appendChild(gapWarning(entry.notApplicableReason ?? 'Non applicabile.'));
    container.appendChild(wrapper);
    return;
  }

  try {
    const { mode, body } = await fetchGabc(id);
    // Set textContent/attribute BEFORE inserting into the DOM: <chant-visual>
    // reads them only inside its own connectedCallback.
    const cv = document.createElement('chant-visual');
    if (mode) cv.setAttribute('annotation', mode);
    cv.textContent = body;
    const scoreHolder = document.createElement('div');
    scoreHolder.className = 'chant-piece__score';
    scoreHolder.appendChild(cv);
    wrapper.appendChild(scoreHolder);
  } catch (err) {
    wrapper.appendChild(gapWarning(`Errore nel caricamento del file GABC: ${(err as Error).message}`));
  }

  container.appendChild(wrapper);
}
