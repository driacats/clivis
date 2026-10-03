import { melodyToMidi, parseGabcMelody, splitEuouae, type MelodyEvent } from './gabcMelody';
import { getSpeed, play, secondsPerBeat, setSpeed } from './player';

const SPEED_LABELS = ['lento', 'normale', 'veloce'];
const KEY = 'speed';

try {
  const s = Number(localStorage.getItem(KEY));
  if (s >= 0 && s < SPEED_LABELS.length && localStorage.getItem(KEY) !== null) setSpeed(s);
} catch { /* storage unavailable: default speed */ }

const speedButtons = new Set<HTMLButtonElement>();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

/** Listen / speed / MIDI bar shown under a score. */
export function playerControls(gabcBody: string, fileName: string): HTMLElement {
  const bar = el('div', 'player');
  const events = parseGabcMelody(gabcBody);
  if (events.length === 0) return bar;

  const split = splitEuouae(gabcBody);
  const mainEvents = split.euouae ? parseGabcMelody(split.main) : events;
  const euEvents = split.euouae ? parseGabcMelody(split.euouae) : [];

  const playButtons = euEvents.length && mainEvents.length
    ? [playButton('Antifona', mainEvents), playButton('Euouae', euEvents)]
    : [playButton('Ascolta', events)];

  const speedBtn = el('button', 'player__speed');
  speedBtn.type = 'button';
  speedBtn.title = 'Cambia velocità';
  speedButtons.add(speedBtn);
  const showSpeed = () => speedButtons.forEach((b) => { b.textContent = `Velocità: ${SPEED_LABELS[getSpeed()]}`; });
  speedBtn.addEventListener('click', () => {
    setSpeed((getSpeed() + 1) % SPEED_LABELS.length);
    try { localStorage.setItem(KEY, String(getSpeed())); } catch { /* ignore */ }
    showSpeed();
  });
  speedBtn.textContent = `Velocità: ${SPEED_LABELS[getSpeed()]}`;

  const midi = el('a', 'player__midi', 'Scarica MIDI');
  midi.href = '#';
  midi.addEventListener('click', (ev) => {
    ev.preventDefault();
    const blob = new Blob([melodyToMidi(events, secondsPerBeat()).buffer as ArrayBuffer], { type: 'audio/midi' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.gabc$/, '') + '.mid';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  bar.append(...playButtons, speedBtn, midi);
  return bar;
}


/** A play/stop button for one part; plays once, then returns to idle. */
function playButton(label: string, events: MelodyEvent[]): HTMLButtonElement {
  const btn = el('button', 'player__play');
  btn.type = 'button';
  let stop: (() => void) | null = null;
  const idle = () => {
    stop = null;
    btn.innerHTML = `<span aria-hidden="true">▶</span> ${label}`;
    btn.setAttribute('aria-pressed', 'false');
  };
  idle();
  btn.addEventListener('click', () => {
    if (stop) { stop(); return; }
    btn.innerHTML = '<span aria-hidden="true">■</span> Ferma';
    btn.setAttribute('aria-pressed', 'true');
    stop = play(events, idle);
  });
  return btn;
}
