import type { LiturgicalDay } from '../calendar/calendar';
import { benedicamusKey, lodiPlan, solemnBlessing } from '../calendar/plan';
import { fetchGabc, fetchPsalm, getTexts } from '../data/loader';
import type { AntiphonSlot, LiturgyData } from '../data/types';
import { deferred, h, notice } from './dom';
import { antiphonWithPsalm, chant, finalBlessing, invocations, letturaBreve, paterNoster, psalmText, rubric, section } from './pieces';

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

export function renderLodi(day: LiturgicalDay, liturgy: LiturgyData, showAnyway = false): HTMLElement {
  const plan = lodiPlan(day);
  const root = h('div', { class: 'office' });

  const page = showAnyway && plan.fallback ? plan.fallback : { week: plan.week, dayName: plan.dayName };
  const pageName = `${page.dayName} della ${['', 'I', 'II', 'III', 'IV'][page.week]} settimana`;

  if (plan.properNotice && plan.fallback && !showAnyway) {
    const f = plan.fallback;
    const button = h('button', { type: 'button', class: 'link-button' },
      `Mostra i salmi del salterio: ${f.dayName} della ${['', 'I', 'II', 'III', 'IV'][f.week]} settimana`);
    button.addEventListener('click', () => root.replaceWith(renderLodi(day, liturgy, true)));
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

  root.append(
    section('Inno', chant(data.hymn)),
    section('Salmodia', ...data.psalmAntiphons.map((slot) =>
      plan.paschal ? paschalAntiphon(slot) : antiphonWithPsalm(slot.primary, SLOT_LABEL[slot.slot]))),
    section('Lettura breve', letturaBreve(data.letturaBreve)),
    section('Responsorio breve', chant(data.responsory)),
    section('Cantico di Zaccaria', ...benedictus(data.benedictusAntiphon)),
    ...conclusion(page.week, page.dayName, day),
  );
  return root;
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
    section('Padre nostro', paterNoster()),
    section('Orazione', c?.orazione
      ? h('p', { class: 'prayer__single' }, c.orazione)
      : notice('La domenica l’orazione è quella propria della domenica, che non è nel libretto delle Lodi.', 'gap')),
    section('Benedizione', finalBlessing(benedicamusKey(day), solemnBlessing(day))),
  ];
}
