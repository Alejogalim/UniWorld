/**
 * Counselor eval (plan 28): runs scripted student personas through the real counselor and grades every reply.
 *
 *   bun run eval:counselor
 *   bun run eval:counselor --persona vague --no-judge
 *   bun run eval:counselor --provider opencode --out eval-reports
 *
 * Needs OPENROUTER_API_KEY or OPENCODE_API_KEY (shell or .env, like `bun run counselor`).
 * Without a key it prints a note and exits 0. Writes a markdown report to eval-reports/ (gitignored).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Provider } from '../src/core/contracts';
import { DEFAULT_MODEL, OPENCODE_MODEL } from '../src/core/config';
import { EnvSecretStore, StaticProfile, StaticSettings } from '../src/core/adapters/env';
import { FetchHttpClient } from '../src/core/adapters/fetchHttp';
import { InMemoryCounselorStore } from '../src/core/adapters/memory';
import { counselorProvider, createAiClient } from '../src/core/ai/index';
import type { AiClient } from '../src/core/ai/types';
import { Counselor } from '../src/core/counselor/index';
import { runChecks } from './eval/checks';
import { afterReply, initialDriverState, intakeQuestion, nextTurn } from './eval/driver';
import { judgeReply, type JudgeScore } from './eval/judge';
import { PERSONAS, type Persona } from './eval/personas';
import { renderReport, type PersonaResult, type ReplyResult } from './eval/report';

interface Args {
  persona: string | null;
  provider: Provider | null;
  judge: boolean;
  out: string;
}

const USAGE = 'Usage: bun run eval:counselor [--persona <id>] [--provider openrouter|opencode] [--no-judge] [--out <dir>]';

function parseArgs(argv: string[]): Args {
  const args: Args = { persona: null, provider: null, judge: true, out: 'eval-reports' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--persona') args.persona = argv[++i] ?? null;
    else if (arg === '--provider') {
      const value = argv[++i];
      if (value !== 'openrouter' && value !== 'opencode') throw new Error('--provider must be "openrouter" or "opencode"');
      args.provider = value;
    } else if (arg === '--no-judge') args.judge = false;
    else if (arg === '--out') args.out = argv[++i] ?? args.out;
    else if (arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}\n${USAGE}`);
  }
  return args;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runPersona(persona: Persona, provider: Provider, judge: AiClient | null): Promise<PersonaResult> {
  const store = new InMemoryCounselorStore();
  const deps = {
    http: new FetchHttpClient(),
    secrets: new EnvSecretStore(),
    settings: new StaticSettings(process.env.UNIFINDER_MODEL?.trim() || null, provider),
    profile: new StaticProfile(persona.profile),
    counselorStore: store,
  };
  const counselor = new Counselor(deps, store);
  const question = (n: number) => intakeQuestion(persona.profile.uiLang, n, persona.profile.name);
  const replies: ReplyResult[] = [];
  const visibleReplies: string[] = [];
  const transcript: string[] = [`Counselor: ${question(1)}`];
  let state = initialDriverState;
  try {
    const { sessionId } = await counselor.start();
    for (const [index, answer] of persona.answers.entries()) {
      const turn = nextTurn(state, answer, question);
      const raw = await counselor.send(sessionId, turn.encoded);
      const outcome = afterReply(state, turn, raw, question);
      state = outcome.state;
      transcript.push(`Student: ${answer}`);
      const checks = runChecks({
        reply: outcome.visible,
        lang: persona.lang,
        name: persona.profile.name,
        previousReplies: visibleReplies,
        expectQuestion: turn.expectQuestion,
        raw,
        expectTag: turn.expectTag,
      });
      let score: JudgeScore | null = null;
      let judgeError: string | undefined;
      if (judge) {
        try {
          score = await judgeReply(judge, { langName: persona.langName, transcript: transcript.join('\n'), reply: outcome.visible });
        } catch (error) {
          judgeError = message(error);
        }
      }
      replies.push({ turn: index + 1, student: answer, reply: outcome.visible, checks, judge: score, judgeError, tag: outcome.tag });
      visibleReplies.push(outcome.visible);
      transcript.push(`Counselor: ${outcome.visible}`);
      if (outcome.appQuestion) transcript.push(`Counselor: ${outcome.appQuestion}`);
      process.stdout.write('.');
    }
    return { persona, replies };
  } catch (error) {
    return { persona, replies, error: message(error) };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.OPENROUTER_API_KEY?.trim() && !process.env.OPENCODE_API_KEY?.trim()) {
    console.log('eval:counselor skipped: set OPENROUTER_API_KEY or OPENCODE_API_KEY (shell or .env) to run it.');
    return;
  }
  const personas = args.persona ? PERSONAS.filter((p) => p.id === args.persona) : PERSONAS;
  if (personas.length === 0) {
    throw new Error(`Unknown persona "${args.persona}". Known: ${PERSONAS.map((p) => p.id).join(', ')}`);
  }
  const baseDeps = {
    http: new FetchHttpClient(),
    secrets: new EnvSecretStore(),
    settings: new StaticSettings(process.env.UNIFINDER_MODEL?.trim() || null, args.provider),
    profile: new StaticProfile(personas[0]!.profile),
  };
  const provider = await counselorProvider(baseDeps);
  const judge = args.judge ? await createAiClient(provider, baseDeps, { sessionId: 'eval-judge' }) : null;
  const model = provider === 'opencode' ? OPENCODE_MODEL : process.env.UNIFINDER_MODEL?.trim() || DEFAULT_MODEL;
  const startedAt = new Date().toISOString();

  const results: PersonaResult[] = [];
  for (const persona of personas) {
    process.stdout.write(`\n${persona.id} `);
    results.push(await runPersona(persona, provider, judge));
  }

  mkdirSync(args.out, { recursive: true });
  const file = join(args.out, `counselor-${startedAt.replace(/[:.]/g, '-')}.md`);
  writeFileSync(file, renderReport({ startedAt, provider, model, judge: args.judge }, results));
  console.log(`\nReport: ${file}`);
}

main().catch((error) => {
  console.error(message(error));
  process.exit(1);
});
