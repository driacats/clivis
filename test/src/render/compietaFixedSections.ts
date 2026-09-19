import type { CompietaStructure, HymnGroup } from '../data/types';
import { pieceView } from './pieceView';

async function renderHymnGroup(panel: HTMLElement, group: HymnGroup): Promise<void> {
  panel.innerHTML = '';
  for (const variant of group.variants) {
    panel.appendChild(await pieceView(variant.ref, variant.context));
  }
}

function buildHymnTabs(hymns: HymnGroup[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'hymn-tabs';

  const tabBar = document.createElement('div');
  tabBar.className = 'hymn-tabs__bar';
  const panel = document.createElement('div');
  panel.className = 'hymn-tabs__panel';

  const buttons: HTMLButtonElement[] = [];
  hymns.forEach((group, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hymn-tabs__tab';
    btn.textContent = group.text;
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      // Lazily (re)render only the active tab's chants — <chant-visual> lays
      // itself out against its parent's width, which is unreliable inside a
      // panel that was just display:none, so panels for inactive tabs are
      // simply never populated rather than hidden with CSS.
      void renderHymnGroup(panel, group);
    });
    buttons.push(btn);
    tabBar.appendChild(btn);
  });

  wrap.appendChild(tabBar);
  wrap.appendChild(panel);
  void renderHymnGroup(panel, hymns[0]);

  return wrap;
}

function sectionHeading(text: string): HTMLElement {
  const h = document.createElement('h3');
  h.className = 'fixed-section__heading';
  h.textContent = text;
  return h;
}

const MARIAN_GROUP_LABEL: Record<keyof CompietaStructure['marianAntiphons'], string> = {
  tonoSemplice: 'Tono semplice',
  tonoSempliceSolenne: 'Tono semplice solenne',
  tonoSolenneMonastico: 'Tono solenne monastico',
  adLibitum: 'Ad libitum',
};

/** Renders the Compieta sections that do NOT depend on which day is selected:
 * the three hymn-text tabs, the responsorio breve variants, Nunc Dimittis,
 * congedo, and the full list of Marian antiphons. Rendered once when the
 * office switches to Compieta, not re-rendered on day change. */
export async function renderCompietaFixedSections(container: HTMLElement, compieta: CompietaStructure): Promise<void> {
  container.innerHTML = '';

  const hymnsSection = document.createElement('div');
  hymnsSection.className = 'fixed-section';
  hymnsSection.appendChild(sectionHeading('Inni'));
  hymnsSection.appendChild(buildHymnTabs(compieta.hymns));
  container.appendChild(hymnsSection);

  const respSection = document.createElement('div');
  respSection.className = 'fixed-section';
  respSection.appendChild(sectionHeading('Responsorio breve'));
  for (const variant of compieta.responsorioBreve.variants) {
    respSection.appendChild(await pieceView(variant.ref, variant.context));
  }
  container.appendChild(respSection);

  const ndSection = document.createElement('div');
  ndSection.className = 'fixed-section';
  ndSection.appendChild(sectionHeading('Nunc dimittis'));
  ndSection.appendChild(await pieceView(compieta.nuncDimittis.antiphonRef, 'Antifona al cantico evangelico'));
  ndSection.appendChild(await pieceView(compieta.nuncDimittis.canticleRef, 'Cantico di Simeone'));
  container.appendChild(ndSection);

  const congedoSection = document.createElement('div');
  congedoSection.className = 'fixed-section';
  congedoSection.appendChild(sectionHeading('Congedo'));
  congedoSection.appendChild(await pieceView(compieta.congedo));
  container.appendChild(congedoSection);

  const marianSection = document.createElement('div');
  marianSection.className = 'fixed-section';
  marianSection.appendChild(sectionHeading('Antifone mariane'));
  for (const key of Object.keys(compieta.marianAntiphons) as (keyof CompietaStructure['marianAntiphons'])[]) {
    const groupHeading = document.createElement('h4');
    groupHeading.className = 'fixed-section__subheading';
    groupHeading.textContent = MARIAN_GROUP_LABEL[key];
    marianSection.appendChild(groupHeading);
    for (const ref of compieta.marianAntiphons[key]) {
      marianSection.appendChild(await pieceView(ref));
    }
  }
  container.appendChild(marianSection);
}
