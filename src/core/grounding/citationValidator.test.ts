import { describe, expect, it } from 'bun:test';
import {
  CitationIndex,
  normalizeQuoteText,
  validateStringArrayFact,
  validateStringFact,
} from './citationValidator';

const TUM_URL = 'https://www.tum.de/en/study/tuition';
const EXTERNAL_URL = 'https://www.daad.de/en/tuition';
const TUM_TEXT = [
  'Tuition fees: There are no tuition fees for all students.',
  'The language of instruction is English and German.',
  'Applications for the winter semester close on 15 July 2026.',
  'Students need IELTS 6.5.',
].join(' ');

const index = CitationIndex.fromHits([
  { url: TUM_URL, title: 'TUM tuition', text: TUM_TEXT },
  {
    url: EXTERNAL_URL,
    title: 'DAAD',
    text: 'German universities usually charge no tuition fees, but semester contributions apply.',
  },
]);

describe('CitationIndex', () => {
  it('canonicalizes URLs and keeps the returned URL', () => {
    expect(index.has(`${TUM_URL}/#fees`)).toBe(true);
    expect(index.canonicalUrl('https://WWW.TUM.DE/en/study/tuition/')).toBe(TUM_URL);
    expect(index.canonicalUrl('https://evil.example/tuition')).toBeNull();
  });
});

describe('quote check', () => {
  it('accepts an exact quote and marks an official source', () => {
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: TUM_URL,
        quote: 'There are no tuition fees for all students',
      },
      index,
      { kind: 'tuition', officialDomains: ['tum.de'], checkedAt: '2026-11-21' },
    );
    expect(fact.value).toBe('Free');
    expect(fact.sourceUrl).toBe(TUM_URL);
    expect(fact.quote).toBe('There are no tuition fees for all students');
    expect(fact.sourceKind).toBe('official');
    expect(fact.checkedAt).toBe('2026-11-21');
  });

  it('normalizes case, whitespace and punctuation', () => {
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: TUM_URL,
        quote: 'TUITION  FEES:   there are no tuition fees, for all students!',
      },
      index,
      { kind: 'tuition' },
    );
    expect(fact.value).toBe('Free');
  });

  it('accepts a URL with a fragment and a trailing slash', () => {
    const fact = validateStringFact(
      { value: 'Free', sourceUrl: `${TUM_URL}/#tuition`, quote: 'no tuition fees for all students' },
      index,
      { kind: 'tuition', officialDomains: ['https://www.tum.de'] },
    );
    expect(fact.value).toBe('Free');
    expect(fact.sourceKind).toBe('official');
  });

  it('rejects a quote that is not in the returned text', () => {
    const fact = validateStringFact(
      { value: 'Free', sourceUrl: TUM_URL, quote: 'tuition is free for everyone forever' },
      index,
      { kind: 'tuition' },
    );
    expect(fact.value).toBeNull();
    expect(fact.sourceUrl).toBeNull();
    expect(fact.quote).toBeNull();
  });

  it('rejects a URL the search did not return', () => {
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: 'https://www.tum.de/not-returned',
        quote: 'no tuition fees for all students',
      },
      index,
      { kind: 'tuition', officialDomains: ['tum.de'] },
    );
    expect(fact.value).toBeNull();
  });

  it('rejects a quote borrowed from another hit', () => {
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: TUM_URL,
        quote: 'German universities usually charge no tuition fees',
      },
      index,
      { kind: 'tuition' },
    );
    expect(fact.value).toBeNull();
  });

  it('rejects a quote that is too short', () => {
    const fact = validateStringFact(
      { value: 'Free', sourceUrl: TUM_URL, quote: 'tuition' },
      index,
      { kind: 'tuition' },
    );
    expect(fact.value).toBeNull();
  });

  it('rejects a value the quote does not support', () => {
    const fact = validateStringFact(
      {
        value: '€12,000 per year',
        sourceUrl: TUM_URL,
        quote: 'There are no tuition fees for all students',
      },
      index,
      { kind: 'tuition' },
    );
    expect(fact.value).toBeNull();
  });

  it('does not treat a tuition-fee sentence as proof that tuition is free', () => {
    const paidText = CitationIndex.fromHits([
      {
        url: 'https://example.edu/fees',
        text: 'International students pay tuition of €12,000 per year.',
      },
    ]);
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: 'https://example.edu/fees',
        quote: 'International students pay tuition of €12,000 per year',
      },
      paidText,
      { kind: 'tuition' },
    );
    expect(fact.value).toBeNull();
  });

  it('keeps a paid amount only when the number appears', () => {
    const paid = CitationIndex.fromHits([
      {
        url: 'https://example.edu/fees',
        text: 'International students pay tuition of €12,000 per year.',
      },
    ]);
    const fact = validateStringFact(
      {
        value: '~€12,000/yr',
        sourceUrl: 'https://example.edu/fees',
        quote: 'International students pay tuition of €12,000 per year',
      },
      paid,
      { kind: 'tuition' },
    );
    expect(fact.value).toBe('~€12,000/yr');
  });

  it('validates languages when every language is quoted', () => {
    const fact = validateStringArrayFact(
      {
        value: ['English', 'German'],
        sourceUrl: TUM_URL,
        quote: 'The language of instruction is English and German',
      },
      index,
      { kind: 'languages' },
    );
    expect(fact.value).toEqual(['English', 'German']);
  });

  it('rejects languages that are not quoted', () => {
    const fact = validateStringArrayFact(
      {
        value: ['French'],
        sourceUrl: TUM_URL,
        quote: 'The language of instruction is English and German',
      },
      index,
      { kind: 'languages' },
    );
    expect(fact.value).toBeNull();
  });

  it('validates deadlines and exams', () => {
    const deadline = validateStringFact(
      {
        value: '15 July 2026',
        sourceUrl: TUM_URL,
        quote: 'Applications for the winter semester close on 15 July 2026',
      },
      index,
      { kind: 'date' },
    );
    expect(deadline.value).toBe('15 July 2026');

    const exams = validateStringArrayFact(
      { value: ['IELTS 6.5'], sourceUrl: TUM_URL, quote: 'Students need IELTS 6.5' },
      index,
      { kind: 'exams' },
    );
    expect(exams.value).toEqual(['IELTS 6.5']);
  });

  it('marks third-party sources as third_party', () => {
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: EXTERNAL_URL,
        quote: 'German universities usually charge no tuition fees',
      },
      index,
      { kind: 'tuition', officialDomains: ['tum.de'] },
    );
    expect(fact.value).toBe('Free');
    expect(fact.sourceKind).toBe('third_party');
  });

  it('accepts a quote that crosses an Exa highlight marker', () => {
    const marked = CitationIndex.fromHits([
      {
        url: 'https://example.edu/tuition',
        text: 'There are no tuition fees [...] for all students at this university.',
      },
    ]);
    const fact = validateStringFact(
      {
        value: 'Free',
        sourceUrl: 'https://example.edu/tuition',
        quote: 'no tuition fees for all students',
      },
      marked,
      { kind: 'tuition' },
    );
    expect(fact.value).toBe('Free');
  });

  it('never returns a value without a verified source and quote', () => {
    const fact = validateStringFact(
      { value: 'Free', sourceUrl: null, quote: null },
      index,
      { kind: 'tuition' },
    );
    expect(fact).toMatchObject({ value: null, sourceUrl: null, quote: null });
  });
});

describe('quote normalisation (plan 39)', () => {
  const SRC = 'https://www.example.edu/admission/deadlines';
  const idx = CitationIndex.fromHits([
    {
      url: SRC,
      title: 'Deadlines',
      text:
        'Regular Decision \u2014 the application deadline is January\u00A05, 2027. ' +
        'Students\u2019 test scores: we accept the SAT and ACT. ' +
        'Finan\u00ADcial aid is need-\u200Bbased. ' +
        'Our \uFB01nancial aid office helps international students.',
    },
  ]);

  it('normalises invisible characters, dashes, quotes and case but keeps digits', () => {
    expect(normalizeQuoteText('Ad\u200Bmis\u00ADsion \u2014 \u201CFees\u201D')).toBe('admission fees');
    expect(normalizeQuoteText('Fee: 1,234 €')).toBe('fee 1 234');
    expect(normalizeQuoteText('\uFB01nancial')).toBe('financial');
  });

  it('accepts a quote with a plain dash and space where the page has an em dash and nbsp', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2027',
        sourceUrl: SRC,
        quote: 'Regular Decision - the application deadline is January 5, 2027',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBe('January 5, 2027');
  });

  it('accepts different case and a straight apostrophe', () => {
    const fact = validateStringArrayFact(
      { value: ['SAT'], sourceUrl: SRC, quote: "STUDENTS' TEST SCORES: we accept the SAT and ACT" },
      idx,
      { kind: 'exams' },
    );
    expect(fact.value).toEqual(['SAT']);
  });

  it('accepts a quote across a soft hyphen and a ligature', () => {
    const soft = validateStringFact(
      { value: 'Need-based financial aid', sourceUrl: SRC, quote: 'Financial aid is need-based' },
      idx,
      { kind: 'text' },
    );
    expect(soft.value).toBe('Need-based financial aid');
    const lig = validateStringFact(
      {
        value: 'Financial aid office for international students',
        sourceUrl: SRC,
        quote: 'Our financial aid office helps international students',
      },
      idx,
      { kind: 'text' },
    );
    expect(lig.value).not.toBeNull();
  });

  it('never changes digits: a different year is rejected', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2028',
        sourceUrl: SRC,
        quote: 'the application deadline is January 5, 2028',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBeNull();
  });

  it('accepts a quote shortened with an ellipsis when every piece is verbatim', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2027',
        sourceUrl: SRC,
        quote: 'Regular Decision … deadline is January 5, 2027',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBe('January 5, 2027');
  });

  it('rejects ellipsis quotes with a one-word piece or an invented piece', () => {
    const oneWord = validateStringFact(
      { value: '2027', sourceUrl: SRC, quote: 'Regular Decision the application ... 2027' },
      idx,
      { kind: 'date' },
    );
    expect(oneWord.value).toBeNull();
    const invented = validateStringFact(
      { value: 'March 1', sourceUrl: SRC, quote: 'Regular Decision … deadline is March 1' },
      idx,
      { kind: 'date' },
    );
    expect(invented.value).toBeNull();
  });
});
