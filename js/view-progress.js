/* ===========================================================
   view-progress.js — Per-section progress, settings, data export
   =========================================================== */

import { loadIndex } from './content.js';
import { getAllProgress, resetAllProgress, exportData, getReviewQueueCount } from './db.js';
import { navigate, showToast, refreshReviewBadge } from './app.js';

export async function renderProgress(container) {
  const view = document.createElement('div');
  view.className = 'view';

  const [index, allProgress, reviewCount] = await Promise.all([
    loadIndex(),
    getAllProgress(),
    getReviewQueueCount(),
  ]);

  let totalSeen = 0, totalRight = 0;
  for (const p of allProgress) {
    totalSeen += (p.mcSeen || 0) + (p.fcSeen || 0);
    totalRight += (p.mcCorrect || 0) + (p.fcKnown || 0);
  }
  const overallAcc = totalSeen > 0 ? Math.round((totalRight / totalSeen) * 100) : 0;

  view.innerHTML = `
    <h2 class="view-title">Progress</h2>
    <p class="view-subtitle">Your study history across all sections.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${totalSeen}</div><div class="stat-label">Answered</div></div>
      <div class="stat-card"><div class="stat-value">${overallAcc}%</div><div class="stat-label">Accuracy</div></div>
      <div class="stat-card"><div class="stat-value">${reviewCount}</div><div class="stat-label">In review</div></div>
    </div>

    <div class="section-label">By document</div>
    <div id="prog-list"></div>

    <div class="section-label" style="margin-top:32px">Data</div>
    <div class="btn-row">
      <button class="btn btn-secondary" id="export-btn">Export progress (JSON)</button>
      <button class="btn btn-ghost" id="reset-btn">Reset all progress</button>
    </div>
  `;
  container.appendChild(view);

  const list = view.querySelector('#prog-list');
  for (const section of index.sections) {
    const prog = allProgress.find(p => p.sectionId === section.id) || { mcSeen: 0, mcCorrect: 0, fcSeen: 0, fcKnown: 0 };
    const total = (section.mcCount || 0) + (section.fcCount || 0);
    const seen = (prog.mcSeen || 0) + (prog.fcSeen || 0);
    const right = (prog.mcCorrect || 0) + (prog.fcKnown || 0);
    const coverage = total > 0 ? Math.min(100, Math.round((seen / total) * 100)) : 0;
    const accuracy = seen > 0 ? Math.round((right / seen) * 100) : 0;

    const row = document.createElement('div');
    row.className = 'progress-row';
    row.innerHTML = `
      <div class="progress-row-header">
        <div class="progress-row-title">${section.title}</div>
        <div class="progress-row-pct">${coverage}%</div>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${coverage}%"></div></div>
      <div class="progress-row-meta">
        <span>${seen}/${total} seen</span>
        <span>${accuracy}% accuracy</span>
      </div>
    `;
    list.appendChild(row);
  }

  view.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagme-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Progress exported');
  });

  view.querySelector('#reset-btn').addEventListener('click', async () => {
    const confirmed = window.confirm('Reset all progress? This cannot be undone.');
    if (!confirmed) return;
    await resetAllProgress();
    showToast('Progress reset');
    await refreshReviewBadge();
    navigate('progress', {}, { replace: true });
  });
}
