import type { CoreApi, CounselorWeights, Provider, SearchInput } from './contracts';
import { Counselor } from './counselor/index';
import { listProviderModels, testProviderConnection } from './ai/index';
import { createFinder, type FinderApi } from './finder/index';
import type { RorStore } from './grounding/rorStore';
import type { CoreDeps } from './ports';
import { SqlSearchCache } from '../store/search';
import { SqlDetailCache } from '../store/detailCache';
import { SqlCounselorStore } from '../store/counselor';

export interface CoreApiOptions {
  deps: CoreDeps;
  ror: RorStore;
}

export function createCoreApi(options: CoreApiOptions): CoreApi {
  const { ror } = options;
  const deps: CoreDeps = {
    ...options.deps,
    searches:
      options.deps.searches ?? (options.deps.sql ? new SqlSearchCache(options.deps.sql) : undefined),
    details:
      options.deps.details ?? (options.deps.sql ? new SqlDetailCache(options.deps.sql) : undefined),
    counselorStore:
      options.deps.counselorStore ??
      (options.deps.sql ? new SqlCounselorStore(options.deps.sql) : undefined),
  };

  const counselorStore = deps.counselorStore;
  if (!counselorStore) {
    throw new Error('createCoreApi needs a counselor store or a SqlClient');
  }
  const counselor = new Counselor(deps, counselorStore);
  const finder: FinderApi = createFinder({ deps, ror });

  return {
    testConnection: (provider: Provider) => testProviderConnection(provider, deps),
    listModels: (provider: Provider) => listProviderModels(provider, deps),
    counselor: {
      start: () => counselor.start(),
      send: (sessionId: number, text: string, onToken?: (token: string) => void) =>
        counselor.send(sessionId, text, onToken),
      careers: (sessionId: number, weights: CounselorWeights) =>
        counselor.careers(sessionId, weights),
    },
    finder: {
      search: (input: SearchInput, onEvent) => finder.search(input, onEvent),
      detail: (rorId: string, program: string, opts) => finder.detail(rorId, program, opts),
    },
  };
}
