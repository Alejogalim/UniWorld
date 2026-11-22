import type { Profile, SearchInput } from '../contracts';
import { callJson, nextTokenBudget } from '../ai/json';
import { queryPlanPrompt } from '../ai/prompts';
import type { AiClient } from '../ai/types';
import { MAX_SEARCH_QUERIES, QUERY_PLAN_MAX_TOKENS } from '../config';
import { countryName } from '../grounding/countries';
import { languageName, studentLevel, speaksAtB2 } from '../grounding/languages';
import type { Logger } from '../ports';
import { queryPlanSchema } from '../schemas';

function scopePhrase(input: SearchInput): string {
  if (input.scope.kind === 'global') return 'worldwide';
  if (input.scope.kind === 'continent') return input.scope.continent;
  return input.scope.codes.map((code) => countryName(code)).join(' or ');
}

function spokenLanguages(profile: Profile): string[] {
  const names: string[] = [];
  const primary = profile.primaryLang;
  if (primary) names.push(languageName(primary) || primary);
  for (const entry of profile.languages ?? []) {
    if (speaksAtB2(entry.level)) names.push(languageName(entry.lang) || entry.lang);
  }
  return [...new Set(names)];
}

export function fallbackQueries(profile: Profile, input: SearchInput): string[] {
  const scope = scopePhrase(input);
  const languages = spokenLanguages(profile);
  const languagePhrase = languages.length > 0 ? `taught in ${languages.join(' or ')}` : '';
  const tuitionPhrase = input.filters.tuitionFreeOnly ? 'no tuition fees' : '';
  const extras = [languagePhrase, tuitionPhrase].filter(Boolean).join(' ');
  const queries = input.careers
    .slice(0, 2)
    .map(
      (career) =>
        `university bachelor ${career} program ${scope} ${extras}`.replace(/\s+/g, ' ').trim(),
    );
  const generic = `university bachelor programs ${scope} ${extras}`.replace(/\s+/g, ' ').trim();
  if (queries.length === 0) queries.push(generic);
  if (queries.length < 2) queries.push(generic);
  return [...new Set(queries)].slice(0, MAX_SEARCH_QUERIES);
}

export async function planQueries(
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  logger?: Logger,
): Promise<string[]> {
  try {
    const plan = await callJson({
      schema: queryPlanSchema,
      messages: queryPlanPrompt(profile, input),
      complete: (messages, attempt) =>
        client.chat(messages, {
          json: true,
          temperature: 0.2,
          maxTokens: nextTokenBudget(QUERY_PLAN_MAX_TOKENS, attempt),
        }),
      logger,
    });
    const queries = [
      ...new Set(plan.queries.map((entry) => entry.query.trim()).filter(Boolean)),
    ].slice(0, MAX_SEARCH_QUERIES);
    if (queries.length > 0) return queries;
  } catch (error) {
    logger?.warn?.(
      `Query planning failed, using fallback queries: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return fallbackQueries(profile, input);
}

/** Exported for tests: a student's B2+ languages are the ones worth searching in. */
export function searchableLanguages(profile: Profile): string[] {
  return (profile.languages ?? [])
    .filter((entry) => speaksAtB2(entry.level))
    .map((entry) => entry.lang);
}

/** Small helper used by the CLI output. */
export function levelLabel(profile: Profile, lang: string): string {
  return studentLevel(profile, lang) ?? 'unknown';
}
