import { getDb } from '@/db/client';

/** Non-secret settings keys. `model` and `default_provider` are read by B's core: keep the names. */
export type SettingKey = 'theme' | 'model' | 'default_provider' | 'stars';

export async function getSetting(key: SettingKey): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string | null }[]>(
    'SELECT value FROM settings WHERE key = $1',
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM settings WHERE key = $1', [key]);
}
