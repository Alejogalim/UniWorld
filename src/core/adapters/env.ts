import type { Profile, Provider } from '../contracts';
import type { Logger, ProfileStore, SecretStore, SettingsStore } from '../ports';

/** Reads keys from the environment; used by the CLI, never by the app. */
export class EnvSecretStore implements SecretStore {
  async get(provider: Provider): Promise<string | null> {
    const key =
      provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : process.env.OPENCODE_API_KEY;
    return key?.trim() || null;
  }
}

export class StaticSettings implements SettingsStore {
  constructor(
    private readonly model: string | null = process.env.UNIFINDER_MODEL?.trim() || null,
    private readonly defaultProvider: Provider | null = readDefaultProvider(),
  ) {}

  async getModel(): Promise<string | null> {
    return this.model;
  }

  async getDefaultProvider(): Promise<Provider | null> {
    return this.defaultProvider;
  }
}

function readDefaultProvider(): Provider | null {
  const value = process.env.UNIFINDER_DEFAULT_PROVIDER?.trim().toLowerCase();
  return value === 'openrouter' || value === 'opencode' ? value : null;
}

export class StaticProfile implements ProfileStore {
  constructor(private readonly profile: Profile | null) {}

  async get(): Promise<Profile | null> {
    return this.profile;
  }
}

export const consoleLogger: Logger = {
  debug: (message) => console.error(`[debug] ${message}`),
  info: (message) => console.error(`[info] ${message}`),
  warn: (message) => console.error(`[warn] ${message}`),
  error: (message) => console.error(`[error] ${message}`),
};

export const silentLogger: Logger = {};
