import { describe, expect, it } from 'bun:test';
import { FIXTURE_RECORDS } from './fixtures';
import { RorStore } from './rorStore';

const store = new RorStore(FIXTURE_RECORDS);

function nameOf(identity: Parameters<RorStore['match']>[0]): string | null {
  return store.match(identity)?.record.name ?? null;
}

describe('RorStore name matching', () => {
  const cases: [string, string | null, string?][] = [
    ['University of Barcelona', 'University of Barcelona'],
    ['Universidad de Barcelona', 'University of Barcelona', 'ES'],
    ['Universitat de Barcelona', 'University of Barcelona'],
    ['Technische Universität München', 'Technical University of Munich'],
    ['Technical University of Munich', 'Technical University of Munich'],
    ['TUM', 'Technical University of Munich'],
    ['ETH Zurich', 'ETH Zurich'],
    ['ETH Zürich', 'ETH Zurich'],
    ['Eidgenössische Technische Hochschule Zürich', 'ETH Zurich'],
    ['Oxford', 'University of Oxford'],
    ['Sorbonne Université', 'Sorbonne University'],
    ['Università di Bologna', 'University of Bologna'],
    ['Universiteit van Amsterdam', 'University of Amsterdam'],
    ['Amsterdam University College', 'Amsterdam University College'],
    ['LMU Munich', 'Ludwig Maximilian University of Munich'],
    ['Ludwig-Maximilians-Universität München', 'Ludwig Maximilian University of Munich'],
    ['KTH', 'KTH Royal Institute of Technology'],
    ['KTH Royal Institute of Technology', 'KTH Royal Institute of Technology'],
    ['UCL', 'University College London'],
    ['UNSW', 'University of New South Wales'],
    ['UNSW Sydney', 'University of New South Wales'],
    ['U of T', 'University of Toronto'],
    ['Universidad de Chile', 'University of Chile'],
    ['Universidade de São Paulo', 'University of São Paulo'],
    ['Tsinghua', 'Tsinghua University'],
    ['NUS', 'National University of Singapore'],
    ['UCT', 'University of Cape Town'],
    ['Monash University', 'Monash University'],
  ];

  for (const [input, expected, country] of cases) {
    it(`matches "${input}"${country ? ` in ${country}` : ''}`, () => {
      expect(nameOf({ name: input, country })).toBe(expected);
    });
  }

  it('is case and punctuation insensitive', () => {
    expect(nameOf({ name: '  university   of   BARCELONA! ' })).toBe('University of Barcelona');
  });

  it('matches a nice typo by fuzzy tokens', () => {
    expect(nameOf({ name: 'Univeristy of Bologna', country: 'IT' })).toBe('University of Bologna');
  });

  it('does not match a school that does not exist', () => {
    expect(nameOf({ name: 'University of Nowhere' })).toBeNull();
  });

  it('does not match a real university in the wrong country', () => {
    expect(nameOf({ name: 'University of Barcelona', country: 'DE' })).toBeNull();
  });

  it('does not guess when two universities share a name', () => {
    expect(nameOf({ name: "St. John's University", country: 'US' })).toBeNull();
  });

  it('does not confuse Boston College with Boston University', () => {
    expect(nameOf({ name: 'Boston University', country: 'US' })).toBe('Boston University');
    expect(nameOf({ name: 'Boston College', country: 'US' })).toBe('Boston College');
  });

  it('distinguishes Ghana from Guyana', () => {
    expect(nameOf({ name: 'University of Ghana' })).toBe('University of Ghana');
    expect(nameOf({ name: 'University of Guyana' })).toBe('University of Guyana');
  });
});

describe('RorStore domain matching', () => {
  it('matches an exact domain', () => {
    const match = store.match({
      name: 'Totally different name',
      sourceUrls: ['https://www.tum.de/en/studies'],
    });
    expect(match?.record.name).toBe('Technical University of Munich');
    expect(match?.reason).toBe('domain');
  });

  it('matches a registrable domain behind a subdomain', () => {
    expect(
      store.match({ name: 'X', sourceUrls: ['https://cs.ox.ac.uk/admissions'] })?.record.name,
    ).toBe('University of Oxford');
  });

  it('matches the website host', () => {
    expect(
      store.match({ name: 'X', sourceUrls: ['https://www.ub.edu/study'] })?.record.name,
    ).toBe('University of Barcelona');
  });

  it('prefers the main university when a domain is shared', () => {
    expect(store.match({ name: 'X', sourceUrls: ['https://ethz.ch/'] })?.record.name).toBe(
      'ETH Zurich',
    );
    expect(store.match({ name: 'X', sourceUrls: ['https://cs.ox.ac.uk/'] })?.record.name).toBe(
      'University of Oxford',
    );
    expect(store.match({ name: 'X', sourceUrls: ['https://www.monash.edu/'] })?.record.name).toBe(
      'Monash University',
    );
    expect(store.match({ name: 'X', sourceUrls: ['https://www.unsw.edu.au/'] })?.record.name).toBe(
      'University of New South Wales',
    );
    expect(store.match({ name: 'X', sourceUrls: ['https://www.uva.nl/'] })?.record.name).toBe(
      'University of Amsterdam',
    );
  });

  it('falls back to the name when the domain is unknown', () => {
    expect(
      store.match({
        name: 'Sorbonne University',
        sourceUrls: ['https://example.com/sorbonne'],
      })?.record.name,
    ).toBe('Sorbonne University');
  });

  it('drops candidates with no ROR match', () => {
    expect(store.match({ name: 'Fake Online University', sourceUrls: ['https://example.com'] })).toBeNull();
  });
});
