import type { Provider } from '@/core/contracts';

/**
 * The provider a session should use, given the user's `default_provider` setting and which keys
 * exist. Returns null when the setting is unset, unknown, or its key is missing (then the session keeps its provider).
 */
export function chooseSessionProvider(
  setting: string | null,
  hasKey: (provider: Provider) => boolean,
): Provider | null {
  if (setting !== 'openrouter' && setting !== 'opencode') return null;
  return hasKey(setting) ? setting : null;
}

export function otherProvider(provider: Provider): Provider {
  return provider === 'openrouter' ? 'opencode' : 'openrouter';
}
