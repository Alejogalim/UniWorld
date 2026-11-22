import { describe, expect, it } from 'bun:test';
import type { OnboardingDraft } from './useOnboardingDraft';
import { aiKeyMissing, validateStep } from './draftRules';

const base: OnboardingDraft = {
  step: 6,
  prefilled: false,
  name: '',
  primaryLang: null,
  languages: [],
  program: null,
  grades: {
    ibPredicted: '',
    ibSubjects: [],
    apGpa: '',
    apExams: [],
    usGpa: '',
    usSat: '',
    usAct: '',
  },
  citizenship: null,
  residence: null,
  openrouterKey: '',
  opencodeKey: '',
  storedKeys: { openrouter: false, opencode: false },
};

describe('AI key step (step 6): at least one key', () => {
  it('is valid with only an OpenCode key typed', () => {
    const d = { ...base, opencodeKey: 'oc-key' };
    expect(aiKeyMissing(d)).toBe(false);
    expect(validateStep(6, d)).toEqual({});
  });

  it('is valid with only an OpenCode key already stored', () => {
    const d = { ...base, storedKeys: { openrouter: false, opencode: true } };
    expect(validateStep(6, d)).toEqual({});
  });

  it('is valid with only an OpenRouter key', () => {
    const d = { ...base, openrouterKey: 'or-key' };
    expect(validateStep(6, d)).toEqual({});
  });

  it('is invalid when both keys are empty and neither is stored', () => {
    expect(aiKeyMissing(base)).toBe(true);
    expect(validateStep(6, base)).toEqual({ openrouterKey: { key: 'ai.errorAtLeastOne' } });
  });

  it('treats whitespace-only input as empty', () => {
    const d = { ...base, openrouterKey: '   ', opencodeKey: '  ' };
    expect(validateStep(6, d)).toEqual({ openrouterKey: { key: 'ai.errorAtLeastOne' } });
  });
});
