import { describe, expect, it } from 'bun:test';
import type { Profile } from '../contracts';
import { counselorSystemPrompt, promptRules } from './prompts';

const en: Profile = { name: 'Ana', primaryLang: 'en', uiLang: 'en', languages: [{ lang: 'en', level: 'C1' }], program: 'IB' };
const es: Profile = { name: 'Lucía', primaryLang: 'es', uiLang: 'es', languages: [{ lang: 'es', level: 'native' }], program: 'IB' };
const vi: Profile = { name: 'Minh', primaryLang: 'vi', uiLang: 'vi', languages: [{ lang: 'vi', level: 'native' }], program: 'AP' };

describe('counselorSystemPrompt', () => {
  it('keeps every hard rule', () => {
    expect(promptRules(en)).toHaveLength(5);
    expect(promptRules(es)).toHaveLength(5);
  });

  it('names the student and the reply language', () => {
    const system = counselorSystemPrompt(en);
    expect(system).toContain('talking with Ana');
    expect(system).toContain('respond_in: en');
    expect(counselorSystemPrompt(es)).toContain('respond_in: es');
  });

  it('uses the form of address for Spanish and Vietnamese only', () => {
    expect(counselorSystemPrompt(es)).toContain('"tú"');
    expect(counselorSystemPrompt(vi)).toContain('"mình"');
    expect(counselorSystemPrompt(en)).not.toContain('"tú"');
  });

  it('names the career-ideas button in the UI language', () => {
    expect(counselorSystemPrompt(en)).toContain('"Show my career ideas"');
    expect(counselorSystemPrompt(es)).toContain('"Mostrar mis ideas de carrera"');
    expect(counselorSystemPrompt(vi)).toContain('"Xem gợi ý nghề nghiệp của tôi"');
  });

  it('carries the answer count for the wrap-up', () => {
    expect(counselorSystemPrompt(en)).toContain('Student answers so far: 0.');
    expect(counselorSystemPrompt(en, { studentAnswers: 7 })).toContain('Student answers so far: 7.');
  });

  it('has the checklist, the safety override and the intake rule', () => {
    const system = counselorSystemPrompt(en);
    expect(system).toContain('YOUR HIDDEN CHECKLIST');
    expect(system).toContain('SAFETY (this overrides every other rule)');
    expect(system).toContain('[intake N/6]');
    expect(system).toContain('End the reply with <follow/>.');
    expect(system).toContain('Next topic: none');
    expect(system).not.toContain('Address the student by name');
  });
});
