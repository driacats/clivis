/** Consistent inline warning banner for anything missing: a not-found chant, a
 * not-applicable slot, or a not-yet-extracted reading. Always show the real reason
 * text from the data, never a generic placeholder. */
export function gapWarning(message: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gap-warning';
  el.innerHTML = `<span class="gap-warning__icon" aria-hidden="true">⚠</span><span class="gap-warning__text"></span>`;
  el.querySelector('.gap-warning__text')!.textContent = message;
  return el;
}
