import { z } from 'zod';
import type { CounselorNoteArea } from './contracts';

/**
 * Zod schemas for every AI JSON response. They intentionally mirror
 * `contracts.ts` but only describe what the model returns; `checkedAt`,
 * `sourceKind` and ids are filled in by code, never trusted from the model.
 */

const nullableString = z.string().nullable();

export function aiFactSchema<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    value: value.nullable(),
    sourceUrl: nullableString,
    quote: nullableString,
  });
}

export const aiStringFactSchema = aiFactSchema(z.string());
export const aiStringArrayFactSchema = aiFactSchema(z.array(z.string()));

export type AiStringFact = z.infer<typeof aiStringFactSchema>;
export type AiStringArrayFact = z.infer<typeof aiStringArrayFactSchema>;

// ---------- Counselor careers (Design §7.2) ----------
export const careerScoresSchema = z.object({
  passions: z.number().min(0).max(10),
  strengths: z.number().min(0).max(10),
  goals: z.number().min(0).max(10),
  earning: z.number().min(0).max(10),
});

export const careerIdeaSchema = z.object({
  title: z.string().min(2).max(120),
  summary: z.string().min(10).max(600),
  whyYou: z.string().min(10).max(600),
  degreeKeywords: z.array(z.string().min(2)).min(1).max(8),
  scores: careerScoresSchema,
});

export const careerIdeasSchema = z.object({
  careers: z.array(careerIdeaSchema).min(3).max(5),
});

export type CareerIdeasAI = z.infer<typeof careerIdeasSchema>;

// ---------- Counselor notes (plan 30) ----------
export const COUNSELOR_NOTE_AREAS = ['interests', 'strengths', 'values', 'workStyle', 'limits'] as const;

/** Lenient: a missing or null list is empty; extra or long items are trimmed instead of rejected. */
const noteList = z
  .array(z.string())
  .nullish()
  .transform((items) =>
    (items ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 100))
      .slice(0, 4),
  );

export const counselorNotesSchema = z.object({
  interests: noteList,
  strengths: noteList,
  values: noteList,
  workStyle: noteList,
  limits: noteList,
  gaps: z
    .array(z.string())
    .nullish()
    .transform((items) =>
      (items ?? []).filter((item): item is CounselorNoteArea =>
        (COUNSELOR_NOTE_AREAS as readonly string[]).includes(item),
      ),
    ),
});

// ---------- Finder: query plan (Design §7.3 step 1) ----------
export const queryPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        query: z.string().min(3).max(240),
        purpose: z.string().max(160).optional(),
      }),
    )
    .min(2)
    .max(3),
});

export type QueryPlanAI = z.infer<typeof queryPlanSchema>;

// ---------- Finder: extraction (Design §7.3 step 3) ----------
export const candidateSchema = z.object({
  name: z.string().min(2).max(200),
  country: z.string().max(80).nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  programName: z.string().max(200),
  /** Evidence-backed languages of instruction. */
  languages: aiStringArrayFactSchema,
  /** Flat list derived from `languages`; kept for the Design shape. */
  instructionLanguages: z.array(z.string()).default([]),
  tuition: aiStringFactSchema,
  overview: aiStringFactSchema,
  /** Optional sourced requirement for the language of instruction. */
  languageRequirement: aiStringFactSchema.optional(),
  sourceUrls: z.array(z.string()).default([]),
});

export const extractionSchema = z.object({
  candidates: z.array(candidateSchema).max(40),
});

export type ExtractedCandidate = z.infer<typeof candidateSchema>;
export type ExtractionAI = z.infer<typeof extractionSchema>;

// ---------- Finder: ranking (Design §7.3 step 5) ----------
export const admissionFitSchema = z.enum(['Reach', 'Match', 'Safety', 'Unknown']);

export const rankingItemSchema = z.object({
  rorId: z.string().min(1),
  career: z.number().min(0).max(1),
  admission: admissionFitSchema,
  language: z.number().min(0).max(1),
  cost: z.union([z.number().min(0).max(1), z.literal('depends_on_citizenship')]),
  whyFits: z.string().min(3).max(240),
});

export const rankingSchema = z.object({
  items: z.array(rankingItemSchema).max(40),
});

export type RankingAI = z.infer<typeof rankingSchema>;
export type RankingItemAI = z.infer<typeof rankingItemSchema>;

// ---------- Finder: detail (Design §7.3) ----------
export const uniDetailAiSchema = z.object({
  overview: aiStringFactSchema,
  languages: aiStringArrayFactSchema,
  tuition: aiStringFactSchema,
  scholarships: aiStringFactSchema,
  deadlines: aiStringFactSchema,
  nextDeadline: aiStringFactSchema,
  exams: aiStringArrayFactSchema,
  requirements: aiStringFactSchema,
  applyUrl: aiStringFactSchema,
});

export type UniDetailAi = z.infer<typeof uniDetailAiSchema>;
