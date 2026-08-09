import { processDb, clearProcessDb, ensureProcessDbOpen, ProcessDB } from '../process/db';

export { processDb, clearProcessDb, ensureProcessDbOpen, ProcessDB };
export const db = processDb;

export async function wipeDatabase(): Promise<void> {
  await clearProcessDb();
}

export async function exportToFiles(): Promise<void> {
  // Publication.json is no longer needed; all state is persisted via markdown files and Dexie tables.
}
