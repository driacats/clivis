// Light/dark toggle. By default the site follows the system setting; once the
// reader presses the button the choice is remembered in this browser.

type Theme = 'light' | 'dark';

const KEY = 'theme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';

function saved(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function current(): Theme {
  return saved() ?? (systemDark.matches ? 'dark' : 'light');
}

export function setupThemeToggle(button: HTMLButtonElement): void {
  const update = () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    button.innerHTML = (next === 'dark' ? MOON : SUN) + `<span>${next === 'dark' ? 'Tema scuro' : 'Tema chiaro'}</span>`;
    button.setAttribute('aria-label', next === 'dark' ? 'Passa al tema scuro' : 'Passa al tema chiaro');
  };

  button.addEventListener('click', () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: the choice lasts until reload */ }
    update();
  });
  systemDark.addEventListener('change', update);

  update();
  button.hidden = false;
}
