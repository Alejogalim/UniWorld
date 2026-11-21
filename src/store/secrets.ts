import { invoke } from '@tauri-apps/api/core';
import type { Provider } from '@/core/contracts';

/** API keys live only in the OS keychain (via the Rust `secret_*` commands). */
export function getSecret(p: Provider): Promise<string | null> {
  return invoke<string | null>('secret_get', { account: p });
}

export function setSecret(p: Provider, v: string): Promise<void> {
  return invoke<void>('secret_set', { account: p, value: v });
}

export function deleteSecret(p: Provider): Promise<void> {
  return invoke<void>('secret_delete', { account: p });
}
