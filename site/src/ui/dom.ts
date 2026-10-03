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
 */
export function deferred(load: () => Promise<Node>): HTMLElement {
  const holder = h('div', { class: 'loading-piece', 'aria-busy': 'true' });
  load()
    .then((node) => holder.replaceWith(node))
    .catch((err: Error) => holder.replaceWith(notice(`Non è stato possibile caricare questa parte: ${err.message}`, 'error')));
  return holder;
}

export function notice(text: string, kind: 'info' | 'gap' | 'error' = 'info'): HTMLElement {
  return h('p', { class: `notice notice--${kind}`, role: kind === 'error' ? 'alert' : undefined }, text);
}
