import type { Profile, SearchInput } from '../contracts';
import type { ChatMessage } from './types';
import type { SearchHit } from './types';
import type { CounselorWeights } from '../contracts';
import { countryName } from '../grounding/countries';
import { languageName, primaryLanguage } from '../grounding/languages';
import { normalizeText } from '../normalize';
import { CAREER_MAX, CAREER_MIN } from '../config';

export function respondIn(profile: Profile): string {
  return languageName(primaryLanguage(profile));
}

export function profileToText(profile: Profile): string {
  const languages = [
    `${languageName(primaryLanguage(profile))} (${profile.primaryLang}, native/primary)`,
    ...(profile.languages ?? []).map(
      (entry) => `${languageName(entry.lang) || entry.lang} (${entry.lang}, ${entry.level})`,
    ),
  ];
  const lines = [
    `Name: ${profile.name}`,
    `Primary language: ${languageName(primaryLanguage(profile))} (${profile.primaryLang})`,
    `Languages: ${languages.join('; ')}`,
    `Program: ${profile.program}`,
  ];
  if (profile.citizenship) lines.push(`Citizenship: ${countryName(profile.citizenship)}`);
  if (profile.residence) lines.push(`Country of residence: ${countryName(profile.residence)}`);
  if (profile.grades) lines.push(`Grades: ${JSON.stringify(profile.grades)}`);
  return lines.join('\n');
}

export function scopeToText(scope: SearchInput['scope']): string {
  if (scope.kind === 'global') return 'Global (no country restriction)';
  if (scope.kind === 'continent') return `Continent: ${scope.continent}`;
  return `Countries: ${scope.codes.map((code) => `${countryName(code)} (${code})`).join(', ')}`;
}

export function counselorSystemPrompt(profile: Profile): string {
  const lang = respondIn(profile);
  return [
    `You are UniFinder's Socratic career counselor for a high-school student named ${profile.name}.`,
    `respond_in: ${primaryLanguage(profile)} (${lang}). Write every reply in ${lang}.`,
    'Address the student by name.',
    'Ask exactly one question at a time and build on their last answer.',
    'Reflect back what you heard in your own words and point out tensions between their answers.',
    'Never prescribe a career, a major or a university, and never say what they "should" do.',
    'Do not list career options in the chat; the app shows career ideas separately.',
    'Keep replies short: two to four sentences, then one question.',
    'Do not invent facts about the student. Use only what they told you.',
    'The six intake topics are passions, strengths, favourite subjects, life at 30, values, and practical limits (budget, distance, study languages).',
    'If the student asks for career ideas, tell them to use the "Show my career ideas" button.',
  ].join(' ');
}

export function careersPrompt(
  profile: Profile,
  transcript: string,
  weights: CounselorWeights,
): ChatMessage[] {
  const lang = respondIn(profile);
  const shape = {
    careers: [
      {
        title: 'string',
        summary: 'string',
        whyYou: 'string',
        degreeKeywords: ['string'],
        scores: { passions: 0, strengths: 0, goals: 0, earning: 0 },
      },
    ],
  };
  return [
    {
      role: 'system',
      content: [
        `You are UniFinder's career synthesizer. Student: ${profile.name}.`,
        `respond_in: ${primaryLanguage(profile)}. Write title, summary and whyYou in ${lang}.`,
        'Keep degreeKeywords in English because they are used for university searches.',
        `Return ${CAREER_MIN} to ${CAREER_MAX} realistic career paths grounded ONLY in the student's own answers.`,
        'For each career, score four dimensions from 0 to 10: passions, strengths, goals, earning.',
        'whyYou must quote or paraphrase specific things the student said; no generic claims.',
        'No career should be a restatement of another.',
        'Return only JSON matching this shape (numbers are 0-10):',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Student profile:\n${profileToText(profile)}`,
        `Importance weights (1-10): ${JSON.stringify(weights)}`,
        `Conversation so far:\n${transcript}`,
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}

export function queryPlanPrompt(
  profile: Profile,
  input: SearchInput,
  progress?: (message: string) => void,
): ChatMessage[] {
  progress?.('Planning searches…');
  const shape = { queries: [{ query: 'string', purpose: 'string' }] };
  const filters = input.filters;
  return [
    {
      role: 'system',
      content: [
        'You are UniFinder\'s search planner.',
        'Write 2 or 3 English web-search queries that will find official university pages for bachelor programs.',
        'Each query must include the field of study, the degree/program, and the geographic scope.',
        'Include the student\'s instruction languages and filters when relevant (e.g. "no tuition fees", "taught in English").',
        'Prefer queries that surface university program pages, not rankings or blogs.',
        'Do not include a country outside the selected scope.',
        'Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Careers: ${input.careers.join(', ')}`,
        `Program: ${profile.program}`,
        `Scope: ${scopeToText(input.scope)}`,
        `Filters: tuitionFreeOnly=${filters.tuitionFreeOnly}; spokenLanguagesOnly=${filters.spokenLanguagesOnly}; includeNeedToLearn=${filters.includeNeedToLearn}`,
        `Student languages: ${profileToText(profile)}`,
        'Return the JSON now.',
      ].join('\n'),
    },
  ];
}

function sourceBlock(hits: SearchHit[], maxCharsPerHit: number, maxTotal: number): string {
  const parts: string[] = [];
  let used = 0;
  hits.forEach((hit, index) => {
    if (used >= maxTotal) return;
    const budget = Math.min(maxCharsPerHit, maxTotal - used);
    const text = hit.text.slice(0, Math.max(0, budget));
    used += text.length;
    parts.push(`[SOURCE ${index + 1}] ${hit.url}\nTITLE: ${hit.title}\nTEXT:\n${text}`);
  });
  return parts.join('\n\n');
}

export function extractionPrompt(
  careers: string[],
  profile: Profile,
  hits: SearchHit[],
  maxCharsPerHit: number,
  maxTotal: number,
  progress?: (message: string) => void,
): ChatMessage[] {
  progress?.(`Checking ${hits.length} candidate pages…`);
  const shape = {
    candidates: [
      {
        name: 'university name',
        country: 'country name or null',
        countryCode: 'ISO alpha-2 or null',
        city: 'city or null',
        programName: 'matched program name',
        languages: { value: ['English'], sourceUrl: 'exact URL', quote: 'exact excerpt' },
        instructionLanguages: ['English'],
        languageRequirement: {
          value: 'B2 or C1 if stated, else null',
          sourceUrl: 'exact URL or null',
          quote: 'exact excerpt or null',
        },
        tuition: { value: 'Free or amount or null', sourceUrl: 'exact URL', quote: 'exact excerpt' },
        overview: { value: 'one-line overview', sourceUrl: 'exact URL', quote: 'exact excerpt' },
        sourceUrls: ['URLs used for this university'],
      },
    ],
  };
  return [
    {
      role: 'system',
      content: [
        'You extract university candidates from web search results for UniFinder.',
        'Use ONLY information present in the provided search results.',
        'If a field is absent, return value: null, sourceUrl: null, quote: null. Never guess.',
        'Every non-null fact must cite one of the given URLs and include an exact quote copied from that URL\'s TEXT.',
        'The quote must be 5-30 words and must contain or clearly imply the value.',
        'If the page states a required proficiency level for the language of instruction, put it in languageRequirement; otherwise return null.',
        'sourceUrls must only contain URLs from the provided sources.',
        'Only include real universities that offer a program related to the requested careers.',
        'Do not merge two universities. If the text is about a ranking or a country in general, omit it.',
        'Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Requested careers: ${careers.join(', ')}`,
        `Student: ${profileToText(profile)}`,
        'Search results:',
        sourceBlock(hits, maxCharsPerHit, maxTotal),
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}

export function rankingPrompt(
  profile: Profile,
  universities: unknown[],
): ChatMessage[] {
  const shape = {
    items: [
      {
        rorId: 'string from input',
        career: 0.8,
        admission: 'Reach | Match | Safety | Unknown',
        language: 0.9,
        cost: 1,
        whyFits: 'one line naming real profile facts',
      },
    ],
  };
  return [
    {
      role: 'system',
      content: [
        'You rank universities for UniFinder using ONLY the verified facts provided.',
        'Never add a fact, number, requirement or language that is not in the input.',
        'Scores are 0 to 1: career fit, language fit, cost fit. Admission is Reach, Match, Safety or Unknown.',
        'Use Unknown when entry requirements are not provided.',
        'cost may be the string "depends_on_citizenship" when tuition depends on citizenship.',
        'whyFits must be one line in English naming real profile facts, e.g. "Taught in English (your C1) · tuition-free · your IB 38 meets their 36".',
        'Return one item for every provided rorId and no others. Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Student profile:\n${profileToText(profile)}`,
        `Verified universities:\n${JSON.stringify(universities, null, 2)}`,
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}

export function detailPrompt(
  universityName: string,
  program: string,
  hits: SearchHit[],
  maxCharsPerHit: number,
  maxTotal: number,
): ChatMessage[] {
  const shape = {
    overview: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    languages: { value: ['English'], sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    tuition: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    scholarships: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    deadlines: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    nextDeadline: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    exams: { value: ['string'], sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    requirements: { value: 'string or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
    applyUrl: { value: 'https://... or null', sourceUrl: 'exact URL or null', quote: 'exact excerpt or null' },
  };
  return [
    {
      role: 'system',
      content: [
        'You extract university detail facts for UniFinder from official university pages.',
        'Use ONLY information present in the provided search results.',
        'If a field is absent, return value: null, sourceUrl: null, quote: null. Never guess.',
        'Every non-null fact must cite one of the given URLs and include an exact quote copied from that URL\'s TEXT.',
        'The quote must be 5-30 words and must contain or clearly imply the value.',
        'nextDeadline must be the next upcoming deadline for an international first-year applicant. If the year is unclear, return null.',
        'Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `University: ${universityName}`,
        `Program: ${program}`,
        'Search results:',
        sourceBlock(hits, maxCharsPerHit, maxTotal),
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}

/** Used by tests to assert the counselor prompt keeps the hard rules. */
export function promptRules(profile: Profile): string[] {
  const system = counselorSystemPrompt(profile);
  return [
    `respond_in: ${primaryLanguage(profile)}`,
    'Address the student by name',
    'Ask exactly one question at a time',
    'Never prescribe a career',
  ].filter((rule) => normalizeText(system).includes(normalizeText(rule)));
}
