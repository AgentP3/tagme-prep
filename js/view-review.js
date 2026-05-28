/* ===========================================================
   view-review.js — Adaptive review of missed items
   Pulls from the review queue and routes each item to MC or FC flow.
   Items leave the queue after 2 consecutive correct answers.
   =========================================================== */

import { getReviewQueue, recordMCAttempt, recordFlashcard } from './db.js';
import { hydrateReviewItems, shuffle } from './content.js';
import { navigate, refreshReviewBadge, goBack } from './app.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export async function renderReview(container) {
  const view = document.createElement('div');
  view.className = 'view';

  const queue = await getReviewQueue();
  const items = shuffle(await hydrateReviewItems(queue));

  if (items.length === 0) {
    view.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <div class="empty-title">Nothing to review</div>
        <div class="empty-text">Missed items will appear here. Get them right twice in a row to clear them out.</div>
        <button class="btn btn-primary" id="start-btn">Start studying</button>
      </div>
    `;
    container.appendChild(view);
    view.querySelector('#start-btn').addEventListener('click', () => navigate('sections'));
    return;
  }

  let idx = 0;
  let resolvedCount = 0;

  view.innerHTML = `
    <div class="eyebrow">Adaptive review</div>
    <h2 class="view-title">${items.length} item${items.length === 1 ? '' : 's'} to revisit</h2>
    <p class="view-subtitle">Answer correctly twice to clear an item from review.</p>
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" id="rp-fill" style="width:0%"></div></div>
    <div id="review-content"></div>
  `;
  container.appendChild(view);

  const contentEl = view.querySelector('#review-content');
  const fillEl = view.querySelector('#rp-fill');

  function renderItem() {
    if (idx >= items.length) {
      renderComplete();
      return;
    }
    fillEl.style.width = `${(idx / items.length) * 100}%`;
    const item = items[idx];
    if (item.itemType === 'mc') renderMC(item);
    else renderFC(item);
  }

  function renderMC(q) {
    const indexed = q.options.map((text, i) => ({ text, originalIndex: i }));
    const shuffled = shuffle(indexed);
    contentEl.innerHTML = `
      <div class="quiz-counter">Item ${idx + 1} of ${items.length} · Question</div>
      <div class="quiz-stem">${escapeHtml(q.stem)}</div>
      <div class="quiz-options" id="opts">
        ${shuffled.map((opt, i) => `
          <button class="quiz-option" data-orig="${opt.originalIndex}">
            <span class="option-letter">${LETTERS[i]}</span>
            <span class="option-text">${escapeHtml(opt.text)}</span>
          </button>
        `).join('')}
      </div>
      <div id="fb"></div>
    `;
    contentEl.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chosen = parseInt(btn.dataset.orig, 10);
        const correct = chosen === q.correctIndex;
        contentEl.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          const o = parseInt(b.dataset.orig, 10);
          if (o === q.correctIndex) b.classList.add('correct');
          else if (b === btn) b.classList.add('incorrect');
        });
        const fb = contentEl.querySelector('#fb');
        fb.innerHTML = `
          <div class="quiz-feedback ${correct ? 'correct' : ''}">
            <div class="feedback-verdict">${correct ? 'Correct' : 'Not quite'}</div>
            ${q.explanation ? `<div class="feedback-explanation">${escapeHtml(q.explanation)}</div>` : ''}
            ${renderCitation(q.citation)}
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="next">${idx === items.length - 1 ? 'Finish' : 'Next'}</button>
          </div>
        `;
        await recordMCAttempt(q.sectionId, q.id, correct);
        if (correct) resolvedCount++;
        refreshReviewBadge();
        fb.querySelector('#next').addEventListener('click', () => { idx++; renderItem(); });
      });
    });
  }

  function renderFC(card) {
    let flipped = false;
    contentEl.innerHTML = `
      <div class="quiz-counter">Item ${idx + 1} of ${items.length} · Flashcard</div>
      <div class="flashcard-stage">
        <div class="flashcard" id="fc">
          <div class="flashcard-face">
            <div class="flashcard-front-text">${escapeHtml(card.front)}</div>
          </div>
          <div class="flashcard-hint">Tap to reveal</div>
        </div>
        <div class="flashcard-actions" id="acts" style="visibility:hidden">
          <button class="btn btn-unknown" id="u">Didn't know</button>
          <button class="btn btn-known" id="k">Knew it</button>
        </div>
      </div>
    `;
    const fc = contentEl.querySelector('#fc');
    const acts = contentEl.querySelector('#acts');
    fc.addEventListener('click', () => {
      if (flipped) return;
      flipped = true;
      fc.innerHTML = `
        <div class="flashcard-face">
          <div class="flashcard-back-text">${escapeHtml(card.back)}</div>
          ${renderFCCitation(card.citation)}
        </div>
      `;
      acts.style.visibility = 'visible';
    });
    async function ans(known) {
      await recordFlashcard(card.sectionId, card.id, known);
      if (known) resolvedCount++;
      refreshReviewBadge();
      idx++;
      renderItem();
    }
    contentEl.querySelector('#k').addEventListener('click', () => ans(true));
    contentEl.querySelector('#u').addEventListener('click', () => ans(false));
  }

  function renderComplete() {
    fillEl.style.width = '100%';
    contentEl.innerHTML = `
      <div class="completion-screen">
        <div class="completion-eyebrow">Review session complete</div>
        <h2 class="completion-title">Nice work</h2>
        <p class="view-subtitle" style="text-align:center">${resolvedCount} of ${items.length} answered correctly this round.</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="more">Continue reviewing</button>
          <button class="btn btn-secondary" id="done">Back to home</button>
        </div>
      </div>
    `;
    contentEl.querySelector('#more').addEventListener('click', () => renderReview(container));
    contentEl.querySelector('#done').addEventListener('click', () => navigate('home', {}, { replace: true }));
  }

  renderItem();
}

function renderCitation(c) {
  if (!c) return '';
  return `
    <div class="citation" style="margin-top:12px">
      <div class="citation-label">Source</div>
      ${c.source ? `<div class="citation-source">${escapeHtml(c.source)}</div>` : ''}
      ${c.quote ? `<div class="citation-quote">${escapeHtml(c.quote)}</div>` : ''}
    </div>
  `;
}

function renderFCCitation(c) {
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
