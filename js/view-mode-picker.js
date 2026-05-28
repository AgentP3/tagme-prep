/* ===========================================================
   view-mode-picker.js — Choose study mode after picking sections
   =========================================================== */

import { loadIndex, gatherFlashcards, gatherMC } from './content.js';
import { navigate } from './app.js';

export async function renderModePicker(container, params = {}) {
  const view = document.createElement('div');
  view.className = 'view';

  const sectionIds = params.sectionIds || [];
  const [index, flashcards, mcs] = await Promise.all([
    loadIndex(),
    gatherFlashcards(sectionIds),
    gatherMC(sectionIds),
  ]);

  const selectedTitles = index.sections
    .filter(s => sectionIds.includes(s.id))
    .map(s => s.title);

  const titleLine = selectedTitles.length === 1
    ? selectedTitles[0]
    : `${selectedTitles.length} documents selected`;

  view.innerHTML = `
    <div class="eyebrow">Step 2 of 2</div>
    <h2 class="view-title">How to study</h2>
    <p class="view-subtitle">${titleLine}</p>

    <div class="mode-grid">
      <button class="mode-card" data-mode="browse">
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <div class="mode-info">
          <div class="mode-title">Browse</div>
          <div class="mode-desc">Read source material with citations</div>
        </div>
      </button>

      <button class="mode-card" data-mode="flashcards" ${flashcards.length === 0 ? 'disabled' : ''}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
        </div>
        <div class="mode-info">
          <div class="mode-title">Flashcards</div>
          <div class="mode-desc">${flashcards.length} card${flashcards.length === 1 ? '' : 's'} · tap to reveal</div>
        </div>
      </button>

      <button class="mode-card" data-mode="quiz" ${mcs.length === 0 ? 'disabled' : ''}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <div class="mode-info">
          <div class="mode-title">Quiz</div>
          <div class="mode-desc">${mcs.length} question${mcs.length === 1 ? '' : 's'} · multiple choice with feedback</div>
        </div>
      </button>
    </div>
  `;

  container.appendChild(view);

  view.querySelectorAll('.mode-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const mode = btn.dataset.mode;
      navigate(mode, { sectionIds });
    });
  });
}
