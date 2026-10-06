// The score of the editor: a <chant-visual> that can be clicked note by note.
// Every new version is laid out off-screen and swapped in when drawn, so the
// score never flashes empty while it is being edited.
//
// Each note is its own target (its drawn box, a little larger), so the two notes
// of a pes, one above the other, can be picked separately; a click next to the
// notes goes to the nearest one on that staff.

interface NoteBox { x: number; y: number; width: number; height: number; staffTop: number; staffBottom: number }
type ChantVisual = HTMLElement & { noteBoxes(): NoteBox[] };

/** How a note was clicked: alone, extending a range (Shift), adding/removing one (Ctrl/Cmd), or twice (its neume). */
export type PickMode = 'single' | 'range' | 'toggle' | 'neume';

const SVG = 'http://www.w3.org/2000/svg';
const PAD = 4;
const HIT = 2.5;

function rect(cls: string, x: number, y: number, w: number, h: number, rx = 3): SVGRectElement {
  const r = document.createElementNS(SVG, 'rect');
  r.setAttribute('class', cls);
  r.setAttribute('x', String(x));
  r.setAttribute('y', String(y));
  r.setAttribute('width', String(Math.max(w, 1)));
  r.setAttribute('height', String(Math.max(h, 1)));
  r.setAttribute('rx', String(rx));
  return r;
}

export class ScoreView {
  readonly el: HTMLElement;
  #cv: ChantVisual | null = null;
  #observer: MutationObserver | null = null;
  #selected: number[] = [];
  #focus: number | null = null;
  #marks = new Set<number>();
  #interactive: boolean;
  /** notes the gabc model counts: when exsurge draws a different number, clicks are off */
  #expected = 0;
  onPick: (i: number, mode: PickMode) => void = () => {};
  onDrawn: (cv: HTMLElement, aligned: boolean) => void = () => {};

  constructor(interactive = true) {
    this.#interactive = interactive;
    this.el = document.createElement('div');
    this.el.className = interactive ? 'ed-score ed-score--live' : 'ed-score';
    if (!interactive) return;
    this.el.addEventListener('click', (ev) => {
      const i = this.#noteAt(ev);
      if (i === null) return;
      const mode: PickMode = ev.detail >= 2 ? 'neume' : ev.shiftKey ? 'range' : ev.metaKey || ev.ctrlKey ? 'toggle' : 'single';
      // no text selection while shift-clicking
      if (ev.shiftKey) window.getSelection()?.removeAllRanges();
      this.onPick(i, mode);
    });
    this.el.addEventListener('mousedown', (ev) => { if (ev.shiftKey || ev.detail >= 2) ev.preventDefault(); });
  }

  get chant(): HTMLElement | null { return this.#cv; }

  /** Draws a new version of the body. */
  show(body: string, annotation: string | null, expectedNotes: number): void {
    this.#expected = expectedNotes;
    const cv = document.createElement('chant-visual') as ChantVisual;
    cv.setAttribute('use-drop-cap', 'true');
    if (annotation) cv.setAttribute('annotation', annotation);
    cv.textContent = body;
    const old = this.#cv;
    if (old) cv.classList.add('ed-score__next');
    this.#cv = cv;
    cv.addEventListener('chant-rendered', () => {
      if (this.#cv !== cv) { cv.remove(); return; }
      old?.remove();
      cv.classList.remove('ed-score__next');
      this.#watch(cv);
      this.#decorate();
      this.onDrawn(cv, this.aligned);
    }, { once: true });
    this.el.append(cv);
  }

  get aligned(): boolean {
    return !!this.#cv && this.#cv.noteBoxes().length === this.#expected;
  }

  /** The selected notes; `focus` is the one the tools show (and the one kept in view). */
  select(indices: number[], focus: number | null): void {
    const moved = focus !== this.#focus;
    this.#selected = indices;
    this.#focus = focus;
    this.#decorate();
    if (focus !== null && moved) this.#reveal();
  }

  mark(indices: Iterable<number>): void {
    this.#marks = new Set(indices);
    this.#decorate();
  }

  /** The note under (or nearest to, on the same staff) a click. */
  #noteAt(ev: MouseEvent): number | null {
    const hit = (ev.target as Element).closest('[data-i]');
    if (hit) return Number(hit.getAttribute('data-i'));
    const cv = this.#cv;
    const main = cv?.querySelector<SVGGraphicsElement>('svg > g');
    if (!cv || !main || !this.aligned) return null;
    const m = main.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    let best: number | null = null;
    let bestD = Infinity;
    cv.noteBoxes().forEach((b, i) => {
      const space = (b.staffBottom - b.staffTop) / 3;
      if (p.y < b.staffTop - 2 * space || p.y > b.staffBottom + 2 * space) return;
      const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.width));
      const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.height));
      const d = dx * 3 + dy; // horizontal distance counts more: notes above each other are told apart by height
      if (d < bestD) { bestD = d; best = i; }
    });
    return bestD < 40 ? best : null;
  }

  /** exsurge redraws the svg when the width changes: draw the marks again. */
  #watch(cv: ChantVisual): void {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(() => this.#decorate());
    this.#observer.observe(cv, { childList: true });
  }

  #decorate(): void {
    const cv = this.#cv;
    const svg = cv?.querySelector('svg');
    if (!cv || !svg) return;
    svg.querySelectorAll('.ed-layer').forEach((g) => g.remove());
    const main = svg.querySelector(':scope > g') ?? svg;
    const boxes = cv.noteBoxes();
    const aligned = boxes.length === this.#expected;

    const band = (b: NoteBox) => {
      const interval = (b.staffBottom - b.staffTop) / 6;
      const top = Math.min(b.staffTop - interval, b.y - 2);
      const bottom = Math.max(b.staffBottom + interval, b.y + b.height + 2);
      return { x: b.x - PAD, y: top, w: b.width + 2 * PAD, h: bottom - top };
    };

    // behind the notes: changed notes (a band across the staff), then each
    // selected note (a box around that note only, so in a pes you see which one)
    const back = document.createElementNS(SVG, 'g');
    back.setAttribute('class', 'ed-layer');
    back.setAttribute('aria-hidden', 'true');
    if (aligned) {
      for (const i of this.#marks) {
        const b = boxes[i];
        if (!b) continue;
        const r = band(b);
        back.append(rect('ed-mark', r.x, r.y, r.w, r.h));
      }
      for (const i of this.#selected) {
        const b = boxes[i];
        if (!b) continue;
        const focus = i === this.#focus;
        back.append(rect(focus ? 'ed-sel ed-sel--focus' : 'ed-sel', b.x - 2.5, b.y - 2.5, b.width + 5, b.height + 5, 2));
      }
      const f = this.#focus !== null ? boxes[this.#focus] : undefined;
      if (f) {
        const r = band(f);
        back.append(rect('ed-sel__bar', f.x - 2, r.y + r.h - 3, f.width + 4, 3, 1.5));
      }
    }
    main.prepend(back);

    // in front: one transparent target per note, the size of the note
    if (this.#interactive && aligned) {
      const hits = document.createElementNS(SVG, 'g');
      hits.setAttribute('class', 'ed-layer ed-hits');
      boxes.forEach((b, i) => {
        const t = rect('ed-hit', b.x - HIT, b.y - HIT, b.width + 2 * HIT, b.height + 2 * HIT, 2);
        t.setAttribute('data-i', String(i));
        hits.append(t);
      });
      main.append(hits);
    }
  }

  #reveal(): void {
    requestAnimationFrame(() => {
      const el = this.el.querySelector('.ed-sel--focus');
      const r = el?.getBoundingClientRect();
      if (!el || !r) return;
      const margin = 90;
      if (r.top < margin || r.bottom > window.innerHeight - margin) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
      }
    });
  }
}
