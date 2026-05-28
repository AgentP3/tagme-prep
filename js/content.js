/* ===========================================================
   content.js — Content loader
   Loads the section index and individual section files
   =========================================================== */

let indexCache = null;
const sectionCache = new Map();

export async function loadIndex() {
  if (indexCache) return indexCache;
  const res = await fetch('content/index.json');
  if (!res.ok) throw new Error('Failed to load content index');
  indexCache = await res.json();
  return indexCache;
}

export async function loadSection(sectionId) {
  if (sectionCache.has(sectionId)) return sectionCache.get(sectionId);
  const res = await fetch(`content/${sectionId}.json`);
  if (!res.ok) throw new Error(`Failed to load section ${sectionId}`);
  const data = await res.json();
  sectionCache.set(sectionId, data);
  return data;
}

export async function loadSections(sectionIds) {
  return Promise.all(sectionIds.map(loadSection));
}

/**
 * Collect all flashcards across given sections, preserving sectionId on each.
 */
export async function gatherFlashcards(sectionIds) {
  const sections = await loadSections(sectionIds);
  const cards = [];
  for (const s of sections) {
    for (const fc of (s.flashcards || [])) {
      cards.push({ ...fc, sectionId: s.id, sectionTitle: s.title });
    }
  }
  return cards;
}

/**
 * Collect all MC questions across given sections.
 */
export async function gatherMC(sectionIds) {
  const sections = await loadSections(sectionIds);
  const qs = [];
  for (const s of sections) {
    for (const q of (s.mcQuestions || [])) {
      qs.push({ ...q, sectionId: s.id, sectionTitle: s.title });
    }
  }
  return qs;
}

/**
 * Look up a single item by id across given sections.
 * Used by the review queue to fetch full item data from stored ids.
 */
export async function findItem(itemId, itemType, sectionId) {
  const s = await loadSection(sectionId);
  const arr = itemType === 'mc' ? (s.mcQuestions || []) : (s.flashcards || []);
  const item = arr.find(x => x.id === itemId);
  if (!item) return null;
  return { ...item, sectionId: s.id, sectionTitle: s.title };
}

/**
 * Hydrate review queue entries into full items.
 */
export async function hydrateReviewItems(queueEntries) {
  const items = [];
  for (const entry of queueEntries) {
    const item = await findItem(entry.itemId, entry.itemType, entry.sectionId);
    if (item) {
      items.push({ ...item, itemType: entry.itemType });
    }
  }
  return items;
}

/* Utilities */

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
