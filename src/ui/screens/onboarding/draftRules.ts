import type { Grades, Profile, UiLang } from '@/core/contracts';
import type { GradesDraft, OnboardingDraft } from './useOnboardingDraft';

/** A validation message: an onboarding i18n key plus its interpolation values. */
export interface FieldError {
  key: string;
  values?: Record<string, number>;
}
export type Errors = Record<string, FieldError>;

export const STEP_COUNT = 7;
export const NAME_MAX = 60;

/** Parses a typed number, accepting a decimal comma. Empty input is `null`; junk is `NaN`. */
function parse(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}

function checkNumber(
  errors: Errors,
  field: string,
  raw: string,
  min: number,
  max: number,
  whole: boolean,
): number | null {
  const n = parse(raw);
  if (n === null) return null;
  const ok = Number.isFinite(n) && n >= min && n <= max && (!whole || Number.isInteger(n));
  if (!ok) {
    errors[field] = { key: whole ? 'grades.whole' : 'grades.range', values: { min, max } };
  }
  return ok ? n : null;
}

/** A subject or exam row: empty rows are skipped; a started row needs a name and a whole score 1..max. */
function checkRow(errors: Errors, id: string, name: string, score: string, max: number, nameKey: string) {
  if (name.trim() === '' && score.trim() === '') return;
  if (name.trim() === '') errors[`${id}-name`] = { key: nameKey };
  if (score.trim() === '') {
    errors[`${id}-score`] = { key: 'grades.scoreMissing', values: { min: 1, max } };
  } else {
    checkNumber(errors, `${id}-score`, score, 1, max, true);
  }
}

function validateGrades(d: OnboardingDraft, errors: Errors) {
  const g: GradesDraft = d.grades;
  if (d.program === 'IB') {
    checkNumber(errors, 'ibPredicted', g.ibPredicted, 0, 45, true);
    for (const row of g.ibSubjects) {
      checkRow(errors, `subject-${row.key}`, row.name, row.score, 7, 'grades.subjectName');
    }
  } else if (d.program === 'AP') {
    checkNumber(errors, 'apGpa', g.apGpa, 0, 5, false);
    for (const row of g.apExams) {
      checkRow(errors, `exam-${row.key}`, row.name, row.score, 5, 'grades.examName');
    }
  } else if (d.program === 'US') {
    checkNumber(errors, 'usGpa', g.usGpa, 0, 4, false);
    checkNumber(errors, 'usSat', g.usSat, 400, 1600, true);
    checkNumber(errors, 'usAct', g.usAct, 1, 36, true);
  }
}

/**
 * Validation for one step. Step 0 (welcome) has no rules; step 6 is the AI key step.
 */
export function validateStep(step: number, d: OnboardingDraft): Errors {
  const errors: Errors = {};
  if (step === 1) {
    const name = d.name.trim();
    if (name === '') errors.name = { key: 'name.errorRequired' };
    else if (name.length > NAME_MAX) errors.name = { key: 'name.errorTooLong', values: { max: NAME_MAX } };
  }
  if (step === 2) {
    if (!d.primaryLang) errors.primaryLang = { key: 'languages.errorPrimaryRequired' };
    const seen = new Set<string>();
    for (const row of d.languages) {
      if (!row.lang) errors[`lang-${row.key}`] = { key: 'languages.errorLangMissing' };
      else if (row.lang === d.primaryLang) errors[`lang-${row.key}`] = { key: 'languages.errorPrimaryRepeat' };
      else if (seen.has(row.lang)) errors[`lang-${row.key}`] = { key: 'languages.errorDuplicate' };
      else seen.add(row.lang);
      if (!row.level) errors[`level-${row.key}`] = { key: 'languages.errorLevelMissing' };
    }
  }
  if (step === 3 && !d.program) errors.program = { key: 'program.errorRequired' };
  if (step === 4) validateGrades(d, errors);
  if (step === 6 && d.openrouterKey.trim() === '') {
    errors.openrouterKey = { key: 'ai.openrouter.errorRequired' };
  }
  return errors;
}

/** First step (1–4) whose rules fail, so Finish can send the student back to it. */
export function firstInvalidStep(d: OnboardingDraft): number | null {
  for (const step of [1, 2, 3, 4]) {
    if (Object.keys(validateStep(step, d)).length > 0) return step;
  }
  return null;
}

/** Grades for the chosen program only. Empty fields are omitted; no zeros, no empty objects. */
export function buildGrades(d: OnboardingDraft): Grades | undefined {
  const g = d.grades;
  const num = (raw: string) => parse(raw) ?? undefined;
  if (d.program === 'IB') {
    const subjects = g.ibSubjects
      .filter((r) => r.name.trim() !== '' || r.score.trim() !== '')
      .map((r) => ({ name: r.name.trim(), level: r.level, score: Number(parse(r.score)) }));
    const ib: NonNullable<Grades['ib']> = {};
    const predictedTotal = num(g.ibPredicted);
    if (predictedTotal !== undefined) ib.predictedTotal = predictedTotal;
    if (subjects.length > 0) ib.subjects = subjects;
    return Object.keys(ib).length > 0 ? { ib } : undefined;
  }
  if (d.program === 'AP') {
    const exams = g.apExams
      .filter((r) => r.name.trim() !== '' || r.score.trim() !== '')
      .map((r) => ({ name: r.name.trim(), score: Number(parse(r.score)) }));
    const ap: NonNullable<Grades['ap']> = {};
    const gpa = num(g.apGpa);
    if (gpa !== undefined) ap.gpa = gpa;
    if (exams.length > 0) ap.exams = exams;
    return Object.keys(ap).length > 0 ? { ap } : undefined;
  }
  if (d.program === 'US') {
    const us: NonNullable<Grades['us']> = {};
    const gpa = num(g.usGpa);
    const sat = num(g.usSat);
    const act = num(g.usAct);
    if (gpa !== undefined) us.gpaUnweighted = gpa;
    if (sat !== undefined) us.sat = sat;
    if (act !== undefined) us.act = act;
    return Object.keys(us).length > 0 ? { us } : undefined;
  }
  return undefined;
}

/** Builds the saved profile. Returns null if a required field is missing (Finish checks first). */
export function buildProfile(d: OnboardingDraft, uiLang: UiLang): Profile | null {
  const name = d.name.trim();
  if (name === '' || !d.primaryLang || !d.program) return null;
  const languages: Profile['languages'] = [];
  for (const row of d.languages) {
    if (!row.lang || !row.level) return null;
    languages.push({ lang: row.lang, level: row.level });
  }
  const profile: Profile = { name, primaryLang: d.primaryLang, uiLang, languages, program: d.program };
  if (d.citizenship) profile.citizenship = d.citizenship;
  if (d.residence) profile.residence = d.residence;
  const grades = buildGrades(d);
  if (grades) profile.grades = grades;
  return profile;
}
