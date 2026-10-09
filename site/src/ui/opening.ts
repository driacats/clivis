// Beginning of Lodi: «Deus, in adiutorium meum intende» in the tone of the day
// (libretto pp. 301-302). When Lodi is the first prayer of the day it is
// preceded by the Invitatory («Domine, labia mea aperies»), which is not in
// the libretto and not yet in this breviary (material kept in futuro/invitatorio).

import { isLent, type LiturgicalDay } from '../calendar/calendar';
import { openingRef, openingTone, type OpeningTone } from '../calendar/plan';
import { h, notice } from './dom';
import { chant, choice, NOTICE_LENT_NO_ALLELUIA, rubricText } from './pieces';

const TONE_LABELS: Record<OpeningTone, string> = {
  ferie: 'Nelle ferie',
  feste: 'Domeniche del Tempo Ordinario e feste',
  solenne: 'Domeniche dei tempi forti e solennità',
};

export function lodiOpening(day: LiturgicalDay): HTMLElement {
  const tones = Object.keys(TONE_LABELS) as OpeningTone[];
  return h('div', {},
    choice('Tono dell’introduzione',
      tones.map((t) => ({ label: TONE_LABELS[t], build: () => chant(openingRef(day, t)) })),
      tones.indexOf(openingTone(day))),
    isLent(day.season) ? notice(NOTICE_LENT_NO_ALLELUIA, 'info') : null,
    rubricText(
      'Se le Lodi sono la prima preghiera del giorno, al posto di questa introduzione si dice l’Invitatorio («Dómine, lábia mea apéries»), che non è nel libretto e non è ancora in questo breviario.'));
}
