import { chooseFinderProvider, type Provider } from '@/core';
import { getSecret } from '@/store/secrets';
import { getSetting } from '@/store/settings';

export const PROVIDER_NAME: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  opencode: 'OpenCode Go',
};

export interface FinderProviderState {
  /** The provider a Finder search uses right now (same rule as the core). Null when no key exists. */
  used: Provider | null;
  hasOpenRouter: boolean;
  hasOpenCode: boolean;
}

/** Reads the provider setting and stored keys, then applies the core rule. */
export async function loadFinderProviderState(): Promise<FinderProviderState> {
  const [setting, openrouterKey, opencodeKey] = await Promise.all([
    getSetting('default_provider'),
    getSecret('openrouter'),
    getSecret('opencode'),
  ]);
  const hasOpenRouter = Boolean(openrouterKey?.trim());
  const hasOpenCode = Boolean(opencodeKey?.trim());
  const preferred = setting === 'openrouter' || setting === 'opencode' ? setting : null;
  return {
    used: chooseFinderProvider({ preferred, hasOpenRouter, hasOpenCode }),
    hasOpenRouter,
    hasOpenCode,
  };
}

/** The provider a failed search can switch to: the other one, only when its key is stored. */
export function switchTargetFor(state: FinderProviderState): Provider | null {
  if (state.used === 'openrouter' && state.hasOpenCode) return 'opencode';
  if (state.used === 'opencode' && state.hasOpenRouter) return 'openrouter';
  return null;
}
