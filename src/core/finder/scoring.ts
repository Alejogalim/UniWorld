import type { AdmissionFit, Profile, UniResult } from '../contracts';
import { RANK_WEIGHTS } from '../config';
import { languageCode, languageFit, languageName, studentLevel, speaksAtB2 } from '../grounding/languages';
import { nameTokens, normalizeText, tokens } from '../normalize';

const EU_EEA = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
]);

export function isEuEeaCitizen(profile: Profile): boolean | null {
  if (!profile.citizenship) return null;
  return EU_EEA.has(profile.citizenship.toUpperCase());
}

export function isFreeTuition(value: string | null): boolean {
  if (!value) return false;
  const normalized = normalizeText(value);
  return (
    normalized === 'free' ||
    /\b(free|no tuition|tuition free|tuition-free|free of charge|no fees|gratis|kostenlos)\b/.test(
      normalized,
    )
  );
}

export function costFit(
  tuition: string | null,
  profile: Profile,
): number | 'depends_on_citizenship' {
  if (!tuition) return 'depends_on_citizenship';
  const normalized = normalizeText(tuition);
  if (isFreeTuition(tuition)) {
    if (/\b(eu|eea|european union|european economic area)\b/.test(normalized)) {
      const eu = isEuEeaCitizen(profile);
      if (eu === null) return 'depends_on_citizenship';
      return eu ? 1 : 0.15;
    }
    return 1;
  }
  if (/depends|citizenship|residency/.test(normalized)) return 'depends_on_citizenship';
  const match = normalized.match(/\d[\d\s.,]*\d|\d/);
  if (!match) return 'depends_on_citizenship';
  const amount = Number(match[0].replace(/[\s.,]/g, ''));
  if (!Number.isFinite(amount)) return 'depends_on_citizenship';
  if (amount <= 1500) return 0.85;
  if (amount <= 5000) return 0.65;
  if (amount <= 12000) return 0.45;
  if (amount <= 25000) return 0.3;
  return 0.15;
}

export function languageFitScore(profile: Profile, languages: string[] | null): number {
  if (!languages || languages.length === 0) return 0;
  const fit = languageFit(profile, languages);
  if (fit.speaks) return 1;
  if (!fit.bestLevel) return 0;
  switch (fit.bestLevel) {
    case 'B1':
      return 0.6;
    case 'A2':
      return 0.35;
    case 'A1':
      return 0.2;
    default:
      return 0.6;
  }
}

export function careerFit(program: string, careers: string[]): number {
  if (!program || careers.length === 0) return 0;
  const programTokens = new Set(tokens(program));
  let best = 0;
  for (const career of careers) {
    const careerTokens = nameTokens(career);
    if (careerTokens.length === 0) continue;
    let shared = 0;
    for (const token of careerTokens) if (programTokens.has(token)) shared++;
    best = Math.max(best, shared / careerTokens.length);
  }
  return Math.min(1, best);
}

export function admissionScore(fit: AdmissionFit): number {
  switch (fit) {
    case 'Safety':
      return 1;
    case 'Match':
      return 0.8;
    case 'Reach':
      return 0.35;
    default:
      return 0.5;
  }
}

export function overallFit(result: Pick<UniResult, 'fit'>): number {
  const cost = result.fit.cost === 'depends_on_citizenship' ? 0.5 : result.fit.cost;
  const total =
    result.fit.career * RANK_WEIGHTS.career +
    result.fit.language * RANK_WEIGHTS.language +
    cost * RANK_WEIGHTS.cost +
    admissionScore(result.fit.admission) * RANK_WEIGHTS.admission;
  return Math.max(0, Math.min(1, total));
}

const CLAIM_STOPWORDS = new Set([
  'your',
  'you',
  'their',
  'taught',
  'in',
  'and',
  'the',
  'meets',
  'this',
  'fits',
  'fit',
  'with',
  'for',
  'free',
  'tuition',
  'tuition-free',
]);

/** A conservative honesty check for the one-line "why this fits you". */
export function sanitizeWhyFits(
  why: string,
  profile: Profile,
  result: UniResult,
  fallback: string,
): string {
  const trimmed = why.trim();
  if (trimmed.split(/\s+/).filter(Boolean).length < 3) return fallback;

  const profileText = normalizeText(
    JSON.stringify({
      program: profile.program,
      grades: profile.grades ?? null,
      languages: profile.languages,
      primary: profile.primaryLang,
      citizenship: profile.citizenship ?? null,
      residence: profile.residence ?? null,
    }),
  );
  const factText = normalizeText(
    [
      result.program,
      result.tuition.value ?? '',
      (result.languages.value ?? []).join(' '),
      result.overview.value ?? '',
    ].join(' '),
  );
  const allowedNumbers = new Set(
    `${profileText} ${factText}`
      .match(/\d{1,4}(?:[.,]\d+)?/g)
      ?.map((n) => n.replace(',', '.')) ?? [],
  );
  const year = new Date().getUTCFullYear();
  for (let y = year - 2; y <= year + 6; y++) allowedNumbers.add(String(y));

  for (const match of trimmed.matchAll(/\d{1,4}(?:[.,]\d+)?/g)) {
    const number = match[0].replace(',', '.');
    if (!allowedNumbers.has(number)) return fallback;
  }

  const mentionedLanguages = tokens(trimmed);
  const instruction = new Set(
    (result.languages.value ?? []).map((value) => normalizeText(value)).filter(Boolean),
  );
  for (const token of mentionedLanguages) {
    if (CLAIM_STOPWORDS.has(token)) continue;
    if (instruction.size === 0) continue;
    if (/^(english|german|french|spanish|italian|dutch|swedish|danish|norwegian|finnish|polish|czech|portuguese|turkish|greek|russian|arabic|chinese|japanese|korean|vietnamese)$/.test(token)) {
      if (!instruction.has(token)) return fallback;
    }
  }

  if (/\b(free|tuition-free|no tuition)\b/i.test(trimmed) && costFit(result.tuition.value, profile) !== 1) {
    return fallback;
  }

  return trimmed;
}

/** Human-readable fallback built only from verified facts and the profile. */
export function fallbackWhyFits(profile: Profile, result: UniResult): string {
  const parts: string[] = [];
  const languages = result.languages.value ?? [];
  if (languages.length > 0) {
    const primary = languages[0];
    const primaryCode = primary ? (languageCode(primary) ?? primary) : '';
    const level = primaryCode ? studentLevel(profile, primaryCode) : null;
    const spoken = level && speaksAtB2(level);
    parts.push(
      spoken
        ? `Taught in ${languageName(primaryCode)} (your ${level})`
        : `Taught in ${languages.map((l) => languageName(languageCode(l) ?? l) || l).join('/')}`,
    );
  }
  if (costFit(result.tuition.value, profile) === 1) parts.push('tuition-free');
  else if (result.tuition.value) parts.push(`tuition ${result.tuition.value}`);
  if (result.needToLearn) {
    parts.push(`you'd need to learn ${languageName(result.needToLearn.lang)}`);
  }
  if (parts.length === 0) parts.push(`Program: ${result.program}`);
  return parts.join(' · ');
}
