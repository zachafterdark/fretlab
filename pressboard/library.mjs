export function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pressboard-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('board');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function loadLibrary(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction('board').objectStore('board').get('sounds');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function updateLibrary(database, update) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('board', 'readwrite');
    const store = transaction.objectStore('board');
    const request = store.get('sounds');
    let next;
    let error;
    request.onsuccess = () => {
      try {
        next = update(request.result || []);
        store.put(next, 'sounds');
      } catch (cause) {
        error = cause;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onabort = () => reject(error || transaction.error || Error('Library update failed.'));
  });
}
