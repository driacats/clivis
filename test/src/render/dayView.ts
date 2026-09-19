import type { AntiphonSlot, CompietaStructure, LodiStructure, SlotRef } from '../data/types';
import { resolveSlotRef } from '../liturgy/resolve';
import { gapWarning } from './gapWarning';
import { letturaView } from './letturaView';
import { pieceView } from './pieceView';

const SLOT_LABEL: Record<AntiphonSlot['slot'], string> = {
  '1a': '1ª antifona',
  '2a': '2ª antifona',
  '3a': '3ª antifona',
  unica: 'Antifona',
};

async function renderAntiphonSlot(container: HTMLElement, slot: AntiphonSlot): Promise<void> {
  container.appendChild(await pieceView(slot.primary, SLOT_LABEL[slot.slot]));
  for (const alt of slot.alternatives ?? []) {
    container.appendChild(await pieceView(alt.ref, `oppure (${alt.tag})`));
  }
  if (slot.paschalSubstitute) {
    container.appendChild(await pieceView(slot.paschalSubstitute, 'Nel tempo pasquale'));
  }
}

async function renderSlotRefSection(container: HTMLElement, heading: string, ref: SlotRef): Promise<void> {
  const section = document.createElement('div');
  section.className = 'day-view__section';
  const h = document.createElement('div');
  h.className = 'piece-view__label';
  h.textContent = heading;
  section.appendChild(h);

  const resolved = await resolveSlotRef(ref);
  if (resolved.kind === 'lettura') {
    section.appendChild(letturaView(resolved.doc));
  } else {
    section.appendChild(gapWarning(resolved.note));
  }
  container.appendChild(section);
}

export async function renderLodiDay(
  container: HTMLElement,
  lodi: LodiStructure,
  week: number,
  dayName: string,
): Promise<void> {
  container.innerHTML = '';
  const weekData = lodi.weeks.find((w) => w.week === week);
  const day = weekData?.days.find((d) => d.day === dayName);
  if (!day) {
    container.appendChild(gapWarning(`Nessun dato per settimana ${week}, ${dayName}.`));
    return;
  }

  const hymnSection = document.createElement('div');
  hymnSection.className = 'day-view__section';
  hymnSection.appendChild(await pieceView(day.hymn, 'Inno'));
  container.appendChild(hymnSection);

  const antiphonsSection = document.createElement('div');
  antiphonsSection.className = 'day-view__section';
  for (const slot of day.psalmAntiphons) {
    await renderAntiphonSlot(antiphonsSection, slot);
  }
  container.appendChild(antiphonsSection);

  await renderSlotRefSection(container, 'Lettura breve', day.letturaBreve);

  const responsorySection = document.createElement('div');
  responsorySection.className = 'day-view__section';
  responsorySection.appendChild(await pieceView(day.responsory, 'Responsorio breve'));
  container.appendChild(responsorySection);

  const benedictusSection = document.createElement('div');
  benedictusSection.className = 'day-view__section';
  if (typeof day.benedictusAntiphon === 'string') {
    benedictusSection.appendChild(await pieceView(day.benedictusAntiphon, 'Antifona al Benedictus'));
  } else {
    const h = document.createElement('div');
    h.className = 'piece-view__label';
    h.textContent = 'Antifona al Benedictus';
    benedictusSection.appendChild(h);
    benedictusSection.appendChild(gapWarning(day.benedictusAntiphon.note));
  }
  container.appendChild(benedictusSection);
}

export async function renderCompietaDay(
  container: HTMLElement,
  compieta: CompietaStructure,
  blockId: string,
): Promise<void> {
  container.innerHTML = '';
  const block = compieta.vespersBlocks.find((b) => b.id === blockId);
  if (!block) {
    container.appendChild(gapWarning(`Blocco sconosciuto: ${blockId}`));
    return;
  }

  const antiphonsSection = document.createElement('div');
  antiphonsSection.className = 'day-view__section';
  for (const slot of block.psalmAntiphons) {
    await renderAntiphonSlot(antiphonsSection, slot);
  }
  container.appendChild(antiphonsSection);

  await renderSlotRefSection(container, 'Lettura breve', block.letturaBreve);
}
