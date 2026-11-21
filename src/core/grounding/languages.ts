import type { Level, Profile } from '../contracts';
import { normalizeText } from '../normalize';

export const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'];

export function levelScore(level: Level | null | undefined): number {
  if (!level) return 0;
  const index = LEVEL_ORDER.indexOf(level);
  return index < 0 ? 0 : index;
}

/** Design §14: "speaks a language" = B2 or higher, or Native. */
export function speaksAtB2(level: Level | null | undefined): boolean {
  return levelScore(level) >= levelScore('B2');
}

/** Common instruction languages, keyed by name/alias (normalized) -> ISO 639-1. */
const LANGUAGE_ALIASES: Record<string, string> = {
  english: 'en',
  englisch: 'en',
  ingles: 'en',
  anglais: 'en',
  inglês: 'en',
  german: 'de',
  deutsch: 'de',
  aleman: 'de',
  allemand: 'de',
  alemão: 'de',
  french: 'fr',
  francais: 'fr',
  français: 'fr',
  frances: 'fr',
  francés: 'fr',
  spanish: 'es',
  espanol: 'es',
  español: 'es',
  espanhol: 'es',
  espagnol: 'es',
  italian: 'it',
  italiano: 'it',
  italien: 'it',
  portuguese: 'pt',
  portugues: 'pt',
  português: 'pt',
  portugais: 'pt',
  dutch: 'nl',
  nederlands: 'nl',
  néerlandais: 'nl',
  flemish: 'nl',
  swedish: 'sv',
  svenska: 'sv',
  danish: 'da',
  dansk: 'da',
  norwegian: 'no',
  norsk: 'no',
  finnish: 'fi',
  suomi: 'fi',
  icelandic: 'is',
  polish: 'pl',
  polski: 'pl',
  czech: 'cs',
  cestina: 'cs',
  čeština: 'cs',
  slovak: 'sk',
  hungarian: 'hu',
  magyar: 'hu',
  romanian: 'ro',
  romana: 'ro',
  română: 'ro',
  bulgarian: 'bg',
  croatian: 'hr',
  serbian: 'sr',
  slovenian: 'sl',
  greek: 'el',
  ellinika: 'el',
  ελληνικά: 'el',
  turkish: 'tr',
  türkçe: 'tr',
  turkce: 'tr',
  russian: 'ru',
  russkiy: 'ru',
  русский: 'ru',
  ukrainian: 'uk',
  українська: 'uk',
  catalan: 'ca',
  català: 'ca',
  basque: 'eu',
  euskara: 'eu',
  galician: 'gl',
  welsh: 'cy',
  irish: 'ga',
  estonian: 'et',
  latvian: 'lv',
  lithuanian: 'lt',
  albanian: 'sq',
  macedonian: 'mk',
  bosnian: 'bs',
  arabic: 'ar',
  العربية: 'ar',
  hebrew: 'he',
  עברית: 'he',
  persian: 'fa',
  farsi: 'fa',
  urdu: 'ur',
  hindi: 'hi',
  bengali: 'bn',
  tamil: 'ta',
  thai: 'th',
  vietnamese: 'vi',
  tiengviet: 'vi',
  'tiếng việt': 'vi',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  filipino: 'tl',
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  kazakh: 'kk',
  georgian: 'ka',
  armenian: 'hy',
  azerbaijani: 'az',
  swahili: 'sw',
  afrikaans: 'af',
};

const KNOWN_CODES = new Set(Object.values(LANGUAGE_ALIASES));

let displayNames: Intl.DisplayNames | null = null;
function display(): Intl.DisplayNames | null {
  if (displayNames) return displayNames;
  try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
  } catch {
    displayNames = null;
  }
  return displayNames;
}

export function languageName(code: string): string {
  if (!code) return '';
  try {
    return display()?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Accepts "English", "en-GB", "Deutsch", "German-taught" -> ISO 639-1. */
export function languageCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const base = raw.split(/[-_,/;(\s]/)[0] ?? '';
  if (base && KNOWN_CODES.has(base)) return base;
  const normalized = normalizeText(input);
  if (!normalized) return null;
  if (KNOWN_CODES.has(normalized)) return normalized;
  const direct = LANGUAGE_ALIASES[normalized];
  if (direct) return direct;
  const compact = normalized.replace(/\s+/g, '');
  const compactMatch = LANGUAGE_ALIASES[compact];
  if (compactMatch) return compactMatch;
  if (normalized.includes(' ')) {
    for (const [alias, code] of Object.entries(LANGUAGE_ALIASES)) {
      if (alias.includes(' ') && normalized.includes(alias)) return code;
    }
  }
  return null;
}

/** Every language mentioned in a snippet such as "courses in English and German". */
export function languagesInText(text: string | null | undefined): string[] {
  if (!text) return [];
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const padded = ` ${normalized} `;
  const found = new Set<string>();
  for (const [alias, code] of Object.entries(LANGUAGE_ALIASES)) {
    if (padded.includes(` ${alias} `)) found.add(code);
  }
  return [...found];
}

export function primaryLanguage(profile: Profile): string {
  return languageCode(profile.primaryLang) ?? profile.primaryLang;
}

export function studentLanguageCodes(profile: Profile): string[] {
  const codes = new Set<string>();
  const primary = primaryLanguage(profile);
  if (primary) codes.add(primary);
  for (const entry of profile.languages ?? []) {
    const code = languageCode(entry.lang) ?? entry.lang;
    if (code) codes.add(code);
  }
  return [...codes];
}

export function studentLevel(profile: Profile, code: string): Level | null {
  const wanted = languageCode(code) ?? code;
  const primary = primaryLanguage(profile);
  if (primary && primary === wanted) return 'native';
  let best: Level | null = null;
  for (const entry of profile.languages ?? []) {
    const entryCode = languageCode(entry.lang) ?? entry.lang;
    if (entryCode !== wanted) continue;
    if (!best || levelScore(entry.level) > levelScore(best)) best = entry.level;
  }
  return best;
}

export interface LanguageFit {
  /** The student already speaks at least one instruction language at B2+. */
  speaks: boolean;
  /** Codes of instruction languages the student would have to learn. */
  needToLearn: string[];
  /** Highest level the student has among instruction languages (0 when none). */
  bestLevel: Level | null;
  /** Languages of instruction mapped to ISO codes (unknown names dropped). */
  instructionCodes: string[];
}

export function languageFit(profile: Profile, instructionLanguages: string[] | null): LanguageFit {
  const instructionCodes = [
    ...new Set(
      (instructionLanguages ?? [])
        .map((l) => languageCode(l))
        .filter((l): l is string => Boolean(l)),
    ),
  ];
  let bestLevel: Level | null = null;
  let speaks = false;
  const needToLearn: string[] = [];
  for (const code of instructionCodes) {
    const level = studentLevel(profile, code);
    if (level && (!bestLevel || levelScore(level) > levelScore(bestLevel))) bestLevel = level;
    if (level && speaksAtB2(level)) speaks = true;
    else needToLearn.push(code);
  }
  if (instructionCodes.length === 0) {
    return { speaks: false, needToLearn: [], bestLevel: null, instructionCodes: [] };
  }
  return { speaks, needToLearn, bestLevel, instructionCodes };
}
