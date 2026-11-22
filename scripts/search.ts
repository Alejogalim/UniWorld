/**
 * Run Finder without the UI.
 *
 *   bun run scripts/search.ts "Computer Science" DE
 *   bun run scripts/search.ts "Medicine" --continent Europe --level C1
 *   bun run scripts/search.ts "Law" FR --detail https://ror.org/002t25c44 --refresh
 *   bun run scripts/search.ts "Robotics" US --debug   (prints raw AI replies and fetches)
 *
 * Finder search requires OPENROUTER_API_KEY (verified web search).
 * --detail works with OpenRouter, or with OPENCODE_API_KEY as a fallback that
 * fetches the university's own pages and still verifies every quote.
 * Optional: UNIFINDER_MODEL, UNIFINDER_DEFAULT_PROVIDER.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  Continent,
  FinderEvent,
  Level,
  Profile,
  Program,
  SearchInput,
  UniResult,
} from '../src/core/contracts';
import { FetchHttpClient } from '../src/core/adapters/fetchHttp';
import { EnvSecretStore, StaticProfile, StaticSettings } from '../src/core/adapters/env';
import {
  FileDetailCache,
  FilePageCache,
  FileSearchCache,
} from '../src/core/adapters/fileCache';
import { InMemoryCounselorStore } from '../src/core/adapters/memory';
import { createFinder } from '../src/core/finder/index';
import { RorStore } from '../src/core/grounding/rorStore';
import { loadDetail } from '../src/core/finder/detail';

interface Args {
  careers: string[];
  countries: string[];
  continent: Continent | null;
  program: Program;
  primaryLang: string;
  level: Level;
  tuitionFree: boolean;
  includeNeedToLearn: boolean;
  detailRorId: string | null;
  programName: string | null;
  refresh: boolean;
  json: boolean;
  debug: boolean;
}

const CONTINENTS: Continent[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
];

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const args: Args = {
    careers: [],
    countries: [],
    continent: null,
    program: 'IB',
    primaryLang: 'en',
    level: 'C1',
    tuitionFree: false,
    includeNeedToLearn: false,
    detailRorId: null,
    programName: null,
    refresh: false,
    json: false,
    debug: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === '--continent') {
      const value = argv[++i] ?? '';
      const matched = CONTINENTS.find((c) => c.toLowerCase() === value.toLowerCase());
      if (!matched) throw new Error(`Unknown continent: ${value}`);
      args.continent = matched;
    } else if (arg === '--program') {
      args.program = (argv[++i] ?? 'IB').toUpperCase() as Program;
    } else if (arg === '--lang') {
      args.primaryLang = (argv[++i] ?? 'en').toLowerCase();
    } else if (arg === '--level') {
      args.level = (argv[++i] ?? 'C1') as Level;
    } else if (arg === '--tuition-free') {
      args.tuitionFree = true;
    } else if (arg === '--include-need-to-learn') {
      args.includeNeedToLearn = true;
    } else if (arg === '--detail') {
      args.detailRorId = argv[++i] ?? null;
    } else if (arg === '--program-name') {
      args.programName = argv[++i] ?? null;
    } else if (arg === '--refresh') {
      args.refresh = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--debug') {
      args.debug = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  const career = positional.shift();
  if (!career) {
    throw new Error(
      'Usage: bun run scripts/search.ts "<career>" [COUNTRY...] [--continent Europe] [--tuition-free]',
    );
  }
  args.careers = career
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  args.countries = positional
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => /^[A-Z]{2}$/.test(entry));
  return args;
}

function defaultProfile(args: Args): Profile {
  return {
    name: 'Student',
    primaryLang: args.primaryLang,
    uiLang: 'en',
    languages: [{ lang: args.primaryLang, level: args.level }],
    program: args.program,
    citizenship: process.env.UNIFINDER_CITIZENSHIP ?? undefined,
    residence: process.env.UNIFINDER_RESIDENCE ?? undefined,
    grades:
      args.program === 'IB'
        ? { ib: { predictedTotal: 38 } }
        : args.program === 'AP'
          ? { ap: { gpa: 3.8 } }
          : { us: { gpaUnweighted: 3.8, sat: 1450 } },
  };
}

function inputFor(args: Args): SearchInput {
  const scope: SearchInput['scope'] = args.continent
    ? { kind: 'continent', continent: args.continent }
    : args.countries.length > 0
      ? { kind: 'countries', codes: args.countries }
      : { kind: 'global' };
  return {
    careers: args.careers,
    scope,
    filters: {
      tuitionFreeOnly: args.tuitionFree,
      spokenLanguagesOnly: true,
      includeNeedToLearn: args.includeNeedToLearn,
    },
  };
}

function printUni(uni: UniResult): void {
  const tuition = uni.tuition.value ?? 'Not found';
  const languages = uni.languages.value?.join('/') ?? 'Not found';
  console.log('');
  console.log(`• ${uni.name} — ${uni.city ?? ''} ${uni.countryCode}`);
  console.log(`  program: ${uni.program}`);
  console.log(`  languages: ${languages} | tuition: ${tuition}`);
  console.log(
    `  fit: overall ${(uni.fit.overall * 100).toFixed(0)}% (career ${(uni.fit.career * 100).toFixed(0)}%, language ${(uni.fit.language * 100).toFixed(0)}%, cost ${String(uni.fit.cost)}, admission ${uni.fit.admission})`,
  );
  console.log(`  why: ${uni.whyFits}`);
  console.log(`  sources: ${uni.sourceCount}`);
}

/**
 * Results are streamed unranked and re-emitted ranked. The CLI keeps one row
 * per rorId and prints the final, sorted list on `done`.
 */
function createPrinter(json: boolean): (event: FinderEvent) => void {
  const collected = new Map<string, UniResult>();
  return (event) => {
    if (event.type === 'result') collected.set(event.uni.rorId, event.uni);
    if (json) {
      if (event.type === 'result' || event.type === 'done' || event.type === 'error') {
        console.log(JSON.stringify(event));
      }
      return;
    }
    if (event.type === 'progress') {
      console.log(`… ${event.message}`);
      return;
    }
    if (event.type === 'error') {
      console.error(`✗ ${event.message}`);
      return;
    }
    if (event.type === 'result') return;
    const sorted = [...collected.values()].sort((a, b) => b.fit.overall - a.fit.overall);
    for (const uni of sorted) printUni(uni);
    const reasons =
      event.reasons && Object.keys(event.reasons).length > 0
        ? ` (${Object.entries(event.reasons)
            .map(([reason, count]) => `${reason}=${count}`)
            .join(', ')})`
        : '';
    console.log(`\nDone: ${event.verified} verified, ${event.removed} removed.${reasons}`);
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = path.resolve(import.meta.dir, '..', 'data', 'universities.json');
  const data = JSON.parse(await readFile(dataPath, 'utf8')) as unknown;
  const ror = RorStore.fromJson(data);
  console.log(`Loaded ${ror.size} universities from data/universities.json`);

  const cacheDir = path.resolve(import.meta.dir, '..', '.cache');
  const deps = {
    http: new FetchHttpClient(),
    secrets: new EnvSecretStore(),
    settings: new StaticSettings(),
    profile: new StaticProfile(defaultProfile(args)),
    searches: new FileSearchCache(cacheDir),
    details: new FileDetailCache(cacheDir),
    pages: new FilePageCache(cacheDir),
    counselorStore: new InMemoryCounselorStore(),
    cacheDir,
    logger: {
      debug: args.debug
        ? (message: string) => console.error(`[debug] ${message}`)
        : undefined,
      info: (message: string) => console.error(`[info] ${message}`),
      warn: (message: string) => console.error(`[warn] ${message}`),
      error: (message: string) => console.error(`[error] ${message}`),
    },
  };

  if (args.detailRorId) {
    const detail = await loadDetail(
      deps,
      ror,
      args.detailRorId,
      args.programName ?? args.careers[0] ?? 'Program',
      { refresh: args.refresh },
    );
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  const finder = createFinder({ deps, ror });
  await finder.search(inputFor(args), createPrinter(args.json));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
