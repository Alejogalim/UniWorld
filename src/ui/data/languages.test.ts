import { describe, expect, test } from 'bun:test';
import { languageCodeOf, languageLabel } from './languages';

describe('languageLabel', () => {
  test('names ISO codes in the UI language', () => {
    expect(languageLabel('en', 'en')).toBe('English');
    expect(languageLabel('EN', 'vi')).toBe('Tiếng Anh');
  });

  test('maps English names in any case to the UI language', () => {
    expect(languageLabel('english', 'en')).toBe('English');
    expect(languageLabel(' French ', 'en')).toBe('French');
    expect(languageLabel('english', 'es').toLowerCase()).toBe('inglés');
  });

  test('capitalises names it cannot map', () => {
    expect(languageLabel('  elvish ', 'en')).toBe('Elvish');
  });
});

describe('languageCodeOf', () => {
  test('returns the code for an ISO code in any case', () => {
    expect(languageCodeOf('en')).toBe('en');
    expect(languageCodeOf('DE')).toBe('de');
  });

  test('maps English names in any case to their code', () => {
    expect(languageCodeOf('French')).toBe('fr');
    expect(languageCodeOf(' german ')).toBe('de');
  });

  test('returns undefined for unknown names', () => {
    expect(languageCodeOf('Elvish')).toBeUndefined();
    expect(languageCodeOf('')).toBeUndefined();
  });
});
