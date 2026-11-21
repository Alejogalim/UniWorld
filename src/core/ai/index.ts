import type { Provider } from '../contracts';
import { DEFAULT_MODEL } from '../config';
import type { CoreDeps } from '../ports';
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
  'University search needs an OpenRouter key (for verified web search).';

export async function hasKey(deps: CoreDeps, provider: Provider): Promise<boolean> {
  const key = await deps.secrets.get(provider);
  return Boolean(key && key.trim());
}

export async function resolveModel(deps: CoreDeps): Promise<string> {
  const configured = await deps.settings?.getModel();
  return configured?.trim() || DEFAULT_MODEL;
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
    // OpenCode Go uses its own model id; do not inherit OpenRouter's slug.
    return new OpenCodeClient({
      http: deps.http,
      apiKey: key.trim(),
      model: options.model,
      sessionId: options.sessionId,
    });
  }
  const model = options.model ?? (await resolveModel(deps));
  return new OpenRouterClient({ http: deps.http, apiKey: key.trim(), model });
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
