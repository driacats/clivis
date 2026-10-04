import type { LiturgicalDay } from '../calendar/calendar';
import { benedicamusKey, lodiCelebrations, lodiPlan, paterNosterTone, solemnBlessing, type LodiCelebration } from '../calendar/plan';
import { fetchGabc, fetchPsalm, getTexts } from '../data/loader';
import type { AntiphonSlot, LiturgyData } from '../data/types';
import { deferred, h, notice } from './dom';
import { lodiOpening } from './opening';
import { comuneTitle, renderComuneLodi } from './comune';
import { antiphonWithPsalm, chant, choice, finalBlessing, invocations, letturaBreve, paterNoster, psalmText, rubric, section } from './pieces';

const BENEDICTUS = 'salmi/cant-lc-1-68-79-benedictus.json';

const SLOT_LABEL: Record<AntiphonSlot['slot'], string> = {
  '1a': '1ª antifona', '2a': '2ª antifona', '3a': '3ª antifona', unica: 'Antifona',
};

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
 * Lodi of the day. When a saint can be celebrated, a choice on top switches
 * between the weekday and the saint (with its Comune).
 */
export function renderLodi(day: LiturgicalDay, liturgy: LiturgyData): HTMLElement {
  const { options, initial } = lodiCelebrations(day);
  if (options.length === 1) return renderCelebration(day, liturgy, options[0]);
  return h('div', {},
    choice('Celebrazione', options.map((o) => ({
      label: o.mode === 'feria' ? 'Feria' : `${o.label}${o.mode === 'memoria' && day.memorials.find((m) => m.name === o.name)?.rank === 'memoria facoltativa' ? ' (facoltativa)' : ''}`,
      build: () => renderCelebration(day, liturgy, o),
    })), initial));
}

function renderCelebration(day: LiturgicalDay, liturgy: LiturgyData, o: LodiCelebration): HTMLElement {
  if (o.mode === 'feria') {
    const commemorations = day.memorials.filter((m) => m.commemoration);
    return h('div', {},
      commemorations.length ? notice(`Oggi si può fare memoria di: ${commemorations.map((m) => m.name).join('; ')}. In questo tempo le memorie si commemorano soltanto: si dicono le Lodi della feria.`, 'info') : null,
      renderFeria(day, liturgy));
  }
  const build = (comune: string) => {
    const plan = lodiPlan(day);
    const data = liturgy.lodi.weeks.find((w) => w.week === plan.week)?.days.find((d) => d.day === plan.dayName);
    const conc = getTexts().lodi.find((e) => e.week === plan.week && e.day === plan.dayName);
    return renderComuneLodi(day, liturgy, {
      mode: o.mode as 'memoria' | 'festa', name: o.name, comune,
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

function renderFeria(day: LiturgicalDay, liturgy: LiturgyData, showAnyway = false): HTMLElement {
  const plan = lodiPlan(day);
  const root = h('div', { class: 'office' });

  const page = showAnyway && plan.fallback ? plan.fallback : { week: plan.week, dayName: plan.dayName };
  const pageName = `${page.dayName} della ${['', 'I', 'II', 'III', 'IV'][page.week]} settimana`;

  if (plan.properNotice && plan.fallback && !showAnyway) {
    const f = plan.fallback;
    const button = h('button', { type: 'button', class: 'link-button' },
      `Mostra i salmi del salterio: ${f.dayName} della ${['', 'I', 'II', 'III', 'IV'][f.week]} settimana`);
    button.addEventListener('click', () => root.replaceWith(renderFeria(day, liturgy, true)));
    root.append(notice(plan.properNotice, 'info'), button);
    return root;
  }
  if (plan.properNotice) {
    root.append(notice(`Salterio: ${pageName}. Le antifone, la lettura e le altre parti proprie di oggi non sono ancora in questo breviario.`, 'info'));
  }
  if (plan.seasonalNotice) root.append(notice(plan.seasonalNotice, 'info'));

  const data = liturgy.lodi.weeks.find((w) => w.week === page.week)?.days.find((d) => d.day === page.dayName);
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
function withTranslation(id: string, label: string, folded = false): HTMLElement {
  const it = getTexts().proprioTempoIt[id];
  const translation = !it ? null
    : folded
      ? h('details', { class: 'alternative' }, h('summary', {}, 'Traduzione'), h('p', { class: 'translation' }, it.replace(/\n/g, '\n\n').replace(/ \/ /g, '\n')))
      : h('p', { class: 'translation' }, it);
  return h('div', {}, rubric(label), chant(id), translation);
}

function benedictus(antiphon: string | { note: string }): Node[] {
  const text = deferred(async () => psalmText(await fetchPsalm(BENEDICTUS)));
  if (typeof antiphon !== 'string') {
    return [notice('La domenica l’antifona al Benedictus è propria e cambia ogni settimana: non è nel libretto delle Lodi.', 'gap'), text];
  }
  return [
    rubric('Antifona al Benedictus'), chant(antiphon),
    text,
    rubric('Antifona al Benedictus'), chant(antiphon, { repeat: true }),
  ];
}

/** Invocations, Our Father, oration and blessing of the psalter day. */
function conclusion(week: number, dayName: string, day: LiturgicalDay): HTMLElement[] {
  const c = getTexts().lodi.find((e) => e.week === week && e.day === dayName);
  return [
    section('Invocazioni', c ? invocations(c.invocazioni) : notice('Invocazioni non trovate nel database.', 'error')),
    section('Padre nostro', paterNoster(paterNosterTone(day))),
    section('Orazione', c?.orazione
      ? h('p', { class: 'prayer__single' }, c.orazione)
      : notice('La domenica l’orazione è quella propria della domenica, che non è nel libretto delle Lodi.', 'gap')),
    section('Benedizione', finalBlessing(benedicamusKey(day), solemnBlessing(day))),
  ];
}
