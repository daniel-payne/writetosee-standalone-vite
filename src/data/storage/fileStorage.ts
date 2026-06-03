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
 * Check if readwrite permission is already granted for the saved directory handle.
 */
export async function isPermissionGranted(): Promise<boolean> {
  const handle = await loadHandle();
  if (!handle) return false;
  try {
    const status = await handle.queryPermission({ mode: 'readwrite' });
    return status === 'granted';
  } catch (err) {
    console.warn('Error querying directory handle permission:', err);
    return false;
  }
}

/**
 * Get the name of the saved directory without querying/verifying permission.
 */
export async function getSavedDirectoryName(): Promise<string | null> {
  const handle = await loadHandle();
  return handle ? handle.name : null;
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
 * Helper to resolve nested directory handles.
 */
async function getDirectoryHandleForPath(
  rootHandle: any,
  pathSegments: string[],
  create: boolean = false
): Promise<any> {
  let currentHandle = rootHandle;
  for (const segment of pathSegments) {
    if (segment && segment !== '.' && segment !== '..') {
      currentHandle = await currentHandle.getDirectoryHandle(segment, { create });
    }
  }
  return currentHandle;
}

/**
 * Write a file (text or binary/blob) to the saved directory, supporting subdirectories (e.g. "sub/dir/file.txt")
 */
export async function writeFile(fileName: string, content: string | Blob): Promise<void> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    throw new Error('No directory selected or access not granted.');
  }

  const parts = fileName.split('/');
  const fileLeaf = parts.pop()!;
  
  const targetDirHandle = await getDirectoryHandleForPath(dirHandle, parts, true);
  const fileHandle = await targetDirHandle.getFileHandle(fileLeaf, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Read a file's content from the saved directory, supporting subdirectories (e.g. "sub/dir/file.txt")
 */
export async function readFile(fileName: string): Promise<File> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    throw new Error('No directory selected or access not granted.');
  }

  const parts = fileName.split('/');
  const fileLeaf = parts.pop()!;

  const targetDirHandle = await getDirectoryHandleForPath(dirHandle, parts, false);
  const fileHandle = await targetDirHandle.getFileHandle(fileLeaf);
  return await fileHandle.getFile();
}

/**
 * Delete a file from the saved directory, supporting subdirectories (e.g. "sub/dir/file.txt")
 */
export async function deleteFile(fileName: string): Promise<void> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    throw new Error('No directory selected or access not granted.');
  }

  const parts = fileName.split('/');
  const fileLeaf = parts.pop()!;

  const targetDirHandle = await getDirectoryHandleForPath(dirHandle, parts, false);
  await targetDirHandle.removeEntry(fileLeaf);
}


/**
 * List all files in the saved directory recursively, returning relative paths.
 */
export async function listFiles(): Promise<string[]> {
  const dirHandle = await getDirectoryHandle();
  if (!dirHandle) {
    return [];
  }

  const filePaths: string[] = [];

  async function collect(handle: any, currentPath: string) {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        filePaths.push(entryPath);
      } else if (entry.kind === 'directory') {
        await collect(entry, entryPath);
      }
    }
  }

  await collect(dirHandle, '');
  return filePaths;
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


