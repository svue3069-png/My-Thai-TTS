import { AudioItem } from '../types';

const DB_NAME = 'ThaiTTSStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_items';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('favorite', 'favorite', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioItem(item: AudioItem): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve(item.id);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAudioItems(): Promise<AudioItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const items = (request.result as AudioItem[]).reverse();
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAudioItem(id: string): Promise<AudioItem | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAudioItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const item = await getAudioItem(id);
  if (!item) return false;
  item.favorite = !item.favorite;
  await saveAudioItem(item);
  return item.favorite;
}

export async function updateAudioItemTitle(id: string, newTitle: string): Promise<void> {
  const item = await getAudioItem(id);
  if (item) {
    item.title = newTitle;
    await saveAudioItem(item);
  }
}

export async function getStorageQuota(): Promise<{ count: number; estimatedSizeMB: number }> {
  try {
    const items = await getAllAudioItems();
    let totalBytes = 0;
    for (const item of items) {
      if (item.audioBlob) {
        totalBytes += item.audioBlob.size;
      }
    }
    return {
      count: items.length,
      estimatedSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    };
  } catch {
    return { count: 0, estimatedSizeMB: 0 };
  }
}

export async function clearAllAudioItems(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
