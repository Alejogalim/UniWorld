/**
 * DEV STUB — for Person A's layout work only.
 * Nothing here is real. Delete this file before the feature freeze; the real
 * implementation is `createCoreApi()` in `coreApi.ts`.
 */
import type {
  CareerPath,
  CoreApi,
  Fact,
  FinderEvent,
  UniDetail,
  UniResult,
} from './contracts';

const CHECKED = '2026-01-01T00:00:00.000Z';

function fact<T>(value: T | null): Fact<T> {
  if (value === null) {
    return { value: null, sourceUrl: null, quote: null, sourceKind: 'third_party', checkedAt: CHECKED };
  }
  return {
    value,
    sourceUrl: 'https://example.org/stub-source',
    quote: 'This is stub text for layout work, not a real source.',
    sourceKind: 'third_party',
    checkedAt: CHECKED,
  };
}

function stubUni(index: number): UniResult {
  return {
    rorId: `https://ror.org/stub00000${index}`,
    name: `Stub University ${index} (not real)`,
    countryCode: 'DE',
    city: 'Berlin',
    lat: 52.52,
    lng: 13.405,
    program: 'BSc Computer Science (stub)',
    overview: fact('Stub overview for layout work. This university does not exist.'),
    languages: fact(['English']),
    tuition: fact(index === 1 ? 'Free' : '€12,000/yr'),
    fit: {
      career: 0.8,
      admission: 'Unknown',
      language: 1,
      cost: index === 1 ? 1 : 0.45,
      overall: index === 1 ? 0.88 : 0.62,
    },
    whyFits: `Stub fit line ${index} — connect an OpenRouter key for real results.`,
    sourceCount: 1,
  };
}

const stubDetail: UniDetail = {
  rorId: 'https://ror.org/stub000001',
  program: 'BSc Computer Science (stub)',
  overview: fact('Stub overview for layout work.'),
  languages: fact(['English']),
  tuition: fact('Free'),
  scholarships: fact('Stub scholarship information.'),
  deadlines: fact('15 July 2027'),
  nextDeadline: fact('15 July 2027'),
  exams: fact(['IELTS 6.5']),
  requirements: fact('IB 36 (stub)'),
  applyUrl: fact('https://example.org/stub-apply'),
  checkedAt: CHECKED,
};

const stubCareers: CareerPath[] = [
  {
    id: 1,
    title: 'Stub career: software engineer',
    summary: 'Stub summary for layout work.',
    whyYou: 'Stub reason based on stub answers.',
    degreeKeywords: ['Computer Science'],
    fitBreakdown: { passions: 90, strengths: 80, goals: 70, earning: 60, overall: 78 },
    saved: false,
  },
  {
    id: 2,
    title: 'Stub career: product designer',
    summary: 'Stub summary for layout work.',
    whyYou: 'Stub reason based on stub answers.',
    degreeKeywords: ['Design'],
    fitBreakdown: { passions: 80, strengths: 90, goals: 60, earning: 50, overall: 72 },
    saved: false,
  },
  {
    id: 3,
    title: 'Stub career: data analyst',
    summary: 'Stub summary for layout work.',
    whyYou: 'Stub reason based on stub answers.',
    degreeKeywords: ['Data Science'],
    fitBreakdown: { passions: 70, strengths: 80, goals: 80, earning: 70, overall: 75 },
    saved: false,
  },
];

export function createStubCoreApi(): CoreApi {
  return {
    testConnection: async () => ({ ok: true }),
    counselor: {
      start: async () => ({ sessionId: 1 }),
      send: async (_sessionId, _text, onToken) => {
        const reply =
          'This is a stub counselor reply for layout work. What would you like to explore next?';
        onToken?.(reply);
        return reply;
      },
      careers: async () => stubCareers,
    },
    finder: {
      search: async (_input, onEvent: (event: FinderEvent) => void) => {
        onEvent({ type: 'progress', message: 'Stub search: no network calls.' });
        onEvent({ type: 'result', uni: stubUni(1) });
        onEvent({ type: 'result', uni: stubUni(2) });
        onEvent({ type: 'done', verified: 2, removed: 0 });
      },
      detail: async () => stubDetail,
    },
  };
}

export const stubCoreApi: CoreApi = createStubCoreApi();
