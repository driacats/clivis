type Child = Node | string | null | undefined | false;

/** Tiny element builder: h('div', { class: 'x' }, 'text', child). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

/**
 * Returns a placeholder that is replaced by the node `load` resolves to, so an
 * office can be laid out in order while its pieces load in parallel.
 * `kind: 'score'` draws the placeholder as empty staves.
 */
export function deferred(load: () => Promise<Node>, kind: 'text' | 'score' = 'text'): HTMLElement {
  const holder = h('div', { class: kind === 'score' ? 'loading-piece loading-piece--score' : 'loading-piece', 'aria-busy': 'true' });
  load()
    .then((node) => holder.replaceWith(node))
    .catch((err: Error) => holder.replaceWith(notice(`Non è stato possibile caricare questa parte: ${err.message}`, 'error')));
  return holder;
}

/** A button that calls `onClick`. */
export function button(text: string, onClick: () => void, attrs: Record<string, string | boolean | undefined> = {}): HTMLButtonElement {
  const b = h('button', { type: 'button', ...attrs }, text);
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Makes `buttons` a group of which one is pressed (aria-pressed): a click
 * presses it and calls `onSelect`. Returns the function that selects one.
 */
export function selectOne(buttons: HTMLButtonElement[], onSelect: (i: number) => void): (i: number) => void {
  const select = (i: number) => {
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    onSelect(i);
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
  return select;
}

/** Content folded away under a summary, open on request. */
export const foldable = (summary: string, ...content: Child[]): HTMLDetailsElement =>
  h('details', { class: 'alternative' }, h('summary', {}, summary), ...content);

/** A span holding inline SVG markup (icons written in the code, never data). */
export function svgSpan(markup: string, attrs: Record<string, string> = {}): HTMLSpanElement {
  const span = h('span', attrs);
  span.innerHTML = markup;
  return span;
}

export function notice(text: string, kind: 'info' | 'gap' | 'error' = 'info'): HTMLElement {
  return h('p', { class: `notice notice--${kind}`, role: kind === 'error' ? 'alert' : undefined }, text);
}

/** Saves a file made in the page (MIDI, exported corrections). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  // revoked a moment later: some browsers start the download asynchronously
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
