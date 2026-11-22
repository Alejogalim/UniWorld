import type { CareerPath, CounselorWeights, Provider, SearchInput, UniDetail } from '../contracts';
import type {
  CachedDetail,
  CachedPage,
  CachedSearch,
  CounselorPersistence,
  CounselorSession,
  DetailCache,
  PageCache,
  SearchCache,
  StoredMessage,
} from '../ports';
import { searchKeyParts } from '../../store/search';
import { programKey } from '../../store/detailCache';

function searchKey(input: SearchInput): string {
  const parts = searchKeyParts(input);
  return `${parts.careers_json}|${parts.scope_json}|${parts.filters_json}`;
}

export class InMemorySearchCache implements SearchCache {
  private readonly entries = new Map<string, CachedSearch>();

  async get(input: SearchInput): Promise<CachedSearch | null> {
    return this.entries.get(searchKey(input)) ?? null;
  }

  async put(input: SearchInput, value: CachedSearch): Promise<void> {
    this.entries.set(searchKey(input), value);
  }
}

export class InMemoryDetailCache implements DetailCache {
  private readonly entries = new Map<string, CachedDetail>();

  async get(rorId: string, program: string): Promise<CachedDetail | null> {
    return this.entries.get(`${rorId}|${programKey(program)}`) ?? null;
  }

  async put(detail: UniDetail): Promise<void> {
    this.entries.set(`${detail.rorId}|${programKey(detail.program)}`, {
      detail,
      checkedAt: detail.checkedAt,
    });
  }
}

export class InMemoryPageCache implements PageCache {
  private readonly entries = new Map<string, CachedPage>();

  async get(url: string): Promise<CachedPage | null> {
    return this.entries.get(url) ?? null;
  }

  async put(url: string, page: CachedPage): Promise<void> {
    this.entries.set(url, page);
  }
}

export class InMemoryCounselorStore implements CounselorPersistence {
  private nextSession = 1;
  private nextCareer = 1;
  private readonly sessions = new Map<number, CounselorSession>();
  private readonly messages = new Map<number, StoredMessage[]>();
  private readonly careers = new Map<number, CareerPath[]>();

  async createSession(provider: Provider, weights?: CounselorWeights | null): Promise<number> {
    const id = this.nextSession++;
    this.sessions.set(id, { id, provider, weights: weights ?? null });
    this.messages.set(id, []);
    this.careers.set(id, []);
    return id;
  }

  async getSession(sessionId: number): Promise<CounselorSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async setWeights(sessionId: number, weights: CounselorWeights): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.weights = weights;
  }

  async addMessage(sessionId: number, message: StoredMessage): Promise<void> {
    const list = this.messages.get(sessionId) ?? [];
    list.push(message);
    this.messages.set(sessionId, list);
  }

  async listMessages(sessionId: number): Promise<StoredMessage[]> {
    return [...(this.messages.get(sessionId) ?? [])];
  }

  async saveCareers(
    sessionId: number,
    careers: Omit<CareerPath, 'id' | 'saved'>[],
  ): Promise<CareerPath[]> {
    const list = this.careers.get(sessionId) ?? [];
    const saved = careers.map((career) => ({ ...career, id: this.nextCareer++, saved: false }));
    list.push(...saved);
    this.careers.set(sessionId, list);
    return saved;
  }

  async listCareers(sessionId: number): Promise<CareerPath[]> {
    return [...(this.careers.get(sessionId) ?? [])];
  }

  async listSavedCareers(): Promise<CareerPath[]> {
    return [...this.careers.values()].flat().filter((career) => career.saved).reverse();
  }

  async setCareerSaved(careerId: number, saved: boolean): Promise<void> {
    for (const list of this.careers.values()) {
      const career = list.find((entry) => entry.id === careerId);
      if (career) career.saved = saved;
    }
  }
}
