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

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Starts playing; calls onEnd when finished or stopped. Returns a stop function.
 */
export function play(events: MelodyEvent[], onEnd: () => void): () => void {
  current?.stop();
  ctx ??= new AudioContext();
  const audio = ctx;
  void audio.resume();

  const master = audio.createGain();
  master.gain.value = 0.22;
  master.connect(audio.destination);

  const spb = secondsPerBeat();
  let t = audio.currentTime + 0.08;
  const nodes: OscillatorNode[] = [];
  for (const e of events) {
    const dur = e.beats * spb;
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
  const finish = () => {
    if (done) return;
    done = true;
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
