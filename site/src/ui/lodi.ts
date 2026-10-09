import { ROMAN, type LiturgicalDay } from '../calendar/calendar';
import { benedicamusKey, lodiCelebrations, lodiPlan, paterNosterTone, solemnBlessing, type LodiCelebration } from '../calendar/plan';
import { fetchGabc, getTexts } from '../data/loader';
import type { AntiphonSlot, LiturgyData, LodiDay } from '../data/types';
import { button, deferred, h, notice } from './dom';
import type { CelebrationSelect } from './aside';
import { lodiOpening } from './opening';
import { comuneTitle, renderComuneLodi } from './comune';
import {
  antiphonFrame, antiphonWithPsalm, benedictus as benedictusText, chant, choice, finalBlessing, invocations, letturaBreve, lodiConclusion,
  paterNoster, psalterDay, rubric, section, SLOT_LABEL, translation,
} from './pieces';

type Plan = ReturnType<typeof lodiPlan>;

/** In Eastertide: the paschal antiphon, or a note that the generic Alleluia is missing. */
function paschalAntiphon(slot: AntiphonSlot): HTMLElement {
  const label = SLOT_LABEL[slot.slot];
  if (slot.paschalSubstitute) return antiphonWithPsalm(slot.paschalSubstitute, `${label} · Tempo pasquale`);
  return h('div', {},
    antiphonWithPsalm(slot.primary, label),
    // antiphons whose melody already carries the "T.P. allelúia" ending need no note
    deferred(async () => {
      const { body } = await fetchGabc(slot.primary);
      return /T\.\s?P\./.test(body)
        ? document.createTextNode('')
        : notice('Nel Tempo pasquale il libretto sostituisce questa antifona con «Allelúia, allelúia, allelúia», la cui melodia non è ancora in questo breviario.', 'gap');
    }),
  );
}

/**
 * Lodi of the day. When a saint can be celebrated, `select` lets the sidebar
 * switch the text between the weekday and the saint (with its Comune); it is
 * null when there is nothing to choose.
 */
export function renderLodi(day: LiturgicalDay, liturgy: LiturgyData): { main: HTMLElement; select: CelebrationSelect | null } {
  const { options, initial } = lodiCelebrations(day);
  const plan = lodiPlan(day);
  if (options.length === 1) return { main: renderCelebration(day, plan, liturgy, options[0]), select: null };
  const main = h('div', { class: 'choice__panel' });
  const onSelect = (i: number) => main.replaceChildren(renderCelebration(day, plan, liturgy, options[i]));
  return { main, select: { initial, onSelect } };
}

function renderCelebration(day: LiturgicalDay, plan: Plan, liturgy: LiturgyData, o: LodiCelebration): HTMLElement {
  if (o.mode === 'feria') {
    const commemorations = day.memorials.filter((m) => m.commemoration);
    return h('div', {},
      commemorations.length ? notice(`Oggi si può fare memoria di: ${commemorations.map((m) => m.name).join('; ')}. In questo tempo le memorie si commemorano soltanto: si dicono le Lodi della feria.`, 'info') : null,
      renderFeria(day, plan, liturgy));
  }
  const build = (comune: string) => {
    const data = psalterDay(liturgy, plan.week, plan.dayName);
    const conc = lodiConclusion(plan.week, plan.dayName);
    return renderComuneLodi(day, liturgy, {
      mode: o.mode, name: o.name, comune,
      psalter: () => data ? psalmody(data.psalmAntiphons, plan.paschal) : [notice('Salmodia del giorno non trovata.', 'error')],
      ferialInvocations: conc?.invocazioni ?? null,
    });
  };
  if (o.comuni.length === 1) return build(o.comuni[0]);
  return choice('Comune', o.comuni.map((c) => ({ label: `Comune: ${comuneTitle(c)}`, build: () => build(c) })));
}

function psalmody(slots: AntiphonSlot[], paschal: boolean): HTMLElement[] {
  return slots.map((slot) => paschal ? paschalAntiphon(slot) : antiphonWithPsalm(slot.primary, SLOT_LABEL[slot.slot]));
}

function renderFeria(day: LiturgicalDay, plan: Plan, liturgy: LiturgyData, showAnyway = false): HTMLElement {
  const root = h('div', { class: 'office' });

  const page = showAnyway && plan.fallback ? plan.fallback : { week: plan.week, dayName: plan.dayName };
  const pageName = `${page.dayName} della ${ROMAN[page.week]} settimana`;

  if (plan.properNotice && plan.fallback && !showAnyway) {
    const f = plan.fallback;
    root.append(notice(plan.properNotice, 'info'),
      button(`Mostra i salmi del salterio: ${f.dayName} della ${ROMAN[f.week]} settimana`,
        () => root.replaceWith(renderFeria(day, plan, liturgy, true)), { class: 'link-button' }));
    return root;
  }
  if (plan.properNotice) {
    root.append(notice(`Salterio: ${pageName}. Le antifone, la lettura e le altre parti proprie di oggi non sono ancora in questo breviario.`, 'info'));
  }
  if (plan.seasonalNotice) root.append(notice(plan.seasonalNotice, 'info'));

  const data = psalterDay(liturgy, page.week, page.dayName);
  if (!data) {
    root.append(notice(`Nel database mancano le Lodi di ${pageName}.`, 'error'));
    return root;
  }

  // Proprio del Tempo: hymn and short responsory of the season replace the psalter's
  const proper = plan.seasonProper && !showAnyway
    ? liturgy.lodi.proprioTempo?.find((p) => p.id === plan.seasonProper) ?? null
    : null;
  const hymn = proper
    ? withTranslation(proper.hymn, `Inno proprio · ${proper.label} (libretto, ${proper.pdfPage})`, true)
    : chant(data.hymn);
  const responsory = proper
    ? withTranslation(proper.responsory[plan.seasonProperResponsory],
      `${proper.label} · ${plan.seasonProperResponsory === 'domeniche' ? 'nelle domeniche' : 'nelle ferie'}`)
    : chant(data.responsory);

  root.append(
    section('Introduzione', lodiOpening(day)),
    section('Inno', hymn),
    section('Salmodia', ...psalmody(data.psalmAntiphons, plan.paschal)),
    section('Lettura breve', letturaBreve(data.letturaBreve)),
    section('Responsorio breve', responsory),
    section('Cantico di Zaccaria', ...benedictus(data.benedictusAntiphon)),
    ...conclusion(page.week, page.dayName, day),
  );
  return root;
}

/**
 * A chant of the Proprio del Tempo with its rubric and the Italian translation
 * printed in the libretto (folded away for the longer hymns).
 */
function withTranslation(id: string, label: string, hymn = false): HTMLElement {
  return h('div', {}, rubric(label), chant(id), translation(getTexts().proprioTempoIt[id], { hymn }));
}

function benedictus(antiphon: LodiDay['benedictusAntiphon']): (Node | null)[] {
  if (typeof antiphon !== 'string') {
    return [notice('La domenica l’antifona al Benedictus è propria e cambia ogni settimana: non è nel libretto delle Lodi.', 'gap'), benedictusText()];
  }
  return antiphonFrame('Antifona al Benedictus', chant(antiphon), benedictusText(), chant(antiphon, { repeat: true }));
}

/** Invocations, Our Father, oration and blessing of the psalter day. */
function conclusion(week: number, dayName: string, day: LiturgicalDay): HTMLElement[] {
  const c = lodiConclusion(week, dayName);
  return [
    section('Invocazioni', c ? invocations(c.invocazioni) : notice('Invocazioni non trovate nel database.', 'error')),
    section('Padre nostro', paterNoster(paterNosterTone(day))),
    section('Orazione', c?.orazione
      ? h('p', { class: 'prayer__single' }, c.orazione)
      : notice('La domenica l’orazione è quella propria della domenica, che non è nel libretto delle Lodi.', 'gap')),
    section('Benedizione', finalBlessing(benedicamusKey(day), solemnBlessing(day))),
  ];
}
