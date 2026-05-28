/* ===========================================================
   db.js — IndexedDB wrapper
   Stores: progress (per-section), attempts (every quiz answer),
           review_queue (missed items), flashcard_state, settings
   =========================================================== */

const DB_NAME = 'tagme_prep';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('progress')) {
        // key: sectionId — value: { mcSeen, mcCorrect, fcSeen, fcKnown, lastStudied }
        db.createObjectStore('progress', { keyPath: 'sectionId' });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        // each attempt: { id (auto), itemId, itemType, sectionId, correct, ts }
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('itemId', 'itemId', { unique: false });
        s.createIndex('sectionId', 'sectionId', { unique: false });
        s.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains('review_queue')) {
        // key: itemId — value: { itemId, itemType, sectionId, addedAt, consecutiveCorrect }
        db.createObjectStore('review_queue', { keyPath: 'itemId' });
      }
      if (!db.objectStoreNames.contains('flashcard_state')) {
        // key: itemId — value: { itemId, sectionId, knownCount, unknownCount, lastSeen }
        db.createObjectStore('flashcard_state', { keyPath: 'itemId' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        // key: settingKey — value: { key, value }
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
}

async function tx(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName) {
  const s = await tx(storeName);
  return p(s.getAll());
}

async function get(storeName, key) {
  const s = await tx(storeName);
  return p(s.get(key));
}

async function put(storeName, value) {
  const s = await tx(storeName, 'readwrite');
  return p(s.put(value));
}

async function del(storeName, key) {
  const s = await tx(storeName, 'readwrite');
  return p(s.delete(key));
}

async function clear(storeName) {
  const s = await tx(storeName, 'readwrite');
  return p(s.clear());
}

/* ----- Settings ----- */

export async function getSetting(key, fallback = null) {
  const r = await get('settings', key);
  return r ? r.value : fallback;
}

export async function setSetting(key, value) {
  return put('settings', { key, value });
}

/* ----- Progress ----- */

export async function getProgress(sectionId) {
  const r = await get('progress', sectionId);
  return r || {
    sectionId,
    mcSeen: 0,
    mcCorrect: 0,
    fcSeen: 0,
    fcKnown: 0,
    lastStudied: null,
  };
}

export async function getAllProgress() {
  return getAll('progress');
}

export async function recordMCAttempt(sectionId, itemId, correct) {
  const prog = await getProgress(sectionId);
  prog.mcSeen += 1;
  if (correct) prog.mcCorrect += 1;
  prog.lastStudied = Date.now();
  await put('progress', prog);
  await put('attempts', {
    itemId, itemType: 'mc', sectionId, correct, ts: Date.now(),
  });
  if (correct) {
    await updateReviewQueueOnCorrect(itemId);
  } else {
    await addToReviewQueue(itemId, 'mc', sectionId);
  }
}

export async function recordFlashcard(sectionId, itemId, known) {
  const prog = await getProgress(sectionId);
  prog.fcSeen += 1;
  if (known) prog.fcKnown += 1;
  prog.lastStudied = Date.now();
  await put('progress', prog);

  const state = (await get('flashcard_state', itemId)) || {
    itemId, sectionId, knownCount: 0, unknownCount: 0, lastSeen: 0,
  };
  if (known) state.knownCount += 1; else state.unknownCount += 1;
  state.lastSeen = Date.now();
  await put('flashcard_state', state);

  await put('attempts', {
    itemId, itemType: 'fc', sectionId, correct: known, ts: Date.now(),
  });

  if (known) {
    await updateReviewQueueOnCorrect(itemId);
  } else {
    await addToReviewQueue(itemId, 'fc', sectionId);
  }
}

/* ----- Review queue ----- */

const REVIEW_GRADUATION_THRESHOLD = 2; // consecutive correct to leave queue

export async function addToReviewQueue(itemId, itemType, sectionId) {
  const existing = await get('review_queue', itemId);
  if (existing) {
    existing.consecutiveCorrect = 0;
    existing.lastMissedAt = Date.now();
    return put('review_queue', existing);
  }
  return put('review_queue', {
    itemId, itemType, sectionId,
    addedAt: Date.now(),
    lastMissedAt: Date.now(),
    consecutiveCorrect: 0,
  });
}

export async function updateReviewQueueOnCorrect(itemId) {
  const existing = await get('review_queue', itemId);
  if (!existing) return; // not in queue, nothing to do
  existing.consecutiveCorrect = (existing.consecutiveCorrect || 0) + 1;
  if (existing.consecutiveCorrect >= REVIEW_GRADUATION_THRESHOLD) {
    return del('review_queue', itemId);
  }
  return put('review_queue', existing);
}

export async function getReviewQueue() {
  return getAll('review_queue');
}

export async function getReviewQueueCount() {
  return (await getReviewQueue()).length;
}

/* ----- Maintenance ----- */

export async function resetAllProgress() {
  await clear('progress');
  await clear('attempts');
  await clear('review_queue');
  await clear('flashcard_state');
}

export async function exportData() {
  return {
    exportedAt: new Date().toISOString(),
    progress: await getAll('progress'),
    attempts: await getAll('attempts'),
    review_queue: await getAll('review_queue'),
    flashcard_state: await getAll('flashcard_state'),
    settings: await getAll('settings'),
  };
}
