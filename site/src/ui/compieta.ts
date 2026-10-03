import type { LiturgicalDay } from '../calendar/calendar';
import { compietaPlan, MARIAN_REFS, type HymnText } from '../calendar/plan';
import { getEntry } from '../data/loader';
import type { LiturgyData } from '../data/types';
import { h, notice } from './dom';
import { antiphonWithPsalm, chant, choice, letturaBreve, rubric, section } from './pieces';

const HYMN_TITLE: Record<HymnText, string> = {
  'te-lucis': 'Te lucis ante términum',
  christe: 'Christe, qui splendor et dies',
  iesu: 'Iesu, redémptor sæculi',
};

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

  const hymnOptions = plan.hymnTexts.map((t) => ({ label: HYMN_TITLE[t], build: () => chant(plan.hymnRefs[t]!) }));

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
      plan.openingWithoutAlleluia ? notice('In Quaresima si omette l’Allelúia finale.', 'info') : null,
      h('p', { class: 'rubric-text' }, 'Si può fare l’esame di coscienza, concluso dall’atto penitenziale.')),
    section('Inno', hymnOptions.length > 1 ? choice('Testo dell’inno', hymnOptions) : hymnOptions[0].build()),
    section('Salmodia', ...psalmody),
    section('Lettura breve', letturaBreve(block.letturaBreve)),
    section('Responsorio breve', chant(plan.responsoryRef)),
    section('Cantico di Simeone',
      rubric('Antifona'),
      chant(c.nuncDimittis.antiphonRef),
      antiphonWithPsalm(c.nuncDimittis.canticleRef, 'Cantico', c.nuncDimittis.antiphonRef)),
    section('Orazione e congedo',
      h('p', { class: 'rubric-text' }, 'Si dice l’orazione del giorno, poi il congedo.'),
      chant(c.congedo)),
    section(`Antifona mariana · ${marian.title}`,
      choice('Tono dell’antifona', [
        { label: 'Tono semplice', build: () => chant(marian.simple) },
        { label: 'Tono solenne', build: () => chant(marian.solemn) },
      ]),
      h('div', { class: 'ad-libitum' }, rubric('Oppure, ad libitum'), ...adLibitum)),
  );
  return root;
}
