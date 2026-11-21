import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type Database from '@tauri-apps/plugin-sql';
import { getDb } from '@/db/client';
import { getSecret } from '@/store/secrets';
import { useProfile } from '@/store/profile';
import type { Provider } from '../contracts';
import type {
  HttpClient,
  HttpRequestInit,
  HttpResponseLike,
  ProfileStore,
  SecretStore,
  SettingsStore,
  SqlClient,
} from '../ports';

/** Network through the Rust plugin, so there are no CORS limits. */
export class TauriHttpClient implements HttpClient {
  async fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    const response = await tauriFetch(url, {
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
      signal: init?.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
      json: () => response.json() as Promise<unknown>,
      body: response.body,
      url: response.url,
    };
  }
}

/** Wraps A's single tauri-plugin-sql handle in the core's SqlClient port. */
export class TauriSqlClient implements SqlClient {
  constructor(private readonly db: Database) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.select<T[]>(sql, params);
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId?: number }> {
    const result = await this.db.execute(sql, params);
    return { lastInsertId: result.lastInsertId };
  }
}

export async function createTauriSqlClient(): Promise<TauriSqlClient> {
  return new TauriSqlClient(await getDb());
}

/** API keys live in the OS keychain via A's `store/secrets.ts`. */
export const tauriSecrets: SecretStore = {
  get(provider: Provider): Promise<string | null> {
    return getSecret(provider);
  },
};

/** Reads the profile loaded by A's Zustand store; loads it if needed. */
export const tauriProfile: ProfileStore = {
  async get() {
    const state = useProfile.getState();
    if (!state.loaded) {
      try {
        await state.load();
      } catch {
        return null;
      }
    }
    return useProfile.getState().profile;
  },
};

/** Non-secret settings from the `settings` table (model id, default provider). */
export class TauriSettingsStore implements SettingsStore {
  async getModel(): Promise<string | null> {
    return this.read('model');
  }

  async getDefaultProvider(): Promise<Provider | null> {
    const value = await this.read('default_provider');
    return value === 'openrouter' || value === 'opencode' ? value : null;
  }

  private async read(key: string): Promise<string | null> {
    try {
      const db = await getDb();
      const rows = await db.select<{ value: string | null }[]>(
        'SELECT value FROM settings WHERE key = $1',
        [key],
      );
      return rows[0]?.value ?? null;
    } catch {
      return null;
    }
  }
}
