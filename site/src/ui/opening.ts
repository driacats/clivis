// Beginning of Lodi: «Deus, in adiutorium meum intende» in the tone of the day
// (libretto pp. 301-302). When Lodi is the first prayer of the day it is
// preceded by the Invitatory («Domine, labia mea aperies»), which is not in
// the libretto and not yet in this breviary (material kept in futuro/invitatorio).

import type { LiturgicalDay } from '../calendar/calendar';
import { openingRef, openingTone, type OpeningTone } from '../calendar/plan';
import { h, notice } from './dom';
import { chant, choice } from './pieces';

const TONE_LABELS: Record<OpeningTone, string> = {
  ferie: 'Nelle ferie',
  feste: 'Domeniche del Tempo Ordinario e feste',
  solenne: 'Domeniche dei tempi forti e solennità',
};

export function lodiOpening(day: LiturgicalDay): HTMLElement {
  const tones = Object.keys(TONE_LABELS) as OpeningTone[];
  const lent = day.season === 'quaresima' || day.season === 'triduo';
  return h('div', {},
    choice('Tono dell’introduzione',
      tones.map((t) => ({ label: TONE_LABELS[t], build: () => chant(openingRef(day, t)) })),
      tones.indexOf(openingTone(day))),
    lent ? notice('In Quaresima si omette l’Allelúia finale.', 'info') : null,
    h('p', { class: 'rubric-text' },
      'Se le Lodi sono la prima preghiera del giorno, al posto di questa introduzione si dice l’Invitatorio («Dómine, lábia mea apéries»), che non è nel libretto e non è ancora in questo breviario.'));
}
