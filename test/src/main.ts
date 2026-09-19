import 'exsurge';
import { loadIndex, loadLiturgy } from './data/loader';
import { buildControls, type Selection } from './render/controls';
import { renderCompietaFixedSections } from './render/compietaFixedSections';
import { renderCompietaDay, renderLodiDay } from './render/dayView';

async function main(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = '<p class="loading">Caricamento dati…</p>';

  const [, liturgy] = await Promise.all([loadIndex(), loadLiturgy()]);

  app.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'Anteprima database liturgico — Lodi e Compieta';
  app.appendChild(title);

  const controlsContainer = document.createElement('div');
  app.appendChild(controlsContainer);

  const dayViewContainer = document.createElement('div');
  dayViewContainer.className = 'day-view';
  app.appendChild(dayViewContainer);

  const fixedSectionsContainer = document.createElement('div');
  fixedSectionsContainer.className = 'fixed-sections';
  fixedSectionsContainer.hidden = true;
  app.appendChild(fixedSectionsContainer);

  let compietaFixedRendered = false;

  async function onSelectionChange(sel: Selection): Promise<void> {
    if (sel.office === 'lodi') {
      fixedSectionsContainer.hidden = true;
      await renderLodiDay(dayViewContainer, liturgy.lodi, sel.week ?? 1, sel.dayId);
    } else {
      fixedSectionsContainer.hidden = false;
      await renderCompietaDay(dayViewContainer, liturgy.compieta, sel.dayId);
      if (!compietaFixedRendered) {
        compietaFixedRendered = true;
        void renderCompietaFixedSections(fixedSectionsContainer, liturgy.compieta);
      }
    }
  }

  const controls = buildControls(liturgy, (sel) => {
    void onSelectionChange(sel);
  });
  controlsContainer.appendChild(controls);
}

main().catch((err) => {
  console.error(err);
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `<p class="loading loading--error">Errore di caricamento: ${(err as Error).message}</p>`;
});
