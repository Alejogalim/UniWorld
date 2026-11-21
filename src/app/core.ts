import type { CoreApi } from '@/core/contracts';

const reject = (): Promise<never> => Promise.reject(new Error('Core not connected yet'));

const notConnected: CoreApi = {
  testConnection: reject,
  counselor: {
    start: reject,
    send: reject,
    careers: reject,
  },
  finder: {
    search: reject,
    detail: reject,
  },
};

/** Swap this one line to point at B's real core. */
export const core: CoreApi = notConnected;
