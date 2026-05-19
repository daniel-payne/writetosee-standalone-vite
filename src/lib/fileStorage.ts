/**
 * fileStorage.ts
 * Provides utility functions to interact with the local file system using the File System Access API.
 * It stores the DirectoryHandle in IndexedDB to persist access across sessions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const DB_NAME = 'WriteToSeeFileStorageDB';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'directoryHandle';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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

// Save handle to IndexedDB
async function saveHandle(handle: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Load handle from IndexedDB
async function loadHandle(): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Remove handle from IndexedDB
async function removeHandle(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Prompt the user to select a directory and save the handle.
 */
export async function selectDirectory(): Promise<any> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  const handle = await (window as any).showDirectoryPicker({
    mode: 'readwrite'
  });
  await saveHandle(handle);
  return handle;
}

/**
 * Check if we have a saved directory handle.
 */
export async function hasSavedDirectory(): Promise<boolean> {
  const handle = await loadHandle();
  return handle !== null;
}

/**
 * Disconnect/Forget the current directory.
 */
export async function disconnectDirectory(): Promise<void> {
  await removeHandle();
}

/**
 * Verify read/write permissions for a directory handle.
 * Prompts user for permission if not already granted.
 */
export async function verifyPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  const options = {
    mode: readWrite ? 'readwrite' : 'read'
  };
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

/**
 * Get the saved directory handle and verify permissions.
 */
export async function getDirectoryHandle(): Promise<any | null> {
  const handle = await loadHandle();
  if (!handle) return null;

  const hasPermission = await verifyPermission(handle, true);
  if (!hasPermission) {
    throw new Error('Permission denied to access the directory.');
  }
  return handle;
}

/**
 * Write a file (text or binary/blob) to the saved directory.
 */
export async function writeFile(fileName: string, content: string | Blob): Promise<void> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    throw new Error('No directory selected or access not granted.');
  }

  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Read a file's content from the saved directory.
 */
export async function readFile(fileName: string): Promise<File> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    throw new Error('No directory selected or access not granted.');
  }

  const fileHandle = await dirHandle.getFileHandle(fileName);
  return await fileHandle.getFile();
}

/**
 * List all files in the saved directory.
 */
export async function listFiles(): Promise<string[]> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    return [];
  }

  const fileNames: string[] = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      fileNames.push(entry.name);
    }
  }
  return fileNames;
}

/**
 * Get the name of the currently connected directory.
 */
export async function getDirectoryName(): Promise<string | null> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    return null;
  }
  return dirHandle.name;
}


