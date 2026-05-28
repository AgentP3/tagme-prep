/* ===========================================================
   view-quiz.js — Multiple choice quiz mode
   Citation shown on every answer, right or wrong.
   =========================================================== */

import { gatherMC, shuffle } from './content.js';
import { recordMCAttempt } from './db.js';
import { navigate, refreshReviewBadge, goBack } from './app.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export async function renderQuiz(container, params = {}) {
  const view = document.createElement('div');
  view.className = 'view';

  const sectionIds = params.sectionIds || [];
  let questions = await gatherMC(sectionIds);
  questions = shuffle(questions);

  if (questions.length === 0) {
    view.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No questions</div>
        <div class="empty-text">No quiz questions in this selection yet.</div>
        <button class="btn btn-primary" id="back-empty">Back</button>
      </div>
    `;
    container.appendChild(view);
    view.querySelector('#back-empty').addEventListener('click', goBack);
    return;
  }

  let idx = 0;
  let correctCount = 0;

  view.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" id="qp-fill" style="width:0%"></div></div>
    <div id="quiz-content"></div>
  `;
  container.appendChild(view);

  const contentEl = view.querySelector('#quiz-content');
  const fillEl = view.querySelector('#qp-fill');

  function renderQuestion() {
    if (idx >= questions.length) {
      renderComplete();
      return;
    }
    const q = questions[idx];
    fillEl.style.width = `${(idx / questions.length) * 100}%`;

    // Shuffle option order while remembering the correct index
    const indexed = q.options.map((text, i) => ({ text, originalIndex: i }));
    const shuffled = shuffle(indexed);

    contentEl.innerHTML = `
      <div class="quiz-counter">Question ${idx + 1} of ${questions.length}</div>
      <div class="quiz-stem">${escapeHtml(q.stem)}</div>
      <div class="quiz-options" id="quiz-options">
        ${shuffled.map((opt, i) => `
          <button class="quiz-option" data-original-index="${opt.originalIndex}">
            <span class="option-letter">${LETTERS[i]}</span>
            <span class="option-text">${escapeHtml(opt.text)}</span>
          </button>
        `).join('')}
      </div>
      <div id="feedback-slot"></div>
    `;

    const optionsContainer = contentEl.querySelector('#quiz-options');
    optionsContainer.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(q, btn, optionsContainer));
    });
  }

  async function handleAnswer(q, clickedBtn, optionsContainer) {
    const chosen = parseInt(clickedBtn.dataset.originalIndex, 10);
    const correct = chosen === q.correctIndex;
    if (correct) correctCount++;

    // Mark all options visually
    optionsContainer.querySelectorAll('.quiz-option').forEach(btn => {
      const origIdx = parseInt(btn.dataset.originalIndex, 10);
      btn.disabled = true;
      if (origIdx === q.correctIndex) btn.classList.add('correct');
      else if (btn === clickedBtn) btn.classList.add('incorrect');
    });

    // Feedback block with explanation + citation
    const feedbackSlot = contentEl.querySelector('#feedback-slot');
    feedbackSlot.innerHTML = `
      <div class="quiz-feedback ${correct ? 'correct' : ''}">
        <div class="feedback-verdict">${correct ? 'Correct' : 'Not quite'}</div>
        ${q.explanation ? `<div class="feedback-explanation">${escapeHtml(q.explanation)}</div>` : ''}
        ${renderCitation(q.citation)}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="next-btn">${idx === questions.length - 1 ? 'Finish' : 'Next question'}</button>
      </div>
    `;

    feedbackSlot.querySelector('#next-btn').addEventListener('click', async () => {
      idx++;
      renderQuestion();
    });

    // Record
    await recordMCAttempt(q.sectionId, q.id, correct);
    refreshReviewBadge();
  }

  function renderComplete() {
    fillEl.style.width = '100%';
    const pct = Math.round((correctCount / questions.length) * 100);
    contentEl.innerHTML = `
      <div class="completion-screen">
        <div class="completion-eyebrow">Quiz complete</div>
        <h2 class="completion-title">${pct}%</h2>
        <div class="completion-stats">
          <div class="stat-card"><div class="stat-value">${correctCount}</div><div class="stat-label">Right</div></div>
          <div class="stat-card"><div class="stat-value">${questions.length - correctCount}</div><div class="stat-label">Wrong</div></div>
          <div class="stat-card"><div class="stat-value">${questions.length}</div><div class="stat-label">Total</div></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="again-btn">Take again</button>
          <button class="btn btn-secondary" id="done-btn">Done</button>
        </div>
      </div>
    `;
    contentEl.querySelector('#again-btn').addEventListener('click', () => {
      renderQuiz(container, params);
    });
    contentEl.querySelector('#done-btn').addEventListener('click', () => {
      navigate('home', {}, { replace: true });
    });
  }

  renderQuestion();
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

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
