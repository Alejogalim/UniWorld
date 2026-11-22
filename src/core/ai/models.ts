import type { AiModel, Provider } from '../contracts';
import {
  OPENCODE_MODEL,
  OPENCODE_MODELS_URL,
  OPENCODE_USER_AGENT,
  OPENROUTER_BASE_URL,
} from '../config';
import type { HttpClient } from '../ports';
import { ProviderError, readError } from './transport';

export interface ModelListOptions {
  http: HttpClient;
  /** Sent when present; both catalogues also work without it. */
  apiKey?: string | null;
  signal?: AbortSignal;
}

interface RawModel {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  architecture?: {
    modality?: unknown;
    output_modalities?: unknown;
  } | null;
}

function isChatModel(model: RawModel): boolean {
  if (typeof model.type === 'string') return model.type.toLowerCase() === 'chat';
  const outputs = model.architecture?.output_modalities;
  if (Array.isArray(outputs)) {
    return outputs.some((value) => typeof value === 'string' && value.toLowerCase() === 'text');
  }
  return true;
}

function modelsFrom(payload: unknown): AiModel[] {
  const data = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];

  const byId = new Map<string, AiModel>();
  for (const raw of data as RawModel[]) {
    if (!raw || typeof raw !== 'object') continue;
    if (typeof raw.id !== 'string' || raw.id.trim() === '') continue;
    if (!isChatModel(raw)) continue;
    const id = raw.id.trim();
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id;
    byId.set(id, { id, name });
  }

  return [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id),
  );
}

/**
 * Fetches the provider's model catalogue. OpenRouter's list is public; the
 * OpenCode Go list is public too but returns only the workspace's models when
 * a key is supplied.
 */
export async function fetchProviderModels(
  provider: Provider,
  options: ModelListOptions,
): Promise<AiModel[]> {
  const url = provider === 'openrouter' ? `${OPENROUTER_BASE_URL}/models` : OPENCODE_MODELS_URL;
  const headers: Record<string, string> = {};
  if (provider === 'opencode') {
    const key = options.apiKey?.trim();
    if (key) headers.Authorization = `Bearer ${key}`;
    headers['User-Agent'] = OPENCODE_USER_AGENT;
  }

  const response = await options.http.fetch(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  });
  if (!response.ok) {
    // Some new OpenCode service-account keys get a 404 on this path. Keep the
    // default model selectable instead of leaving Settings without a list.
    if (provider === 'opencode' && response.status === 404) {
      return [{ id: OPENCODE_MODEL, name: OPENCODE_MODEL }];
    }
    throw new ProviderError(await readError(response), response.status);
  }
  const payload: unknown = await response.json();
  return modelsFrom(payload);
}
