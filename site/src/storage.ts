// Preferences remembered in this browser. Storage can be unavailable (private
// mode, blocked site data): reading then gives null and writing does nothing,
// so every choice still lasts until the page is reloaded.

export const STORAGE_KEYS = {
  /** also read by the inline script of index.html and revisione.html, before the first paint */
  theme: 'theme',
  psalmLang: 'psalmLang',
  speed: 'speed',
  reviewFilter: 'revisioneFiltro',
  /** followed by the name of the tour */
  tourPrefix: 'revisioneTour:',
} as const;

export function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function save(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/** Forgets every key starting with `prefix`. */
export function forget(prefix: string): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
  } catch { /* storage unavailable */ }
}
