// Plays a melody with the Web Audio API: a soft, organ-like tone for each note.
// Only one score plays at a time; starting another stops the current one.

import type { MelodyEvent } from './gabcMelody';

let ctx: AudioContext | null = null;
let current: { stop: () => void } | null = null;

const SPEEDS = [0.65, 0.45, 0.32]; // seconds per beat: lento, normale, veloce
let speedIndex = 1;

export function setSpeed(i: number): void { speedIndex = i; }
export function getSpeed(): number { return speedIndex; }
export const secondsPerBeat = () => SPEEDS[speedIndex];

/**
 * iPhone/iPad: Web Audio counts as "ambient" sound and is muted by the silent
 * switch. Declaring a playback session (Safari 16.4+) makes it play like music;
 * on older iOS, playing a short silent <audio> element during the tap does the
 * same. Both are harmless elsewhere.
 */
let unlocked = false;
function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try { if (nav.audioSession) nav.audioSession.type = 'playback'; } catch { /* not supported */ }
  try {
    const el = new Audio(SILENT_WAV);
    el.setAttribute('playsinline', '');
    void el.play().catch(() => { /* ignore */ });
  } catch { /* no HTMLAudioElement */ }
}

/** 0.05 s of silence, 8 kHz mono 8-bit WAV. */
const SILENT_WAV = 'data:audio/wav;base64,' + btoa(
  'RIFF' + String.fromCharCode(0xb4, 0x01, 0, 0) + 'WAVEfmt ' +
  String.fromCharCode(16, 0, 0, 0, 1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x40, 0x1f, 0, 0, 1, 0, 8, 0) +
  'data' + String.fromCharCode(144, 1, 0, 0) + String.fromCharCode(128).repeat(400));

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Starts playing; calls onEnd when finished or stopped. Returns a stop function.
 * `onNote` is told which note is sounding (its index among the pitched events,
 * or null during a rest) each time that changes.
 */
export function play(events: MelodyEvent[], onEnd: () => void, onNote?: (index: number | null) => void): () => void {
  current?.stop();
  unlockAudio();
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) { onEnd(); return () => {}; }
  ctx ??= new AC();
  const audio = ctx;
  // resume() must be called inside the tap; "interrupted" (iOS, after a call) also needs it
  if (audio.state !== 'running') void audio.resume();

  const master = audio.createGain();
  master.gain.value = 0.22;
  master.connect(audio.destination);

  const spb = secondsPerBeat();
  let t = audio.currentTime + 0.08;
  const nodes: OscillatorNode[] = [];
  /** start time and pitched-note index of every event (null for rests) */
  const cues: { at: number; index: number | null }[] = [];
  let pitched = 0;
  for (const e of events) {
    const dur = e.beats * spb;
    cues.push({ at: t, index: e.pitch !== null ? pitched++ : null });
    if (e.pitch !== null) {
      const env = audio.createGain();
      env.connect(master);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.04);
      env.gain.setValueAtTime(1, t + Math.max(0.05, dur - 0.06));
      env.gain.linearRampToValueAtTime(0, t + dur);
      // fundamental + a quieter octave: a gentle flute/organ colour
      for (const [mult, type, gain] of [[1, 'sine', 1], [2, 'triangle', 0.18]] as const) {
        const osc = audio.createOscillator();
        osc.type = type;
        osc.frequency.value = freq(e.pitch) * mult;
        const g = audio.createGain();
        g.gain.value = gain;
        osc.connect(g).connect(env);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        nodes.push(osc);
      }
    }
    t += dur;
  }

  const total = (t - audio.currentTime) * 1000;
  let done = false;

  // follow the audio clock to tell which note is sounding
  let frame = 0;
  let shown: number | null | undefined;
  const follow = () => {
    const now = audio.currentTime;
    let index: number | null = null;
    for (let k = cues.length - 1; k >= 0; k--) {
      if (cues[k].at <= now) { index = cues[k].index; break; }
    }
    if (index !== shown) { shown = index; onNote?.(index); }
    frame = requestAnimationFrame(follow);
  };
  if (onNote) frame = requestAnimationFrame(follow);

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); master.disconnect(); }, 120);
    if (current?.stop === finish) current = null;
    onEnd();
  };
  const timer = setTimeout(finish, total);
  current = { stop: finish };
  return finish;
}
