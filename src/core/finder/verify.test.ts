import { describe, expect, it } from 'bun:test';
import type { Profile, SearchInput } from '../contracts';
import { CitationIndex } from '../grounding/citationValidator';
import { FIXTURE_RECORDS } from '../grounding/fixtures';
import { RorStore } from '../grounding/rorStore';
import type { ExtractedCandidate } from '../schemas';
import { verifyCandidates } from './verify';

const ror = new RorStore(FIXTURE_RECORDS);

const profile: Profile = {
  name: 'Ana',
  primaryLang: 'en',
  uiLang: 'en',
  languages: [
    { lang: 'en', level: 'C1' },
    { lang: 'de', level: 'B1' },
  ],
  program: 'IB',
  grades: { ib: { predictedTotal: 36 } },
  citizenship: 'ES',
};

const OVERVIEW_URL = 'https://www.ub.edu/about';
const LANGUAGES_URL = 'https://www.ub.edu/programs';
const TUITION_URL = 'https://www.ub.edu/fees';

const index = CitationIndex.fromHits([
  {
    url: OVERVIEW_URL,
    text: 'The University of Barcelona is a public university located in Barcelona.',
  },
  { url: LANGUAGES_URL, text: 'The language of instruction is English.' },
  { url: TUITION_URL, text: 'There are no tuition fees for all students.' },
]);

function candidate(overrides: Partial<ExtractedCandidate> = {}): ExtractedCandidate {
  return {
    name: 'University of Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    city: 'Barcelona',
    programName: 'BSc Computer Science',
    languages: {
      value: ['English'],
      sourceUrl: LANGUAGES_URL,
      quote: 'The language of instruction is English',
    },
    instructionLanguages: ['English'],
    tuition: {
      value: 'Free',
      sourceUrl: TUITION_URL,
      quote: 'There are no tuition fees for all students',
    },
    overview: {
      value: 'A public university in Barcelona',
      sourceUrl: OVERVIEW_URL,
      quote: 'The University of Barcelona is a public university located in Barcelona',
    },
    sourceUrls: [OVERVIEW_URL, LANGUAGES_URL, TUITION_URL],
    ...overrides,
  };
}

const input: SearchInput = {
  careers: ['Computer Science'],
  scope: { kind: 'countries', codes: ['ES'] },
  filters: {
    tuitionFreeOnly: false,
    spokenLanguagesOnly: true,
    includeNeedToLearn: false,
  },
};

function run(overrides: Partial<ExtractedCandidate> = {}, searchInput: SearchInput = input) {
  return verifyCandidates([candidate(overrides)], {
    ror,
    index,
    profile,
    input: searchInput,
    checkedAt: '2026-11-21T00:00:00.000Z',
  });
}

describe('verifyCandidates', () => {
  it('keeps a ROR-matched university with verified facts', () => {
    const { verified, removed } = run();
    expect(removed).toBe(0);
    expect(verified).toHaveLength(1);
    const uni = verified[0]!.result;
    expect(uni.rorId).toBe('https://ror.org/000000001');
    expect(uni.name).toBe('University of Barcelona');
    expect(uni.tuition.value).toBe('Free');
    expect(uni.languages.value).toEqual(['English']);
    expect(uni.overview.value).toBe('A public university in Barcelona');
    expect(uni.sourceCount).toBe(3);
    expect(uni.tuition.sourceKind).toBe('official');
  });

  it('drops the candidate when ROR has no match', () => {
    const empty = { value: null, sourceUrl: null, quote: null };
    const { verified, removed } = verifyCandidates(
      [
        candidate({
          name: 'Fake Online University',
          sourceUrls: ['https://example.com'],
          overview: empty,
          languages: empty,
          tuition: empty,
        }),
      ],
      { ror, index, profile, input, checkedAt: '2026-11-21' },
    );
    expect(verified).toHaveLength(0);
    expect(removed).toBe(1);
  });

  it('drops a university outside the selected scope', () => {
    const { verified, removed } = run({}, { ...input, scope: { kind: 'countries', codes: ['DE'] } });
    expect(verified).toHaveLength(0);
    expect(removed).toBe(1);
  });

  it('keeps the university but nulls a fact with a bad quote', () => {
    const { verified } = run({
      overview: {
        value: 'A public university in Barcelona',
        sourceUrl: OVERVIEW_URL,
        quote: 'This sentence is not in the search result',
      },
    });
    expect(verified).toHaveLength(1);
    expect(verified[0]!.result.overview.value).toBeNull();
    expect(verified[0]!.result.tuition.value).toBe('Free');
  });

  it('nulls a fact whose URL the search did not return', () => {
    const { verified } = run({
      tuition: {
        value: 'Free',
        sourceUrl: 'https://www.ub.edu/not-returned',
        quote: 'There are no tuition fees for all students',
      },
    });
    expect(verified[0]!.result.tuition.value).toBeNull();
  });

  it('applies tuition-free only with a verified free fact', () => {
    const paid = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      { url: LANGUAGES_URL, text: 'The language of instruction is English.' },
      { url: TUITION_URL, text: 'International students pay tuition of €12,000 per year.' },
    ]);
    const { verified, removed } = verifyCandidates(
      [
        candidate({
          tuition: {
            value: '€12,000 per year',
            sourceUrl: TUITION_URL,
            quote: 'International students pay tuition of €12,000 per year',
          },
        }),
      ],
      {
        ror,
        index: paid,
        profile,
        input: { ...input, filters: { ...input.filters, tuitionFreeOnly: true } },
        checkedAt: '2026-11-21',
      },
    );
    expect(verified).toHaveLength(0);
    expect(removed).toBe(1);
  });

  it('does not show EU-only free tuition to a non-EU student under the free filter', () => {
    const euOnlyText = 'Tuition is free for EU and EEA students only.';
    const euOnly = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      { url: LANGUAGES_URL, text: 'The language of instruction is English.' },
      { url: TUITION_URL, text: euOnlyText },
    ]);
    const candidateEu = candidate({
      tuition: {
        value: 'Free for EU/EEA students',
        sourceUrl: TUITION_URL,
        quote: 'Tuition is free for EU and EEA students only',
      },
    });
    const filter = { ...input.filters, tuitionFreeOnly: true };

    const eu = verifyCandidates([candidateEu], {
      ror,
      index: euOnly,
      profile,
      input: { ...input, filters: filter },
      checkedAt: '2026-11-21',
    });
    expect(eu.verified).toHaveLength(1);

    const nonEu = verifyCandidates([candidateEu], {
      ror,
      index: euOnly,
      profile: { ...profile, citizenship: 'US' },
      input: { ...input, filters: filter },
      checkedAt: '2026-11-21',
    });
    expect(nonEu.verified).toHaveLength(0);
    expect(nonEu.removed).toBe(1);
  });

  it('excludes a language the student does not speak at B2', () => {
    const german = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      { url: LANGUAGES_URL, text: 'The language of instruction is German.' },
      { url: TUITION_URL, text: 'There are no tuition fees for all students.' },
    ]);
    const { verified, removed } = verifyCandidates(
      [
        candidate({
          languages: {
            value: ['German'],
            sourceUrl: LANGUAGES_URL,
            quote: 'The language of instruction is German',
          },
        }),
      ],
      { ror, index: german, profile, input, checkedAt: '2026-11-21' },
    );
    expect(verified).toHaveLength(0);
    expect(removed).toBe(1);
  });

  it('includes a need-to-learn language only when the filter is on', () => {
    const french = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      { url: LANGUAGES_URL, text: 'The language of instruction is French.' },
      { url: TUITION_URL, text: 'There are no tuition fees for all students.' },
    ]);
    const candidateFrench = candidate({
      languages: {
        value: ['French'],
        sourceUrl: LANGUAGES_URL,
        quote: 'The language of instruction is French',
      },
    });
    const allowed = verifyCandidates([candidateFrench], {
      ror,
      index: french,
      profile,
      input: {
        ...input,
        filters: { ...input.filters, includeNeedToLearn: true },
      },
      checkedAt: '2026-11-21',
    });
    expect(allowed.verified).toHaveLength(1);
    expect(allowed.verified[0]!.result.needToLearn?.lang).toBe('fr');
    expect(allowed.verified[0]!.result.needToLearn?.usualLevel.value).toBeNull();
  });

  it('fills the usual level when the page states it', () => {
    const german = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      {
        url: LANGUAGES_URL,
        text: 'The language of instruction is German. German proficiency at B2 is required.',
      },
      { url: TUITION_URL, text: 'There are no tuition fees for all students.' },
    ]);
    const { verified } = verifyCandidates(
      [
        candidate({
          languages: {
            value: ['German'],
            sourceUrl: LANGUAGES_URL,
            quote: 'The language of instruction is German',
          },
          languageRequirement: {
            value: 'B2',
            sourceUrl: LANGUAGES_URL,
            quote: 'German proficiency at B2 is required',
          },
        }),
      ],
      {
        ror,
        index: german,
        profile,
        input: { ...input, filters: { ...input.filters, includeNeedToLearn: true } },
        checkedAt: '2026-11-21',
      },
    );
    expect(verified).toHaveLength(1);
    expect(verified[0]!.result.needToLearn?.lang).toBe('de');
    expect(verified[0]!.result.needToLearn?.usualLevel.value).toBe('B2');
    expect(verified[0]!.result.needToLearn?.usualLevel.sourceKind).toBe('official');
  });

  it('merges two candidates matched to the same ROR record', () => {
    const second = candidate({
      tuition: { value: null, sourceUrl: null, quote: null },
      languages: {
        value: ['English', 'Spanish'],
        sourceUrl: LANGUAGES_URL,
        quote: 'The language of instruction is English and Spanish',
      },
    });
    const spanishIndex = CitationIndex.fromHits([
      { url: OVERVIEW_URL, text: 'The University of Barcelona is a public university located in Barcelona.' },
      { url: LANGUAGES_URL, text: 'The language of instruction is English and Spanish.' },
      { url: TUITION_URL, text: 'There are no tuition fees for all students.' },
    ]);
    const { verified } = verifyCandidates([candidate(), second], {
      ror,
      index: spanishIndex,
      profile,
      input,
      checkedAt: '2026-11-21',
    });
    expect(verified).toHaveLength(1);
    expect(verified[0]!.result.languages.value).toEqual(expect.arrayContaining(['English', 'Spanish']));
    expect(verified[0]!.result.tuition.value).toBe('Free');
  });

  it('filters by continent using the ROR record', () => {
    const europe = verifyCandidates([candidate()], {
      ror,
      index,
      profile,
      input: { ...input, scope: { kind: 'continent', continent: 'Europe' } },
      checkedAt: '2026-11-21',
    });
    expect(europe.verified).toHaveLength(1);
    const asia = verifyCandidates([candidate()], {
      ror,
      index,
      profile,
      input: { ...input, scope: { kind: 'continent', continent: 'Asia' } },
      checkedAt: '2026-11-21',
    });
    expect(asia.verified).toHaveLength(0);
  });
});
