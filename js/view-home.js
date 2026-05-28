/* ===========================================================
   view-home.js — Home dashboard
   =========================================================== */

import { loadIndex } from './content.js';
import { getAllProgress, getReviewQueueCount } from './db.js';
import { navigate, refreshReviewBadge } from './app.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night studies';
}

export async function renderHome(container) {
  const view = document.createElement('div');
  view.className = 'view';

  const [index, allProgress, reviewCount] = await Promise.all([
    loadIndex(),
    getAllProgress(),
    getReviewQueueCount(),
  ]);

  // Aggregate stats
  const totals = aggregateTotals(index, allProgress);

  view.innerHTML = `
    <div class="greeting">${greeting()}.</div>
    <h2 class="hero-title">Let's <span class="accent">study</span>.</h2>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${totals.mcSeen}</div>
        <div class="stat-label">Questions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totals.fcSeen}</div>
        <div class="stat-label">Flashcards</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totals.accuracy}%</div>
        <div class="stat-label">Accuracy</div>
      </div>
    </div>

    <div class="section-label">Start studying</div>
    <div class="quick-actions">
      <button class="btn btn-primary" id="qa-study">Choose sections to study</button>
      <button class="btn btn-secondary" id="qa-review" ${reviewCount === 0 ? 'disabled' : ''}>
        ${reviewCount === 0 ? 'No items to review' : `Review missed items (${reviewCount})`}
      </button>
    </div>

    <div class="section-label">Documents</div>
    <div id="doc-list"></div>
  `;

  container.appendChild(view);

  view.querySelector('#qa-study').addEventListener('click', () => navigate('sections'));
  view.querySelector('#qa-review').addEventListener('click', () => navigate('review'));

  // Document list (tap to jump straight into mode picker for that one)
  const docList = view.querySelector('#doc-list');
  for (const section of index.sections) {
    const prog = allProgress.find(p => p.sectionId === section.id) || { mcSeen: 0, fcSeen: 0 };
    const totalItems = (section.mcCount || 0) + (section.fcCount || 0);
    const seen = prog.mcSeen + prog.fcSeen;
    const pct = totalItems > 0 ? Math.min(100, Math.round((seen / totalItems) * 100)) : 0;

    const row = document.createElement('button');
    row.className = 'card-link';
    row.innerHTML = `
      <div class="card-title">${section.title}</div>
      <div class="card-meta">
        <span>${section.mcCount || 0} questions</span>
        <span class="card-meta-dot"></span>
        <span>${section.fcCount || 0} flashcards</span>
        <span class="card-meta-dot"></span>
        <span>${pct}% covered</span>
      </div>
    `;
    row.addEventListener('click', () => {
      navigate('mode-picker', { sectionIds: [section.id] });
    });
    docList.appendChild(row);
  }

  refreshReviewBadge();
}

function aggregateTotals(index, allProgress) {
  let mcSeen = 0, mcCorrect = 0, fcSeen = 0, fcKnown = 0;
  for (const p of allProgress) {
    mcSeen += p.mcSeen || 0;
    mcCorrect += p.mcCorrect || 0;
    fcSeen += p.fcSeen || 0;
    fcKnown += p.fcKnown || 0;
  }
  const totalAnswered = mcSeen + fcSeen;
  const totalRight = mcCorrect + fcKnown;
  const accuracy = totalAnswered > 0 ? Math.round((totalRight / totalAnswered) * 100) : 0;
  return { mcSeen, mcCorrect, fcSeen, fcKnown, accuracy };
}
