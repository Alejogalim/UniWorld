/** All ISO 639-1 language codes (184). Names come from Intl, in the UI language. */
export const LANGUAGE_CODES: readonly string[] = [
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
  'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
  'da', 'de', 'dv', 'dz',
  'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
  'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
  'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
  'ja', 'jv',
  'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
  'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
  'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
  'oc', 'oj', 'om', 'or', 'os',
  'pa', 'pi', 'pl', 'ps', 'pt',
  'qu',
  'rm', 'rn', 'ro', 'ru', 'rw',
  'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
  'ug', 'uk', 'ur', 'uz',
  've', 'vi', 'vo',
  'wa', 'wo',
  'xh',
  'yi', 'yo',
  'za', 'zh', 'zu',
];

const cache = new Map<string, Intl.DisplayNames | null>();

function namesFor(uiLang: string): Intl.DisplayNames | null {
  if (!cache.has(uiLang)) {
    try {
      cache.set(uiLang, new Intl.DisplayNames([uiLang], { type: 'language' }));
    } catch {
      cache.set(uiLang, null);
    }
  }
  return cache.get(uiLang) ?? null;
}

/** Language name in the UI language, e.g. "es" -> "Spanish" / "español". Falls back to the code. */
export function languageName(code: string, uiLang: string): string {
  try {
    return namesFor(uiLang)?.of(code) ?? code;
  } catch {
    return code;
  }
}

let englishNames: Map<string, string> | null = null;

/** ISO 639-1 code for an English language name in any case ("english" -> "en"), or null. */
function codeForEnglishName(name: string): string | null {
  if (!englishNames) {
    englishNames = new Map();
    const en = namesFor('en');
    if (en) {
      for (const code of LANGUAGE_CODES) {
        try {
          const label = en.of(code);
          if (label && label !== code) englishNames.set(label.toLowerCase(), code);
        } catch {
          // Unknown to this engine's Intl data: skip it.
        }
      }
    }
  }
  return englishNames.get(name.toLowerCase()) ?? null;
}

/**
 * A language as the core returned it (an ISO code like "en" or a name like "english"), shown in the
 * UI language. Unknown names are trimmed and capitalised, never shown raw.
 */
export function languageLabel(raw: string, uiLang: string): string {
  const value = raw.trim();
  const lower = value.toLowerCase();
  if (LANGUAGE_CODES.includes(lower)) return languageName(lower, uiLang);
  const code = codeForEnglishName(value);
  if (code) return languageName(code, uiLang);
  return value.charAt(0).toLocaleUpperCase(uiLang) + value.slice(1);
}

/** ISO 639-1 code for an ISO code or an English language name in any case ("French" -> "fr"), or undefined. */
export function languageCodeOf(nameOrCode: string): string | undefined {
  const value = nameOrCode.trim();
  const lower = value.toLowerCase();
  if (LANGUAGE_CODES.includes(lower)) return lower;
  return codeForEnglishName(value) ?? undefined;
}
