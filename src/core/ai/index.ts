import type { AiModel, Provider } from '../contracts';
import { DEFAULT_MODEL, OPENCODE_MODEL } from '../config';
import type { CoreDeps } from '../ports';
import { fetchProviderModels } from './models';
import { OpenCodeClient } from './opencode';
import { OpenRouterClient } from './openrouter';
import type { AiClient } from './types';

export class MissingKeyError extends Error {
  constructor(readonly provider: Provider) {
    super(
      provider === 'openrouter'
        ? 'University search needs an OpenRouter key (for verified web search).'
        : 'No OpenCode Go key is configured.',
    );
    this.name = 'MissingKeyError';
  }
}

export const FINDER_NEEDS_OPENROUTER =
  'University search needs an AI key. Add an OpenRouter key (best, verified web search) or an OpenCode Go key in Settings.';

export async function hasKey(deps: CoreDeps, provider: Provider): Promise<boolean> {
  const key = await deps.secrets.get(provider);
  return Boolean(key && key.trim());
}

export async function resolveModel(
  deps: CoreDeps,
  provider: Provider = 'openrouter',
): Promise<string> {
  const configured = await deps.settings?.getModel(provider);
  return configured?.trim() || (provider === 'opencode' ? OPENCODE_MODEL : DEFAULT_MODEL);
}

/** Catalogue for the Settings model dropdown. A missing key is not a failure. */
export async function listProviderModels(
  provider: Provider,
  deps: CoreDeps,
): Promise<AiModel[]> {
  const key = await deps.secrets.get(provider).catch(() => null);
  return fetchProviderModels(provider, { http: deps.http, apiKey: key });
}

export interface CreateClientOptions {
  model?: string;
  sessionId?: string | number;
}

export async function createAiClient(
  provider: Provider,
  deps: CoreDeps,
  options: CreateClientOptions = {},
): Promise<AiClient> {
  const key = await deps.secrets.get(provider);
  if (!key || !key.trim()) throw new MissingKeyError(provider);
  if (provider === 'opencode') {
    // OpenCode Go has its own model ids; use the OpenCode setting, not OpenRouter's slug.
    const model = options.model ?? (await resolveModel(deps, 'opencode'));
    return new OpenCodeClient({
      http: deps.http,
      apiKey: key.trim(),
      model,
      sessionId: options.sessionId,
    });
  }
  const model = options.model ?? (await resolveModel(deps));
  return new OpenRouterClient({ http: deps.http, apiKey: key.trim(), model });
}

export interface FinderKeyState {
  preferred?: Provider | null;
  hasOpenRouter: boolean;
  hasOpenCode: boolean;
}

/**
 * Finder and university pages (Design §7.3): the user's `default_provider`
 * wins when its key exists, otherwise OpenRouter, otherwise OpenCode Go.
 * Null when neither key is stored.
 */
export function chooseFinderProvider(state: FinderKeyState): Provider | null {
  if (state.preferred === 'opencode' && state.hasOpenCode) return 'opencode';
  if (state.hasOpenRouter) return 'openrouter';
  if (state.hasOpenCode) return 'opencode';
  return null;
}

export async function pickFinderProvider(deps: CoreDeps): Promise<Provider | null> {
  return chooseFinderProvider({
    preferred: (await deps.settings?.getDefaultProvider?.()) ?? null,
    hasOpenRouter: await hasKey(deps, 'openrouter'),
    hasOpenCode: await hasKey(deps, 'opencode'),
  });
}

export async function finderProvider(deps: CoreDeps): Promise<Provider> {
  const provider = await pickFinderProvider(deps);
  if (!provider) throw new MissingKeyError('openrouter');
  return provider;
}

/** Counselor prefers OpenRouter, then OpenCode Go (Design §5.1). */
export async function counselorProvider(deps: CoreDeps): Promise<Provider> {
  const preferred = await deps.settings?.getDefaultProvider?.();
  if (preferred) {
    if (await hasKey(deps, preferred)) return preferred;
  }
  if (await hasKey(deps, 'openrouter')) return 'openrouter';
  if (await hasKey(deps, 'opencode')) return 'opencode';
  throw new Error(
    'No AI key configured. Add OPENCODE_API_KEY or OPENROUTER_API_KEY to .env (or Settings).',
  );
}

export async function testProviderConnection(
  provider: Provider,
  deps: CoreDeps,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await createAiClient(provider, deps);
    return await client.testConnection();
  } catch (error) {
    if (error instanceof MissingKeyError) return { ok: false, error: error.message };
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export type { AiClient } from './types';
