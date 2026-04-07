// GAITBRIDGE — Video Store (IndexedDB)
// Temporary video storage for analysis pipeline.
// Videos are stored as Blobs, keyed by session ID.
// Deleted after analysis completes. No server upload.

const DB_NAME = 'gaitbridge_video_store';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store a video file in IndexedDB.
 * Returns the key used for retrieval.
 */
export async function storeVideo(sessionId: string, file: File): Promise<string> {
  const db = await openDB();
  const key = `video_${sessionId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put({
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      storedAt: Date.now(),
    }, key);

    tx.oncomplete = () => {
      db.close();
      resolve(key);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Retrieve a stored video Blob.
 */
export async function getVideo(sessionId: string): Promise<{ blob: Blob; name: string; type: string; size: number } | null> {
  const db = await openDB();
  const key = `video_${sessionId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Delete a video after analysis is complete.
 */
export async function deleteVideo(sessionId: string): Promise<void> {
  const db = await openDB();
  const key = `video_${sessionId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
