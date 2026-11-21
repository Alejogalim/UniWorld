import type { CareerPath, CounselorWeights, Level, Profile } from '../contracts';
import type { CareerIdeasAI } from '../schemas';

export function weightedFitBreakdown(
  scores: CareerIdeasAI['careers'][number]['scores'],
  weights: CounselorWeights,
): Record<string, number> {
  const dimensions = ['passions', 'strengths', 'goals', 'earning'] as const;
  const weightTotal = dimensions.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
  const breakdown: Record<string, number> = {};
  for (const key of dimensions) {
    breakdown[key] = Math.round((scores[key] / 10) * 100);
  }
  const weighted =
    weightTotal > 0
      ? dimensions.reduce((sum, key) => sum + scores[key] * (weights[key] ?? 0), 0) /
        (10 * weightTotal)
      : 0;
  breakdown.overall = Math.round(Math.max(0, Math.min(1, weighted)) * 100);
  return breakdown;
}

export function toCareerPaths(
  ai: CareerIdeasAI,
  weights: CounselorWeights,
): Omit<CareerPath, 'id' | 'saved'>[] {
  return ai.careers.map((career) => ({
    title: career.title,
    summary: career.summary,
    whyYou: career.whyYou,
    degreeKeywords: career.degreeKeywords.map((keyword) => keyword.trim()).filter(Boolean),
    fitBreakdown: weightedFitBreakdown(career.scores, weights),
  }));
}

/** Design §14: B2 or higher, or Native, counts as "speaks". */
export function speaksLanguage(level: Level): boolean {
  return level === 'B2' || level === 'C1' || level === 'C2' || level === 'native';
}

export function counselorLanguage(profile: Profile): string {
  return profile.primaryLang;
}
