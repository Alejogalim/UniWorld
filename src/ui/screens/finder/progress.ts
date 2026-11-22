import type { TFunction } from 'i18next';

const TOO_FEW = "Couldn't verify enough results, try a narrower scope.";

/** Core progress messages are English sentences; map the known ones to i18n keys, show the rest as-is. */
export function translateProgress(message: string, t: TFunction<'finder'>): string {
  if (message === 'Searching the web…') return t('progress.searching');
  if (message === 'Loaded cached results.') return t('progress.cached');
  if (message === TOO_FEW) return t('progress.tooFew');
  const checking = /^Checking (\d+) candidates against the university registry…$/.exec(message);
  if (checking) return t('progress.checking', { count: Number(checking[1]) });
  if (message === 'Suggesting universities…') return t('progress.suggesting');
  if (message === 'Reading the pages for facts…') return t('progress.readingFacts');
  const pages = /^Reading official pages \((\d+) of (\d+)\)…$/.exec(message);
  if (pages) return t('progress.readingPages', { done: Number(pages[1]), total: Number(pages[2]) });
  const verified = /^(\d+) verified, (\d+) removed\.$/.exec(message);
  if (verified) return t('progress.verified', { verified: Number(verified[1]), removed: Number(verified[2]) });
  return message;
}

export const isTooFew = (message: string) => message === TOO_FEW;
