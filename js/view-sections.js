/* ===========================================================
   view-sections.js — Multi-select sections picker
   =========================================================== */

import { loadIndex } from './content.js';
import { getAllProgress } from './db.js';
import { navigate } from './app.js';

export async function renderSections(container, params = {}) {
  const view = document.createElement('div');
  view.className = 'view';

  const [index, allProgress] = await Promise.all([
    loadIndex(),
    getAllProgress(),
  ]);

  const preselected = new Set(params.preselected || []);

  view.innerHTML = `
    <div class="eyebrow">Step 1 of 2</div>
    <h2 class="view-title">What to study</h2>
    <p class="view-subtitle">Tap to select one or more documents.</p>

    <div class="select-all-row">
      <button class="btn btn-secondary btn-sm" id="select-all">Select all</button>
      <button class="btn btn-secondary btn-sm" id="select-none">Clear</button>
    </div>

    <div id="section-list"></div>
  `;
  container.appendChild(view);

  const listEl = view.querySelector('#section-list');
  const selected = new Set(preselected);

  for (const section of index.sections) {
    const prog = allProgress.find(p => p.sectionId === section.id) || { mcSeen: 0, fcSeen: 0 };
    const totalItems = (section.mcCount || 0) + (section.fcCount || 0);
    const seen = prog.mcSeen + prog.fcSeen;
    const pct = totalItems > 0 ? Math.min(100, Math.round((seen / totalItems) * 100)) : 0;

    const row = document.createElement('button');
    row.className = 'section-row';
    row.dataset.sectionId = section.id;
    row.innerHTML = `
      <div class="section-checkbox">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="section-info">
        <div class="section-title">${section.title}</div>
        <div class="section-meta">${section.mcCount || 0} questions · ${section.fcCount || 0} flashcards</div>
        <div class="section-progress"><div class="section-progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
    if (selected.has(section.id)) row.classList.add('selected');
    row.addEventListener('click', () => {
      if (selected.has(section.id)) {
        selected.delete(section.id);
        row.classList.remove('selected');
      } else {
        selected.add(section.id);
        row.classList.add('selected');
      }
      updateBar();
    });
    listEl.appendChild(row);
  }

  const bar = document.createElement('div');
  bar.className = 'selection-bar';
  bar.innerHTML = `
    <span class="selection-count">0 selected</span>
    <button class="btn btn-primary btn-sm" id="continue-btn" disabled>Continue</button>
  `;
  view.appendChild(bar);

  function updateBar() {
    const count = selected.size;
    bar.querySelector('.selection-count').textContent =
      count === 0 ? 'Nothing selected' :
      count === 1 ? '1 document selected' :
      `${count} documents selected`;
    bar.querySelector('#continue-btn').disabled = count === 0;
  }
  updateBar();

  view.querySelector('#select-all').addEventListener('click', () => {
    for (const section of index.sections) {
      selected.add(section.id);
      const row = listEl.querySelector(`[data-section-id="${section.id}"]`);
      if (row) row.classList.add('selected');
    }
    updateBar();
  });

  view.querySelector('#select-none').addEventListener('click', () => {
    selected.clear();
    listEl.querySelectorAll('.section-row').forEach(r => r.classList.remove('selected'));
    updateBar();
  });

  bar.querySelector('#continue-btn').addEventListener('click', () => {
    if (selected.size === 0) return;
    navigate('mode-picker', { sectionIds: [...selected] });
  });
}
