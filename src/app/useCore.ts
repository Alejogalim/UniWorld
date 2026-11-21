import type { CoreApi } from '@/core/contracts';
import { core } from './core';

export function useCore(): CoreApi {
  return core;
}
