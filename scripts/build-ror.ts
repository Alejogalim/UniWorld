/**
 * Builds data/universities.json from the ROR v2.16 dump, filtered to
 * education organizations, with university domains supplemented by the
 * Hipo university-domains-list.
 *
 * Usage: bun run scripts/build-ror.ts [--force] [--offline]
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { continentFromCode, countryName } from '../src/core/grounding/countries';
import type { UniversityRecord } from '../src/core/grounding/types';
import { nameSimilarity, normalizedName, tokens } from '../src/core/normalize';

const ROR_RECORD_ID = '24378467';
const ROR_VERSION = 'v2.16';
const ROR_FILE = 'v2.16-2026-11-19-ror-data.zip';
const ROR_MD5 = '0769f596ca9e8ebf87224a1ad93a7722';
const ROR_URL = `https://zenodo.org/api/records/${ROR_RECORD_ID}/files/${ROR_FILE}/content`;
const HIPO_URL =
  'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';

const DATA_DIR = path.resolve(import.meta.dir, '..', 'data');
const ZIP_PATH = path.join(DATA_DIR, `ror-${ROR_VERSION}.zip`);
const OUTPUT_PATH = path.join(DATA_DIR, 'universities.json');
const META_PATH = path.join(DATA_DIR, 'universities.meta.json');

interface RorName {
  value?: string;
  types?: string[];
  lang?: string | null;
}

interface RorLocation {
  geonames_details?: {
    name?: string;
    lat?: number | null;
    lng?: number | null;
    country_code?: string | null;
    country_name?: string | null;
    continent_code?: string | null;
    continent_name?: string | null;
  };
}

interface RorLink {
  value?: string;
  type?: string;
}

interface RorRecord {
  id?: string;
  names?: RorName[];
  locations?: RorLocation[];
  types?: string[];
  status?: string;
  links?: RorLink[];
  domains?: string[];
}

interface HipoRecord {
  name?: string;
  country?: string;
  alpha_two_code?: string;
  domains?: string[];
  web_pages?: string[];
}

const flags = new Set(process.argv.slice(2));
const force = flags.has('--force');
const offline = flags.has('--offline');

function log(message: string): void {
  console.log(message);
}

function md5(buffer: Uint8Array): string {
  return createHash('md5').update(buffer).digest('hex');
}

async function download(url: string, label: string): Promise<Uint8Array> {
  log(`Downloading ${label}…`);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'unifinder/1.0 (ROR builder; https://ror.org)' },
  });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  log(`Downloaded ${label}: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`);
  return buffer;
}

async function ensureRorZip(): Promise<Uint8Array> {
  if (!force && existsSync(ZIP_PATH)) {
    const existing = new Uint8Array(await readFile(ZIP_PATH));
    if (md5(existing) === ROR_MD5) {
      log(`Using cached ${path.basename(ZIP_PATH)} (md5 verified)`);
      return existing;
    }
    log('Cached ROR zip has the wrong checksum, downloading again.');
  }
  if (offline) throw new Error('ROR zip is missing and --offline was passed.');
  const buffer = await download(ROR_URL, `${ROR_VERSION} data dump`);
  const actual = md5(buffer);
  if (actual !== ROR_MD5) {
    throw new Error(`ROR checksum mismatch: expected ${ROR_MD5}, got ${actual}`);
  }
  await writeFile(ZIP_PATH, buffer);
  log('ROR checksum verified.');
  return buffer;
}

function findJsonEntry(files: Record<string, Uint8Array>): Uint8Array {
  const entry = Object.entries(files).find(
    ([name, value]) => name.toLowerCase().endsWith('.json') && value.byteLength > 1000,
  );
  if (!entry) throw new Error('No JSON file inside the ROR zip');
  return entry[1];
}

function pickName(names: RorName[], types: string[]): string | null {
  for (const name of names) {
    if (name.value && name.types?.some((type) => types.includes(type))) return name.value;
  }
  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mapRecord(record: RorRecord): UniversityRecord | null {
  if (!record.id || !/^https:\/\/ror\.org\/0[a-z0-9]{8}$/i.test(record.id)) return null;
  const names = record.names ?? [];
  const display =
    pickName(names, ['ror_display']) ?? pickName(names, ['label']) ?? names[0]?.value ?? null;
  if (!display) return null;

  const aliases = unique(
    names
      .filter((name) => name.types?.includes('alias') || name.types?.includes('label'))
      .map((name) => name.value ?? '')
      .filter((value) => value && value !== display),
  );
  const acronyms = unique(
    names
      .filter((name) => name.types?.includes('acronym'))
      .map((name) => name.value ?? '')
      .filter((value) => value && value !== display),
  );

  const location =
    record.locations?.find((entry) => entry.geonames_details?.country_code) ??
    record.locations?.[0];
  const details = location?.geonames_details;
  const countryCode = details?.country_code?.toUpperCase() ?? '';
  const continent =
    (details?.continent_name as UniversityRecord['continent']) ??
    continentFromCode(details?.continent_code);

  return {
    ror_id: record.id.toLowerCase(),
    name: display,
    aliases,
    acronyms,
    country_code: countryCode,
    country_name: details?.country_name ?? (countryCode ? countryName(countryCode) : ''),
    continent,
    city: details?.name ?? null,
    lat: typeof details?.lat === 'number' ? details.lat : null,
    lng: typeof details?.lng === 'number' ? details.lng : null,
    website: record.links?.find((link) => link.type === 'website')?.value ?? null,
    domains: unique(record.domains ?? []).map((domain) => domain.toLowerCase()),
  };
}

interface HipoIndex {
  byCountry: Map<string, HipoRecord[]>;
  byDomain: Map<string, HipoRecord>;
}

function indexHipo(records: HipoRecord[]): HipoIndex {
  const byCountry = new Map<string, HipoRecord[]>();
  const byDomain = new Map<string, HipoRecord>();
  for (const record of records) {
    const code = record.alpha_two_code?.toUpperCase();
    if (code) {
      const list = byCountry.get(code) ?? [];
      list.push(record);
      byCountry.set(code, list);
    }
    for (const domain of record.domains ?? []) {
      if (domain) byDomain.set(domain.toLowerCase(), record);
    }
  }
  return { byCountry, byDomain };
}

function mergeHipoDomains(records: UniversityRecord[], hipo: HipoIndex): number {
  const used = new Set<HipoRecord>();
  let merged = 0;

  for (const record of records) {
    const candidates = new Set<HipoRecord>();

    for (const domain of record.domains) {
      const match = hipo.byDomain.get(domain);
      if (match) candidates.add(match);
    }

    const pool = hipo.byCountry.get(record.country_code) ?? [];
    const rorNames = [record.name, ...record.aliases];
    const rorNormalized = new Set(rorNames.map((name) => normalizedName(name)).filter(Boolean));
    const rorTokens = new Set(rorNames.flatMap((name) => tokens(name)));

    for (const candidate of pool) {
      if (!candidate.name) continue;
      const candidateName = candidate.name;
      const candidateNormalized = normalizedName(candidateName);
      if (!candidateNormalized) continue;
      if (rorNormalized.has(candidateNormalized)) {
        candidates.add(candidate);
        continue;
      }
      const shared = tokens(candidateName).filter((token) => rorTokens.has(token));
      if (shared.length === 0) continue;
      const similarity = Math.max(...rorNames.map((name) => nameSimilarity(name, candidateName)));
      if (similarity >= 0.9) candidates.add(candidate);
    }

    if (candidates.size === 0) continue;
    const existing = new Set(record.domains);
    for (const candidate of candidates) {
      used.add(candidate);
      for (const domain of candidate.domains ?? []) {
        const normalized = domain.toLowerCase().trim();
        if (normalized && !existing.has(normalized)) {
          existing.add(normalized);
          record.domains.push(normalized);
          merged++;
        }
      }
    }
  }

  log(`Merged ${merged} domain(s) from ${used.size} Hipo record(s).`);
  return used.size;
}

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const zip = await ensureRorZip();
  log('Unzipping…');
  const files = unzipSync(zip);
  const jsonBytes = findJsonEntry(files);
  log(`Parsing ${(jsonBytes.byteLength / 1024 / 1024).toFixed(1)} MB of ROR JSON…`);
  const raw = JSON.parse(new TextDecoder().decode(jsonBytes)) as RorRecord[];
  log(`ROR records: ${raw.length}`);

  const education = raw.filter(
    (record) => record.types?.includes('education') && (record.status ?? 'active') === 'active',
  );
  log(`Education + active records: ${education.length}`);

  const mapped: UniversityRecord[] = [];
  for (const record of education) {
    const mappedRecord = mapRecord(record);
    if (mappedRecord) mapped.push(mappedRecord);
  }
  log(`Mapped records: ${mapped.length}`);

  log('Downloading Hipo university domains…');
  const hipoBytes = await download(HIPO_URL, 'Hipo university domains');
  const hipo = indexHipo(JSON.parse(new TextDecoder().decode(hipoBytes)) as HipoRecord[]);
  const hipoMatched = mergeHipoDomains(mapped, hipo);

  mapped.sort((a, b) => a.ror_id.localeCompare(b.ror_id));
  await writeFile(OUTPUT_PATH, JSON.stringify(mapped), 'utf8');

  const withDomains = mapped.filter((record) => record.domains.length > 0).length;
  const withGeo = mapped.filter((record) => record.lat !== null && record.lng !== null).length;
  const meta = {
    ror_version: ROR_VERSION,
    ror_record_id: ROR_RECORD_ID,
    ror_md5: ROR_MD5,
    hipo_source: HIPO_URL,
    generated_at: new Date().toISOString(),
    records: mapped.length,
    records_with_domains: withDomains,
    records_with_geo: withGeo,
    hipo_records_matched: hipoMatched,
  };
  await writeFile(META_PATH, JSON.stringify(meta, null, 2), 'utf8');

  const size = (await stat(OUTPUT_PATH)).size;
  log('');
  log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  log(`  records: ${mapped.length}`);
  log(`  with domains: ${withDomains}`);
  log(`  with lat/lng: ${withGeo}`);
  log(`  size: ${(size / 1024 / 1024).toFixed(1)} MB`);
  log(`Wrote ${path.relative(process.cwd(), META_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
