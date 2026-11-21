/**
 * Test one provider end to end.
 *
 *   bun run provider            # OpenCode Go by default (reads .env)
 *   bun run provider opencode
 *   bun run provider openrouter
 *
 * Bun loads .env automatically, so OPENCODE_API_KEY / OPENROUTER_API_KEY can
 * live there instead of in the shell.
 */
import type { Provider } from '../src/core/contracts';
import { FetchHttpClient } from '../src/core/adapters/fetchHttp';
import { EnvSecretStore, StaticProfile, StaticSettings, consoleLogger } from '../src/core/adapters/env';
import { createAiClient, hasKey, testProviderConnection } from '../src/core/ai/index';

const providerArg = (process.argv[2] ?? 'opencode').toLowerCase();
if (providerArg !== 'opencode' && providerArg !== 'openrouter') {
  console.error(`Unknown provider "${providerArg}". Use "opencode" or "openrouter".`);
  process.exit(1);
}
const provider = providerArg as Provider;

const envName = provider === 'opencode' ? 'OPENCODE_API_KEY' : 'OPENROUTER_API_KEY';
const deps = {
  http: new FetchHttpClient(),
  secrets: new EnvSecretStore(),
  settings: new StaticSettings(),
  profile: new StaticProfile(null),
  logger: consoleLogger,
};

if (!(await hasKey(deps, provider))) {
  console.error(`Missing ${envName}. Put it in .env at the repo root (see .env.example).`);
  process.exit(1);
}

console.log(`Checking ${provider}…`);
const check = await testProviderConnection(provider, deps);
if (!check.ok) {
  console.error(`Connection failed: ${check.error ?? 'unknown error'}`);
  process.exit(1);
}
console.log('Connection OK.');

const client = await createAiClient(provider, deps);
console.log(
  provider === 'opencode'
    ? 'Sending a short chat with OpenCode Go (counselor-only provider)…'
    : 'Sending a short chat with OpenRouter…',
);
process.stdout.write('Reply: ');
const reply = await client.stream(
  [
    { role: 'system', content: 'Answer in one short sentence.' },
    { role: 'user', content: 'Say hello and confirm you can read this message.' },
  ],
  {
    maxTokens: 120,
    onToken: (token) => process.stdout.write(token),
  },
);
process.stdout.write('\n');
if (!reply.trim()) {
  console.error('The provider returned an empty reply.');
  process.exit(1);
}
