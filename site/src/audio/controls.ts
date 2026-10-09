// The listen / speed / MIDI bar under each score. Playback, MIDI and following
// the notes on the score come from exsurge; what to play (antiphon, EUOUAE,
// psalm tone) is decided here.
import { followScore, melodyToMidi, parseGabcMelody, playMelody, responsorySequence, splitEuouae, type Follower, type MelodyEvent } from 'exsurge';
import { downloadBlob, h } from '../ui/dom';
import { load, save, STORAGE_KEYS } from '../storage';
import { psalmToneFor } from './psalmTone';

const SPEEDS = [
  { label: 'lento', secondsPerBeat: 0.65 },
  { label: 'normale', secondsPerBeat: 0.45 },
  { label: 'veloce', secondsPerBeat: 0.32 },
];
const DEFAULT_SPEED = 1;

/** Index in SPEEDS, shared by every score on the page and remembered. */
let speed = DEFAULT_SPEED;
const savedSpeed = Number(load(STORAGE_KEYS.speed) ?? NaN);
if (Number.isInteger(savedSpeed) && savedSpeed >= 0 && savedSpeed < SPEEDS.length) speed = savedSpeed;
const secondsPerBeat = () => SPEEDS[speed].secondsPerBeat;
const speedText = () => `Velocità: ${SPEEDS[speed].label}`;

/** Every speed button on the page: they all show the same, shared speed. */
const speedButtons = new Set<HTMLButtonElement>();

function showSpeed(): void {
  for (const b of speedButtons) {
    if (!b.isConnected) { speedButtons.delete(b); continue; }
    b.textContent = speedText();
  }
}

/**
 * Listen / speed / MIDI bar shown under a score.
 * `repeat`: the antiphon sung again after the psalm — only the antiphon itself, no EUOUAE or psalm tone.
 * `score`: the <chant-visual> showing this body, to follow the notes on it while they play.
 */
export function playerControls(gabcBody: string, fileName: string, mode: string | null = null, repeat = false, score: Element | null = null): HTMLElement {
  const bar = h('div', { class: 'player' });
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

  const speedBtn = h('button', { type: 'button', class: 'player__speed', title: 'Cambia velocità' }, speedText());
  speedButtons.add(speedBtn);
  speedBtn.addEventListener('click', () => {
    speed = (speed + 1) % SPEEDS.length;
    save(STORAGE_KEYS.speed, String(speed));
    showSpeed();
  });

  const midi = h('a', { class: 'player__midi', href: '#' }, 'Scarica MIDI');
  midi.addEventListener('click', (ev) => {
    ev.preventDefault();
    const blob = new Blob([melodyToMidi(responsory?.events ?? events, secondsPerBeat()).buffer as ArrayBuffer], { type: 'audio/midi' });
    downloadBlob(blob, fileName.replace(/\.gabc$/, '') + '.mid');
  });

  bar.append(...playButtons, speedBtn, midi);
  return bar;
}

/** A play/stop button for one part; plays once, then returns to idle. */
function playButton(label: string, events: MelodyEvent[], follower: Follower | null = null): HTMLButtonElement {
  const btn = h('button', { type: 'button', class: 'player__play' });
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
