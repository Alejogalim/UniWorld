/**
 * Chat with the counselor from the terminal. Useful for testing OpenCode Go
 * before OpenRouter is set up (Finder still requires OpenRouter).
 *
 *   bun run counselor
 *   bun run counselor --provider opencode --lang en --level C1
 *   bun run counselor --once "I like building things."
 *   bun run counselor --weights 9,8,7,6
 *   bun run counselor --provider opencode --demo
 *
 * In the chat, type /careers after ~8 student messages to test career
 * synthesis without the UI. `--demo` seeds eight answers and prints careers.
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type {
  CounselorWeights,
  Level,
  Profile,
  Program,
  Provider,
} from '../src/core/contracts';
import { FetchHttpClient } from '../src/core/adapters/fetchHttp';
import { EnvSecretStore, StaticProfile, StaticSettings, consoleLogger } from '../src/core/adapters/env';
import { InMemoryCounselorStore } from '../src/core/adapters/memory';
import { Counselor } from '../src/core/counselor/index';

interface Args {
  provider: Provider | null;
  name: string;
  lang: string;
  level: Level;
  program: Program;
  once: string | null;
  weights: CounselorWeights;
  demo: boolean;
}

function parseWeights(value: string | undefined): CounselorWeights {
  const parts = (value ?? '8,8,8,8').split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 1 || part > 10)) {
    throw new Error('--weights must be four numbers 1-10: passions,strengths,goals,earning');
  }
  return {
    passions: parts[0]!,
    strengths: parts[1]!,
    goals: parts[2]!,
    earning: parts[3]!,
  };
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    provider: null,
    name: 'Student',
    lang: 'en',
    level: 'C1',
    program: 'IB',
    once: null,
    weights: parseWeights(undefined),
    demo: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === '--provider') {
      const value = argv[++i]?.toLowerCase();
      if (value !== 'opencode' && value !== 'openrouter') {
        throw new Error('--provider must be "opencode" or "openrouter"');
      }
      args.provider = value;
    } else if (arg === '--name') {
      args.name = argv[++i] ?? args.name;
    } else if (arg === '--lang') {
      args.lang = (argv[++i] ?? args.lang).toLowerCase();
    } else if (arg === '--level') {
      args.level = (argv[++i] ?? args.level) as Level;
    } else if (arg === '--program') {
      args.program = (argv[++i] ?? args.program).toUpperCase() as Program;
    } else if (arg === '--once') {
      args.once = argv[++i] ?? '';
    } else if (arg === '--weights') {
      args.weights = parseWeights(argv[++i]);
    } else if (arg === '--demo') {
      args.demo = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const profile: Profile = {
    name: args.name,
    primaryLang: args.lang,
    uiLang: 'en',
    languages:
      args.lang === 'en'
        ? [{ lang: 'en', level: args.level }]
        : [
            { lang: 'en', level: 'C1' },
            { lang: args.lang, level: args.level },
          ],
    program: args.program,
    grades:
      args.program === 'IB'
        ? { ib: { predictedTotal: 38 } }
        : args.program === 'AP'
          ? { ap: { gpa: 3.8 } }
          : { us: { gpaUnweighted: 3.8, sat: 1450 } },
  };

  const store = new InMemoryCounselorStore();
  const settings = new StaticSettings(process.env.UNIFINDER_MODEL?.trim() || null, args.provider);
  const deps = {
    http: new FetchHttpClient(),
    secrets: new EnvSecretStore(),
    settings,
    profile: new StaticProfile(profile),
    counselorStore: store,
    logger: consoleLogger,
  };

  const counselor = new Counselor(deps, store);
  const { sessionId } = await counselor.start();
  console.log(
    `Session ${sessionId}. Type /careers after ~8 messages, or "exit" to quit.`,
  );

  if (args.demo) {
    const samples = [
      'I like building things and solving problems with code.',
      'My friends ask me to fix their computers and explain exercises.',
      'I enjoy maths and computer science because I can experiment right away.',
      'At 30 I want to work in a product team with a stable income.',
      'I value creativity, learning and financial stability.',
      'My family budget is limited, so I want to study near home or get a scholarship.',
      'I like international environments but do not want to move too far.',
      'I am willing to learn another language if needed.',
    ];
    for (const content of samples) {
      await store.addMessage(sessionId, { role: 'user', content });
    }
    const careers = await counselor.careers(sessionId, args.weights);
    console.log(JSON.stringify(careers, null, 2));
    return;
  }

  if (args.once !== null) {
    if (args.once.trim().toLowerCase() === '/careers') {
      const careers = await counselor.careers(sessionId, args.weights);
      console.log(JSON.stringify(careers, null, 2));
      return;
    }
    process.stdout.write('Counselor: ');
    const reply = await counselor.send(sessionId, args.once, (token) =>
      process.stdout.write(token),
    );
    if (!reply.trim()) process.stdout.write(reply);
    process.stdout.write('\n');
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (;;) {
      const text = await rl.question('You: ');
      if (/^(exit|quit)$/i.test(text.trim())) break;
      if (!text.trim()) continue;
      if (/^\/careers$/i.test(text.trim())) {
        try {
          const careers = await counselor.careers(sessionId, args.weights);
          console.log(JSON.stringify(careers, null, 2));
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
        }
        continue;
      }
      process.stdout.write('Counselor: ');
      await counselor.send(sessionId, text, (token) => process.stdout.write(token));
      process.stdout.write('\n');
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n${message}`);
  if (message.includes('key')) {
    console.error('Put OPENCODE_API_KEY or OPENROUTER_API_KEY in .env (see .env.example).');
  }
  process.exit(1);
});
