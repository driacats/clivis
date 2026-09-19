#!/usr/bin/env node
// One-off script: parse gabc/inventory.json's Lodi rows into the week/day
// structure needed by gabc/liturgy.json. Output is reviewed by hand before
// being folded into the final file — this script is not run automatically.
import { readFileSync, writeFileSync } from 'node:fs';

const inv = JSON.parse(readFileSync(new URL('../inventory.json', import.meta.url)));
const rows = inv.rows.filter(r => r.office === 'lodi');

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

const hymnByDayWeek = {};   // `${day}|${week}` -> id
const respByDayWeek = {};
const benByDayWeek = {};
const antByWeekDayThe = {}; // week -> day -> [{slot, id}]
const paschalSub = {}; // baseId -> substituteId

const unparsed = [];

for (const r of rows) {
  const ctx = r.context || '';
  if (r.id.startsWith('LH') || r.id.startsWith('LR') || r.id.startsWith('LB')) {
    const m = ctx.match(/^(Domenica|Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato), (?:settimane?|sett\.) (\d) e (\d)/);
    if (!m) { unparsed.push([r.id, ctx]); continue; }
    const [, day, w1, w2] = m;
    const target = r.id.startsWith('LH') ? hymnByDayWeek : r.id.startsWith('LR') ? respByDayWeek : benByDayWeek;
    target[`${day}|${w1}`] = `lodi.${r.id}`;
    target[`${day}|${w2}`] = `lodi.${r.id}`;
  } else if (r.id.startsWith('LA')) {
    const m = ctx.match(/^settimana (\d), (Domenica|Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato), (\d)a ant\.,/);
    if (!m) { unparsed.push([r.id, ctx]); continue; }
    const [, week, day, slot] = m;
    antByWeekDayThe[week] ??= {};
    antByWeekDayThe[week][day] ??= [];
    antByWeekDayThe[week][day].push({ slot: slot + 'a', id: `lodi.${r.id}`, isPaschalSubstitute: r.isPaschalSubstitute, substituteFor: r.substituteFor });
  }
}

const weeks = [];
for (let w = 1; w <= 4; w++) {
  const days = [];
  for (const day of DAYS) {
    const antRaw = (antByWeekDayThe[String(w)] || {})[day] || [];
    // separate base rows from paschal-substitute rows; attach substitute onto base
    const bases = antRaw.filter(a => !a.isPaschalSubstitute);
    const subs = antRaw.filter(a => a.isPaschalSubstitute);
    bases.sort((a, b) => a.slot.localeCompare(b.slot));
    const psalmAntiphons = bases.map(b => {
      const baseRowId = b.id.replace('lodi.', '');
      const sub = subs.find(s => s.substituteFor === baseRowId);
      const obj = { slot: b.slot, primary: b.id };
      if (sub) obj.paschalSubstitute = sub.id;
      return obj;
    });
    const hymn = hymnByDayWeek[`${day}|${w}`] || null;
    const responsory = respByDayWeek[`${day}|${w}`] || null;
    const ben = benByDayWeek[`${day}|${w}`] || null;
    days.push({
      day,
      hymn,
      psalmAntiphons,
      responsory,
      benedictusAntiphon: ben || { kind: 'gap', reason: 'not-applicable', note: 'proprio della Domenica, non incluso nel libretto' },
      letturaBreve: { kind: 'gap', reason: 'not-extracted', note: 'lettura breve non ancora disponibile' }
    });
  }
  weeks.push({ week: w, days });
}

if (unparsed.length) {
  console.error('UNPARSED ROWS:');
  for (const [id, ctx] of unparsed) console.error(' ', id, '|', ctx);
}

writeFileSync(new URL('../liturgy-lodi.generated.json', import.meta.url), JSON.stringify({ weeks }, null, 2));
console.log('wrote gabc/liturgy-lodi.generated.json,', unparsed.length, 'unparsed rows');
