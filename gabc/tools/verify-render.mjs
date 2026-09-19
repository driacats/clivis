// Verification gate: every .gabc file in ../chants/ must parse, lay out, and
// render to SVG via exsurge without throwing. Run with `npm run verify`.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { splitGabc } from './gabc-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chantsDir = path.join(__dirname, '..', 'chants');

// exsurge calls document.createElementNS/createElement at layout/render time
// (not at module-import time), so it's enough to install these globals before
// we actually construct a ChantContext/ChantScore below. Stand-ins for the
// canvas/SVG measurement APIs jsdom doesn't implement, mirroring exsurge's own
// test/setup.ts, since we only need the pipeline to complete and produce SVG
// output, not pixel-accurate measurements.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.Node = dom.window.Node;
globalThis.DOMParser = dom.window.DOMParser;

const fakeCanvasContext = {
  setTransform() {},
  scale() {},
  translate() {},
  fill() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  clearRect() {},
  measureText(text) {
    return { width: String(text).length * 8 };
  },
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
};

dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return fakeCanvasContext;
};

if (typeof dom.window.SVGElement.prototype.getBBox !== 'function') {
  dom.window.SVGElement.prototype.getBBox = function () {
    return { x: 0, y: 0, width: 10, height: 10 };
  };
}

if (typeof dom.window.SVGElement.prototype.getSubStringLength !== 'function') {
  dom.window.SVGElement.prototype.getSubStringLength = function (from, to) {
    return Math.max(0, to - from) * 8;
  };
}

const { ChantContext, ChantScore, Gabc } = await import('exsurge');

function listGabcFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.gabc'))
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function verifyOne(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const { body } = splitGabc(raw);

  const ctxt = new ChantContext();
  const mappings = Gabc.createMappingsFromSource(ctxt, body);
  const score = new ChantScore(ctxt, mappings, true);

  score.performLayout(ctxt);
  score.layoutChantLines(ctxt, 1000, () => {});

  const svg = score.createSvg(ctxt);
  if (!svg || !svg.includes('<svg')) {
    throw new Error('createSvg did not return an <svg> document');
  }
}

const files = listGabcFiles(chantsDir);

if (files.length === 0) {
  console.log(`No .gabc files found in ${chantsDir} yet — nothing to verify.`);
  process.exit(0);
}

let failures = 0;
for (const file of files) {
  const filePath = path.join(chantsDir, file);
  try {
    verifyOne(filePath);
    console.log(`PASS  ${file}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${file}: ${err.message}`);
  }
}

console.log(`\n${files.length - failures}/${files.length} files rendered successfully.`);
if (failures > 0) {
  process.exit(1);
}
