import type { LiturgyData, Office } from '../data/types';

export interface Selection {
  office: Office;
  week: number | null; // null for Compieta
  dayId: string; // Lodi: day name ("Domenica".."Sabato"); Compieta: vespersBlock id
}

const LODI_DAY_ORDER = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

function lodiDayOptions(): { value: string; label: string }[] {
  return LODI_DAY_ORDER.map((d) => ({ value: d, label: d }));
}

function compietaDayOptions(liturgy: LiturgyData): { value: string; label: string }[] {
  return liturgy.compieta.vespersBlocks.map((b) => ({ value: b.id, label: b.label }));
}

/** Builds the office/week/day control bar. Calls `onChange` once immediately
 * with the initial selection, and again on every subsequent user change. */
export function buildControls(
  liturgy: LiturgyData,
  onChange: (selection: Selection) => void,
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'controls';

  const officeLabel = document.createElement('label');
  officeLabel.className = 'controls__field';
  officeLabel.textContent = 'Ufficio';
  const officeSelect = document.createElement('select');
  officeSelect.innerHTML = `<option value="lodi">Lodi</option><option value="compieta">Compieta</option>`;
  officeLabel.appendChild(officeSelect);

  const weekLabel = document.createElement('label');
  weekLabel.className = 'controls__field';
  weekLabel.textContent = 'Settimana';
  const weekSelect = document.createElement('select');
  weekSelect.innerHTML = [1, 2, 3, 4].map((w) => `<option value="${w}">${w}</option>`).join('');
  weekLabel.appendChild(weekSelect);

  const dayLabel = document.createElement('label');
  dayLabel.className = 'controls__field';
  dayLabel.textContent = 'Giorno';
  const daySelect = document.createElement('select');
  dayLabel.appendChild(daySelect);

  bar.appendChild(officeLabel);
  bar.appendChild(weekLabel);
  bar.appendChild(dayLabel);

  function populateDayOptions(): void {
    const office = officeSelect.value as Office;
    const options = office === 'lodi' ? lodiDayOptions() : compietaDayOptions(liturgy);
    daySelect.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  }

  function currentSelection(): Selection {
    const office = officeSelect.value as Office;
    return {
      office,
      week: office === 'lodi' ? Number(weekSelect.value) : null,
      dayId: daySelect.value,
    };
  }

  function updateVisibility(): void {
    weekLabel.style.display = officeSelect.value === 'lodi' ? '' : 'none';
  }

  officeSelect.addEventListener('change', () => {
    updateVisibility();
    populateDayOptions();
    onChange(currentSelection());
  });
  weekSelect.addEventListener('change', () => onChange(currentSelection()));
  daySelect.addEventListener('change', () => onChange(currentSelection()));

  updateVisibility();
  populateDayOptions();
  onChange(currentSelection());

  return bar;
}
