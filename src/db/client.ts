import Database from '@tauri-apps/plugin-sql';

let dbPromise: Promise<Database> | null = null;

/** The single SQLite handle shared by all stores. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:uniworld.db').catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
