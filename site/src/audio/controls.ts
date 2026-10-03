import { melodyToMidi, parseGabcMelody } from './gabcMelody';
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

  const playBtn = el('button', 'player__play');
  playBtn.type = 'button';
  let stop: (() => void) | null = null;
  const idle = () => {
    stop = null;
    playBtn.innerHTML = '<span aria-hidden="true">▶</span> Ascolta';
    playBtn.setAttribute('aria-pressed', 'false');
  };
  idle();
  playBtn.addEventListener('click', () => {
    if (stop) { stop(); return; }
    playBtn.innerHTML = '<span aria-hidden="true">■</span> Ferma';
    playBtn.setAttribute('aria-pressed', 'true');
    stop = play(events, idle);
  });

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
    const blob = new Blob([melodyToMidi(events, secondsPerBeat())], { type: 'audio/midi' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.gabc$/, '') + '.mid';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  bar.append(playBtn, speedBtn, midi);
  return bar;
}
