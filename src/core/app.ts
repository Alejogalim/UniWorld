import universitiesUrl from '../../data/universities.json?url';
import type { CoreApi } from './contracts';
import { createCoreApi } from './coreApi';
import {
  TauriHttpClient,
  TauriSettingsStore,
  createTauriSqlClient,
  tauriProfile,
  tauriSecrets,
} from './adapters/tauri';
import { RorStore } from './grounding/rorStore';

let ready: Promise<CoreApi> | null = null;

async function loadRor(): Promise<RorStore> {
  const response = await fetch(universitiesUrl);
  if (!response.ok) {
    throw new Error(`Could not load the ROR universities file (${response.status}).`);
  }
  const data: unknown = await response.json();
  return RorStore.fromJson(data);
}

async function initialize(): Promise<CoreApi> {
  const [ror, sql] = await Promise.all([loadRor(), createTauriSqlClient()]);
  return createCoreApi({
    ror,
    deps: {
      http: new TauriHttpClient(),
      secrets: tauriSecrets,
      settings: new TauriSettingsStore(),
      profile: tauriProfile,
      sql,
      logger: {
        warn: (message) => console.warn(message),
        error: (message) => console.error(message),
      },
    },
  });
}

function getReady(): Promise<CoreApi> {
  if (!ready) {
    ready = initialize().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

/**
 * Lazy CoreApi for the Tauri app. The first call loads the ROR file and the
 * SQLite handle; later calls reuse them.
 */
export function createAppCore(): CoreApi {
  return {
    testConnection: async (provider) => (await getReady()).testConnection(provider),
    counselor: {
      start: async () => (await getReady()).counselor.start(),
      send: async (sessionId, text, onToken) =>
        (await getReady()).counselor.send(sessionId, text, onToken),
      careers: async (sessionId, weights) =>
        (await getReady()).counselor.careers(sessionId, weights),
    },
    finder: {
      search: async (input, onEvent) => (await getReady()).finder.search(input, onEvent),
      detail: async (rorId, program, options) =>
        (await getReady()).finder.detail(rorId, program, options),
    },
  };
}
