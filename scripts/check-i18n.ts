// Asserts that es and vi have exactly the same keys as en, for every namespace.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const namespaces = ['common', 'onboarding', 'counselor', 'finder'];
const langs = ['es', 'vi'];

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

const load = (lang: string, ns: string) =>
  new Set(flatKeys(JSON.parse(readFileSync(join(root, lang, `${ns}.json`), 'utf8'))));

let failed = false;
for (const ns of namespaces) {
  const en = load('en', ns);
  for (const lang of langs) {
    const other = load(lang, ns);
    const missing = [...en].filter((k) => !other.has(k));
    const extra = [...other].filter((k) => !en.has(k));
    if (missing.length || extra.length) {
      failed = true;
      console.error(`[${lang}/${ns}]`);
      for (const k of missing) console.error(`  missing: ${k}`);
      for (const k of extra) console.error(`  extra:   ${k}`);
    }
  }
}

if (failed) {
  console.error('i18n key check failed');
  process.exit(1);
}
console.log(`i18n key check passed (${namespaces.length} namespaces, ${langs.join(', ')} match en)`);
