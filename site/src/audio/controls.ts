// The listen / speed / MIDI bar under each score. Playback, MIDI and following
// the notes on the score come from exsurge; what to play (antiphon, EUOUAE,
// psalm tone) is decided here.
import { followScore, melodyToMidi, parseGabcMelody, playMelody, responsorySequence, splitEuouae, type Follower, type MelodyEvent } from 'exsurge';
import { psalmToneFor } from './psalmTone';

const SPEED_LABELS = ['lento', 'normale', 'veloce'];
const SPEEDS = [0.65, 0.45, 0.32]; // seconds per beat
const KEY = 'speed';

let speed = 1;
const getSpeed = () => speed;
const setSpeed = (i: number) => { speed = i; };
const secondsPerBeat = () => SPEEDS[speed];

try {
  const s = Number(localStorage.getItem(KEY));
  if (s >= 0 && s < SPEED_LABELS.length && localStorage.getItem(KEY) !== null) setSpeed(s);
} catch { /* storage unavailable: default speed */ }

/** Every speed button on the page: they all show the same, shared speed. */
const speedButtons = new Set<HTMLButtonElement>();

function showSpeed(): void {
  for (const b of speedButtons) {
    if (!b.isConnected) { speedButtons.delete(b); continue; }
    b.textContent = `Velocità: ${SPEED_LABELS[getSpeed()]}`;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

/**
 * Listen / speed / MIDI bar shown under a score.
 * `repeat`: the antiphon sung again after the psalm — only the antiphon itself, no EUOUAE or psalm tone.
 * `score`: the <chant-visual> showing this body, to follow the notes on it while they play.
 */
export function playerControls(gabcBody: string, fileName: string, mode: string | null = null, repeat = false, score: Element | null = null): HTMLElement {
  const bar = el('div', 'player');
  const events = parseGabcMelody(gabcBody);
  if (events.length === 0) return bar;

  const split = splitEuouae(gabcBody);
  const mainEvents = split.euouae ? parseGabcMelody(split.main) : events;
  const euEvents = split.euouae ? parseGabcMelody(split.euouae) : [];

  const pitched = (evs: MelodyEvent[]) => evs.filter((e) => e.pitch !== null).length;
  const total = pitched(events);
  const follow = (offset: number) => (score ? followScore(score, offset, total) : null);

  // a short responsory is played as it is sung, with its repeats; the score
  // shows it once, so the follower jumps back to the notes being repeated
  const responsory = responsorySequence(gabcBody);
  const responsoryFollower = (follower: Follower | null, notes: number[]): Follower | null =>
    follower && { ...follower, show: (i) => follower.show(i === null ? null : notes[i]) };

  const playButtons = responsory
    ? [playButton('Come si canta', responsory.events, responsoryFollower(follow(0), responsory.notes))]
    : repeat && euEvents.length && mainEvents.length
    ? [playButton('Antifona', mainEvents, follow(0))]
    : euEvents.length && mainEvents.length
    ? [playButton('Antifona', mainEvents, follow(0)), playButton('Euouae', euEvents, follow(pitched(mainEvents)))]
    : [playButton('Ascolta', events, follow(0))];

  const tone = repeat || responsory ? null : psalmToneFor(gabcBody, mode);
  if (tone) {
    const b = playButton('Tono del salmo', tone);
    b.title = 'Come intonare il primo versetto: intonazione, corda di recita, mediante e terminazione';
    playButtons.push(b);
  }

  const speedBtn = el('button', 'player__speed');
  speedBtn.type = 'button';
  speedBtn.title = 'Cambia velocità';
  speedBtn.textContent = `Velocità: ${SPEED_LABELS[getSpeed()]}`;
  speedButtons.add(speedBtn);
  speedBtn.addEventListener('click', () => {
    setSpeed((getSpeed() + 1) % SPEED_LABELS.length);
    try { localStorage.setItem(KEY, String(getSpeed())); } catch { /* ignore */ }
    showSpeed();
  });

  const midi = el('a', 'player__midi', 'Scarica MIDI');
  midi.href = '#';
  midi.addEventListener('click', (ev) => {
    ev.preventDefault();
    const blob = new Blob([melodyToMidi(responsory?.events ?? events, secondsPerBeat()).buffer as ArrayBuffer], { type: 'audio/midi' });
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
function playButton(label: string, events: MelodyEvent[], follower: Follower | null = null): HTMLButtonElement {
  const btn = el('button', 'player__play');
  btn.type = 'button';
  let stop: (() => void) | null = null;
  const idle = () => {
    stop = null;
    follower?.clear();
    btn.innerHTML = `<span aria-hidden="true">▶</span> ${label}`;
    btn.setAttribute('aria-pressed', 'false');
  };
  idle();
  btn.addEventListener('click', () => {
    if (stop) { stop(); return; }
    btn.innerHTML = '<span aria-hidden="true">■</span> Ferma';
    btn.setAttribute('aria-pressed', 'true');
    stop = playMelody(events, {
      secondsPerBeat: secondsPerBeat(),
      onEnd: idle,
      onNote: follower ? (i) => follower.show(i) : undefined,
    });
  });
  return btn;
}
