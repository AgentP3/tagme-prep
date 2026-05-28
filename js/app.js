/* ===========================================================
   app.js — Main entry point, router, theme handling
   =========================================================== */

import { getSetting, setSetting, getReviewQueueCount } from './db.js';
import { loadIndex } from './content.js';
import { renderHome } from './view-home.js';
import { renderSections } from './view-sections.js';
import { renderModePicker } from './view-mode-picker.js';
import { renderBrowse } from './view-browse.js';
import { renderFlashcards } from './view-flashcards.js';
import { renderQuiz } from './view-quiz.js';
import { renderReview } from './view-review.js';
import { renderProgress } from './view-progress.js';

/* ----- Theme handling ----- */

async function initTheme() {
  let theme = await getSetting('theme', null);
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  await setSetting('theme', next);
}

/* ----- Router ----- */

// Each route: { view, params, title, showBack, showBottomNav }
const history = [];
let currentRoute = null;

const VIEWS = {
  home: { render: renderHome, title: 'TAGME Prep', showBack: false, showBottomNav: true },
  sections: { render: renderSections, title: 'Choose Sections', showBack: true, showBottomNav: true },
  'mode-picker': { render: renderModePicker, title: 'Study Mode', showBack: true, showBottomNav: false },
  browse: { render: renderBrowse, title: 'Browse', showBack: true, showBottomNav: false },
  flashcards: { render: renderFlashcards, title: 'Flashcards', showBack: true, showBottomNav: false },
  quiz: { render: renderQuiz, title: 'Quiz', showBack: true, showBottomNav: false },
  review: { render: renderReview, title: 'Review', showBack: true, showBottomNav: true },
  progress: { render: renderProgress, title: 'Progress', showBack: false, showBottomNav: true },
};

export async function navigate(viewName, params = {}, opts = {}) {
  const view = VIEWS[viewName];
  if (!view) {
    console.error('Unknown view:', viewName);
    return;
  }

  if (currentRoute && !opts.replace) {
    history.push(currentRoute);
  }
  currentRoute = { view: viewName, params };

  // Update chrome
  document.getElementById('topbar-title').textContent = view.title;
  document.getElementById('back-btn').classList.toggle('hidden', !view.showBack);
  document.getElementById('bottom-nav').classList.toggle('hidden', !view.showBottomNav);

  // Mark active bottom nav button
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Scroll to top
  const container = document.getElementById('view-container');
  container.scrollTop = 0;
  container.innerHTML = '';

  // Render
  await view.render(container, params);
}

export async function goBack() {
  if (history.length === 0) {
    return navigate('home', {}, { replace: true });
  }
  const prev = history.pop();
  currentRoute = null;
  await navigate(prev.view, prev.params, { replace: true });
}

/* ----- Bottom nav handling: bottom-nav switches always reset history ----- */

function handleBottomNav(viewName) {
  history.length = 0;
  currentRoute = null;
  navigate(viewName, {}, { replace: true });
}

/* ----- Boot ----- */

async function boot() {
  await initTheme();

  // Verify content index loads
  try {
    await loadIndex();
  } catch (err) {
    console.error('Content load failed:', err);
    document.getElementById('view-container').innerHTML = `
      <div class="view">
        <div class="empty-state">
          <div class="empty-title">Content not available</div>
          <div class="empty-text">The study guide content could not be loaded. Make sure content/index.json exists.</div>
        </div>
      </div>
    `;
    return;
  }

  // Event wiring
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('back-btn').addEventListener('click', goBack);
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBottomNav(btn.dataset.view));
  });

  // Service worker registration
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  }

  // Start at home
  await navigate('home', {}, { replace: true });
}

boot();

/* ----- Helpers used by views ----- */

export function showToast(message, duration = 2200) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

export async function refreshReviewBadge() {
  const count = await getReviewQueueCount();
  const btn = document.querySelector('.nav-btn[data-view="review"]');
  if (!btn) return;
  const existing = btn.querySelector('.review-badge');
  if (existing) existing.remove();
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'review-badge';
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.cssText = 'position:absolute;top:6px;right:30%;background:var(--accent);color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;line-height:1;';
    btn.style.position = 'relative';
    btn.appendChild(badge);
  }
}
