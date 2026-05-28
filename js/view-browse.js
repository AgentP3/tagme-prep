/* ===========================================================
   view-browse.js — Browse source material for selected sections
   =========================================================== */

import { loadSections } from './content.js';

export async function renderBrowse(container, params = {}) {
  const view = document.createElement('div');
  view.className = 'view';

  const sectionIds = params.sectionIds || [];
  const sections = await loadSections(sectionIds);

  if (sections.length === 0) {
    view.innerHTML = `<div class="empty-state"><div class="empty-title">No content</div></div>`;
    container.appendChild(view);
    return;
  }

  let html = '';
  for (const s of sections) {
    html += `
      <div class="eyebrow">${s.documentRef || ''}</div>
      <h2 class="view-title">${s.title}</h2>
      ${s.description ? `<p class="view-subtitle">${s.description}</p>` : ''}
      <div class="browse-content">${renderBrowseBody(s)}</div>
      <div class="divider"></div>
    `;
  }

  view.innerHTML = html;
  container.appendChild(view);
}

function renderBrowseBody(section) {
  if (section.browseContent && Array.isArray(section.browseContent)) {
    return section.browseContent.map(block => {
      if (block.type === 'heading') return `<h2>${escapeHtml(block.text)}</h2>`;
      if (block.type === 'subheading') return `<h3>${escapeHtml(block.text)}</h3>`;
      if (block.type === 'paragraph') return `<p>${escapeHtml(block.text)}</p>`;
      if (block.type === 'list') {
        const items = (block.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      if (block.type === 'numbered') {
        const items = (block.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
        return `<ol>${items}</ol>`;
      }
      return '';
    }).join('');
  }
  // Fallback: derive a summary from flashcards
  if (section.flashcards && section.flashcards.length > 0) {
    let body = '<p><em>Reading mode for this section is not yet populated. Showing key terms instead.</em></p>';
    for (const fc of section.flashcards.slice(0, 30)) {
      body += `<h3>${escapeHtml(fc.front)}</h3><p>${escapeHtml(fc.back)}</p>`;
    }
    return body;
  }
  return '<p><em>No content available yet.</em></p>';
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
