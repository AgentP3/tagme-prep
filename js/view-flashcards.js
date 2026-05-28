/* ===========================================================
   view-flashcards.js — Flashcard study mode
   Tap card to flip front→back, then mark Known or Didn't Know
   =========================================================== */

import { gatherFlashcards, shuffle } from './content.js';
import { recordFlashcard } from './db.js';
import { navigate, goBack, refreshReviewBadge } from './app.js';

export async function renderFlashcards(container, params = {}) {
  const view = document.createElement('div');
  view.className = 'view';

  const sectionIds = params.sectionIds || [];
  let cards = await gatherFlashcards(sectionIds);
  cards = shuffle(cards);

  if (cards.length === 0) {
    view.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No flashcards</div>
        <div class="empty-text">No flashcards in this selection yet.</div>
        <button class="btn btn-primary" id="back-empty">Back</button>
      </div>
    `;
    container.appendChild(view);
    view.querySelector('#back-empty').addEventListener('click', goBack);
    return;
  }

  let idx = 0;
  let knownCount = 0;
  let unknownCount = 0;
  let flipped = false;

  view.innerHTML = `
    <div class="flashcard-stage">
      <div class="flashcard-progress" id="fc-progress"></div>
      <div class="flashcard" id="flashcard"></div>
      <div class="flashcard-actions" id="fc-actions" style="visibility:hidden">
        <button class="btn btn-unknown" id="btn-unknown">Didn't know</button>
        <button class="btn btn-known" id="btn-known">Knew it</button>
      </div>
    </div>
  `;
  container.appendChild(view);

  const cardEl = view.querySelector('#flashcard');
  const progressEl = view.querySelector('#fc-progress');
  const actionsEl = view.querySelector('#fc-actions');

  function renderCard() {
    if (idx >= cards.length) {
      renderComplete();
      return;
    }
    const card = cards[idx];
    flipped = false;
    progressEl.textContent = `${idx + 1} / ${cards.length}`;
    actionsEl.style.visibility = 'hidden';

    cardEl.innerHTML = `
      <div class="flashcard-face">
        <div class="flashcard-front-text">${escapeHtml(card.front)}</div>
      </div>
      <div class="flashcard-hint">Tap to reveal</div>
    `;
  }

  function flipCard() {
    if (flipped) return;
    flipped = true;
    const card = cards[idx];
    cardEl.innerHTML = `
      <div class="flashcard-face">
        <div class="flashcard-back-text">${escapeHtml(card.back)}</div>
        ${renderCitation(card.citation)}
      </div>
    `;
    actionsEl.style.visibility = 'visible';
  }

  async function answer(known) {
    const card = cards[idx];
    await recordFlashcard(card.sectionId, card.id, known);
    if (known) knownCount++; else unknownCount++;
    idx++;
    renderCard();
    refreshReviewBadge();
  }

  function renderComplete() {
    const total = knownCount + unknownCount;
    const pct = total > 0 ? Math.round((knownCount / total) * 100) : 0;
    view.innerHTML = `
      <div class="completion-screen">
        <div class="completion-eyebrow">Session complete</div>
        <h2 class="completion-title">${pct}% known</h2>
        <div class="completion-stats">
          <div class="stat-card"><div class="stat-value">${knownCount}</div><div class="stat-label">Knew</div></div>
          <div class="stat-card"><div class="stat-value">${unknownCount}</div><div class="stat-label">Missed</div></div>
          <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="again-btn">Study again</button>
          <button class="btn btn-secondary" id="done-btn">Done</button>
        </div>
      </div>
    `;
    view.querySelector('#again-btn').addEventListener('click', () => {
      renderFlashcards(container, params);
    });
    view.querySelector('#done-btn').addEventListener('click', () => {
      navigate('home', {}, { replace: true });
    });
  }

  cardEl.addEventListener('click', flipCard);
  view.querySelector('#btn-known').addEventListener('click', () => answer(true));
  view.querySelector('#btn-unknown').addEventListener('click', () => answer(false));

  renderCard();
}

function renderCitation(c) {
  if (!c) return '';
  return `
    <div class="flashcard-citation">
      <div class="citation">
        <div class="citation-label">Source</div>
        ${c.source ? `<div class="citation-source">${escapeHtml(c.source)}</div>` : ''}
        ${c.quote ? `<div class="citation-quote">${escapeHtml(c.quote)}</div>` : ''}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
