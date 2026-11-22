// Builds the globe's country geometry and the country -> continent map.
// Usage: bun run scripts/build-globe-data.ts <path-to-ne_110m_admin_0_countries.geojson>
// The Natural Earth input (public domain) is read from the path you pass; it is never written into the repo.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { countries } from 'countries-list';

const input = process.argv[2];
if (!input) {
  console.error('Usage: bun run scripts/build-globe-data.ts <ne_110m_admin_0_countries.geojson>');
  process.exit(1);
}

const root = join(import.meta.dirname, '..', 'data');
const ISO2 = /^[A-Z]{2}$/;

type Position = number[];
type Geometry = { type: string; coordinates: unknown; geometries?: Geometry[] };
interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: Geometry | null;
}

const round = (value: unknown): unknown => {
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  if (Array.isArray(value)) return value.map(round);
  return value;
};

const source = JSON.parse(readFileSync(input, 'utf8')) as { features: Feature[] };
const features = source.features.flatMap((feature) => {
  const iso = String(feature.properties.ISO_A2_EH ?? feature.properties.ISO_A2 ?? '');
  if (!ISO2.test(iso) || !feature.geometry) return [];
  const geometry: Geometry = {
    type: feature.geometry.type,
    coordinates: round(feature.geometry.coordinates),
  };
  return [
    {
      type: 'Feature' as const,
      properties: { iso, name: String(feature.properties.NAME ?? iso) },
      geometry,
    },
  ];
});

writeFileSync(
  join(root, 'countries.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features }),
);

const CONTINENTS: Record<string, string> = {
  AF: 'Africa',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  SA: 'South America',
  OC: 'Oceania',
};

const continentMap: Record<string, string> = {};
for (const [code, data] of Object.entries(countries)) {
  if (!ISO2.test(code)) continue;
  const continent = CONTINENTS[data.continent];
  if (!continent) continue; // Antarctica (AN) is omitted on purpose
  continentMap[code] = continent;
}
const sorted = Object.fromEntries(Object.entries(continentMap).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, 'country-continent.json'), JSON.stringify(sorted, null, 2) + '\n');

console.log(
  `countries.geojson: ${features.length} features; country-continent.json: ${Object.keys(sorted).length} codes`,
);
