import { COUNTRY_CODES, countryName } from '@/ui/data/countries';
import { LANGUAGE_CODES, languageName } from '@/ui/data/languages';
import type { ComboboxOption } from '@/ui/components/Combobox';

/** Every ISO 639-1 language, named in the UI language, sorted for that language. */
export function languageOptions(uiLang: string): ComboboxOption[] {
  return LANGUAGE_CODES.map((code) => ({
    value: code,
    label: languageName(code, uiLang),
    code,
  })).sort((a, b) => a.label.localeCompare(b.label, uiLang));
}

/** Every ISO 3166-1 country with its flag disc, named in the UI language. */
export function countryOptions(uiLang: string): ComboboxOption[] {
  return COUNTRY_CODES.map((code) => ({
    value: code,
    label: countryName(code, uiLang),
    code,
    flag: code,
  })).sort((a, b) => a.label.localeCompare(b.label, uiLang));
}
