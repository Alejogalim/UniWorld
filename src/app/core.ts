import type { CoreApi } from '@/core/contracts';
import { createAppCore } from '@/core/app';

/** B's real core; swap to the stub only when doing layout-only work. */
export const core: CoreApi = createAppCore();
