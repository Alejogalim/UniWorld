import { create } from 'zustand';
import type { Grades, Level, Profile, Program } from '@/core/contracts';

/** In-memory onboarding draft. Keys live here until Finish, then the draft is reset. */

export interface LanguageRow {
  key: number;
  lang: string | null;
  level: Level | null;
}

export interface SubjectRow {
  key: number;
  name: string;
  level: 'HL' | 'SL';
  score: string;
}

export interface ExamRow {
  key: number;
  name: string;
  score: string;
}

/** Grades are kept as typed strings; `draftRules.buildGrades` turns them into numbers. */
export interface GradesDraft {
  ibPredicted: string;
  ibSubjects: SubjectRow[];
  apGpa: string;
  apExams: ExamRow[];
  usGpa: string;
  usSat: string;
  usAct: string;
}

export interface OnboardingDraft {
  step: number;
  /** True once the draft was filled from an existing profile (so it is not done twice). */
  prefilled: boolean;
  name: string;
  primaryLang: string | null;
  languages: LanguageRow[];
  program: Program | null;
  grades: GradesDraft;
  citizenship: string | null;
  residence: string | null;
  openrouterKey: string;
  opencodeKey: string;
}

const EMPTY_GRADES: GradesDraft = {
  ibPredicted: '',
  ibSubjects: [],
  apGpa: '',
  apExams: [],
  usGpa: '',
  usSat: '',
  usAct: '',
};

const INITIAL: OnboardingDraft = {
  step: 0,
  prefilled: false,
  name: '',
  primaryLang: null,
  languages: [],
  program: null,
  grades: EMPTY_GRADES,
  citizenship: null,
  residence: null,
  openrouterKey: '',
  opencodeKey: '',
};

let keySeq = 0;
/** Stable React key for a row that can be added or removed. */
export function newRowKey(): number {
  keySeq += 1;
  return keySeq;
}

function gradesFromProfile(grades: Grades | undefined): GradesDraft {
  const str = (n: number | undefined) => (n === undefined ? '' : String(n));
  return {
    ibPredicted: str(grades?.ib?.predictedTotal),
    ibSubjects: (grades?.ib?.subjects ?? []).map((s) => ({
      key: newRowKey(),
      name: s.name,
      level: s.level,
      score: String(s.score),
    })),
    apGpa: str(grades?.ap?.gpa),
    apExams: (grades?.ap?.exams ?? []).map((e) => ({ key: newRowKey(), name: e.name, score: String(e.score) })),
    usGpa: str(grades?.us?.gpaUnweighted),
    usSat: str(grades?.us?.sat),
    usAct: str(grades?.us?.act),
  };
}

interface DraftState extends OnboardingDraft {
  set(patch: Partial<OnboardingDraft>): void;
  setGrades(patch: Partial<GradesDraft>): void;
  prefill(profile: Profile): void;
  reset(): void;
}

export const useOnboardingDraft = create<DraftState>((set) => ({
  ...INITIAL,
  set: (patch) => set(patch),
  setGrades: (patch) => set((s) => ({ grades: { ...s.grades, ...patch } })),
  prefill: (profile) =>
    set({
      ...INITIAL,
      prefilled: true,
      name: profile.name,
      primaryLang: profile.primaryLang,
      languages: profile.languages.map((l) => ({ key: newRowKey(), lang: l.lang, level: l.level })),
      program: profile.program,
      grades: gradesFromProfile(profile.grades),
      citizenship: profile.citizenship ?? null,
      residence: profile.residence ?? null,
    }),
  reset: () => set({ ...INITIAL }),
}));
