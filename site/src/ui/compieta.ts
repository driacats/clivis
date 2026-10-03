import type { LiturgicalDay } from '../calendar/calendar';
import { compietaPlan, MARIAN_REFS } from '../calendar/plan';
import { fetchPsalm, getEntry, getTexts } from '../data/loader';
import { attoPenitenziale, esameDelGiorno } from './esame';
import type { LiturgyData } from '../data/types';
import { deferred, h, notice } from './dom';
import { antiphonWithPsalm, bilingual, chant, choice, letturaBreve, psalmText, rubric, section } from './pieces';

export function renderCompieta(day: LiturgicalDay, liturgy: LiturgyData): HTMLElement {
  const plan = compietaPlan(day);
  const c = liturgy.compieta;
  const block = c.vespersBlocks.find((b) => b.id === plan.blockId);
  const root = h('div', { class: 'office' });

  if (plan.notice) root.append(notice(plan.notice, 'info'));
  if (!block) {
    root.append(notice(`Nel database manca la Compieta «${plan.blockId}».`, 'error'));
    return root;
  }

  const hymnOptions = hymnChoices(c, plan.hymnRefs[plan.hymnTexts[0]]!);

  const psalmody = block.psalmAntiphons.flatMap((slot) => {
    const label = block.psalmAntiphons.length > 1 ? `${slot.slot === '1a' ? '1ª' : '2ª'} antifona` : 'Antifona';
    const alternatives = (slot.alternatives ?? []).map((alt) =>
      h('details', { class: 'alternative' },
        h('summary', {}, `Oppure l’antifona di ${alt.tag === 'LHG' ? 'Les Heures Grégoriennes' : alt.tag}`),
        chant(alt.ref)));
    return [antiphonWithPsalm(slot.primary, label), ...alternatives];
  });

  const marian = MARIAN_REFS[plan.marian];
  const adLibitum = c.marianAntiphons.adLibitum.map((id) =>
    h('details', { class: 'alternative' },
      h('summary', {}, getEntry(id)?.printedIncipit?.split(/[,.!]/)[0] ?? id),
      chant(id)));

  root.append(
    section('Introduzione',
      chant(c.openingVersicle),
      plan.openingWithoutAlleluia ? notice('In Quaresima si omette l’Allelúia finale.', 'info') : null),
    section('Esame di coscienza',
      h('p', { class: 'rubric-text' }, 'Breve silenzio per l’esame di coscienza. Uno schema per oggi:'),
      esameDelGiorno(day.weekday),
      h('p', {}, h('a', { href: '#/esame', class: 'more-link' }, 'Tutti gli schemi di esame di coscienza ›')),
      h('details', { class: 'alternative' }, h('summary', {}, 'Atto penitenziale'), attoPenitenziale())),
    section('Inno', choice('Inno', hymnOptions.options, hymnOptions.initial)),
    section('Salmodia', ...psalmody),
    section('Lettura breve', letturaBreve(block.letturaBreve)),
    section('Responsorio breve', chant(plan.responsoryRef)),
    section('Cantico di Simeone',
      rubric('Antifona'),
      chant(c.nuncDimittis.antiphonRef),
      nuncDimittisText(c.nuncDimittis.canticleRef),
      rubric('Antifona'),
      chant(c.nuncDimittis.antiphonRef, { repeat: true })),
    section('Orazione', ...oration(plan.orationKey)),
    section('Congedo', chant(c.congedo)),
    section(`Antifona mariana · ${marian.title}`,
      choice('Tono dell’antifona', [
        { label: 'Tono semplice', build: () => chant(marian.simple) },
        { label: 'Tono solenne', build: () => chant(marian.solemn) },
      ]),
      h('div', { class: 'ad-libitum' }, rubric('Oppure, ad libitum'), ...adLibitum)),
  );
  return root;
}

function oration(key: string): Node[] {
  const o = getTexts().compietaOrazioni[key];
  if (!o) return [notice(`Orazione «${key}» non trovata nel database.`, 'error')];
  return [rubric(o.titolo), bilingual(o)];
}

/**
 * Every hymn melody printed in the libretto, one pill each (variants that share
 * the same melody are merged, with all their uses listed). The pill matching
 * the day is preselected, but any can be chosen.
 */
function hymnChoices(c: LiturgyData['compieta'], todayRef: string) {
  const groups = new Map<string, { text: string; refs: string[]; contexts: string[] }>();
  for (const hymn of c.hymns) {
    for (const v of hymn.variants) {
      const key = getEntry(v.ref)?.file ?? v.ref;
      const g = groups.get(key) ?? { text: hymn.text, refs: [], contexts: [] };
      g.refs.push(v.ref);
      g.contexts.push(v.context);
      groups.set(key, g);
    }
  }
  const list = [...groups.values()];
  const initial = Math.max(0, list.findIndex((g) => g.refs.includes(todayRef)));
  const options = list.map((g) => {
    return {
      label: g.text.replace('terminum', 'términum').replace('Christe qui', 'Christe, qui').replace('redemptor saeculi', 'redémptor sæculi'),
      build: () => h('div', {},
        h('p', { class: 'rubric-text' }, g.contexts.join(' · ')),
        chant(g.refs[0])),
    };
  });
  // pills of the same text are told apart by their tone
  const labels = options.map((o, i) => {
    const same = options.filter((p) => p.label === o.label).length > 1;
    return { label: same ? `${o.label} · ${toneOf(list[i].contexts)}` : o.label, build: o.build };
  });
  return { options: labels, initial };
}

/** Short tag for a melody from where the libretto uses it. */
function toneOf(contexts: string[]): string {
  const c = contexts[0].toLowerCase();
  if (c.startsWith('ferie')) return 'per annum';
  if (c.startsWith('feste')) return 'feste';
  if (c.startsWith('avvento')) return 'Avvento';
  return contexts[0];
}

/** Text of the Nunc dimittis (the antiphon is sung before and after it). */
function nuncDimittisText(canticleRef: string): HTMLElement | null {
  const psalm = getEntry(canticleRef)?.psalm;
  return psalm ? deferred(async () => psalmText(await fetchPsalm(psalm.file))) : null;
}
