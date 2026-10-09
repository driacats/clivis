import type { LiturgicalDay } from '../calendar/calendar';
import { compietaPlan, MARIAN_REFS } from '../calendar/plan';
import { getEntry, getTexts } from '../data/loader';
import { attoPenitenziale, esameDelGiorno } from './esame';
import type { LiturgyData } from '../data/types';
import { foldable, h, notice } from './dom';
import {
  antiphonFrame, antiphonWithPsalm, bilingual, chant, choice, letturaBreve, NOTICE_LENT_NO_ALLELUIA, psalm, psalmFile,
  rubric, rubricText, section, SLOT_LABEL, translation,
} from './pieces';

/** Sources of the alternative antiphons, by the tag used in liturgy.json. */
const SOURCE_NAME: Record<string, string> = { LHG: 'Les Heures Grégoriennes' };

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

  const hymnOptions = hymnChoices(c, plan.hymnRefs[plan.hymnTexts[0]] ?? '');

  const psalmody = block.psalmAntiphons.flatMap((slot) => {
    const label = SLOT_LABEL[slot.slot];
    const alternatives = (slot.alternatives ?? []).map((alt) =>
      foldable(`Oppure l’antifona di ${SOURCE_NAME[alt.tag] ?? alt.tag}`,
        chant(alt.ref)));
    return [antiphonWithPsalm(slot.primary, label), ...alternatives];
  });

  const marian = MARIAN_REFS[plan.marian];
  const parvum = marian.parvum;
  const adLibitum = c.marianAntiphons.adLibitum.map((id) =>
    foldable(getEntry(id)?.printedIncipit?.split(/[,.!]/)[0] ?? id,
      marianPiece(id)));

  root.append(
    section('Introduzione',
      chant(c.openingVersicle),
      plan.openingWithoutAlleluia ? notice(NOTICE_LENT_NO_ALLELUIA, 'info') : null),
    section('Esame di coscienza',
      rubricText('Breve silenzio per l’esame di coscienza. Uno schema per oggi:'),
      esameDelGiorno(day.weekday),
      h('p', {}, h('a', { href: '#/esame', class: 'more-link' }, 'Tutti gli schemi di esame di coscienza ›')),
      foldable('Atto penitenziale', attoPenitenziale())),
    section('Inno', choice('Inno', hymnOptions.options, hymnOptions.initial)),
    section('Salmodia', ...psalmody),
    section('Lettura breve', letturaBreve(block.letturaBreve)),
    section('Responsorio breve', chant(plan.responsoryRef), plan.versicleRef ? chant(plan.versicleRef) : null),
    section('Cantico di Simeone', ...antiphonFrame('Antifona',
      chant(c.nuncDimittis.antiphonRef),
      nuncDimittisText(c.nuncDimittis.canticleRef),
      chant(c.nuncDimittis.antiphonRef, { repeat: true }))),
    section('Orazione', ...oration(plan.orationKey)),
    section('Congedo', chant(c.congedo)),
    section(`Antifona mariana · ${marian.title}`,
      choice('Tono dell’antifona', [
        { label: 'Tono semplice', build: () => marianPiece(marian.simple) },
        { label: 'Tono solenne', build: () => marianPiece(marian.solemn) },
        ...(parvum ? [{ label: 'Officium parvum', build: () => marianPiece(parvum) }] : []),
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
      label: g.text,
      build: () => h('div', {},
        rubricText(g.contexts.join(' · ')),
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
  const file = psalmFile(canticleRef);
  return file ? psalm(file) : null;
}

/** A Marian antiphon with the Italian translation printed in the libretto. */
function marianPiece(id: string): HTMLElement {
  return h('div', {}, chant(id), translation(getTexts().marianeIt[id]));
}
