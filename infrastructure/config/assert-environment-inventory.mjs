import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const roots = [
  'apps',
  'infrastructure/object-storage/upload-public-assets.mjs',
  'Dockerfile',
  'docker-compose.local.yml',
  'docker-compose.production.yml',
];
const sourceFiles = [];
const visit = (path) => {
  const absolute = resolve(path);
  if (statSync(absolute).isDirectory()) {
    for (const entry of readdirSync(absolute)) {
      if (['node_modules', '.next', 'dist', 'test-results', 'playwright-report'].includes(entry))
        continue;
      visit(`${path}/${entry}`);
    }
    return;
  }
  sourceFiles.push(path);
};
roots.forEach(visit);

const consumed = new Set();
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) consumed.add(match[1]);
  if (file.startsWith('docker-compose')) {
    for (const match of content.matchAll(/\$\{([A-Z][A-Z0-9_]*)(?=[:}])/g)) consumed.add(match[1]);
  }
  if (file.endsWith('config.service.ts')) {
    for (const match of content.matchAll(/^\s+([A-Z][A-Z0-9_]+):/gm)) consumed.add(match[1]);
  }
}

// Used by integration tooling through an explicit lookup rather than production startup code.
consumed.add('TEST_DATABASE_URL');

const inventory = readFileSync('docs/ENVIRONMENT.md', 'utf8');
const documented = new Set(
  [...inventory.matchAll(/`([A-Z][A-Z0-9_]*)`/g)].map((match) => match[1]),
);
const examples = ['.env.example'];
const exampleVariables = new Set(
  examples.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]),
  ),
);

const undocumented = [...consumed].filter((name) => !documented.has(name)).sort();
const exampleOnly = [...exampleVariables].filter((name) => !consumed.has(name)).sort();
if (undocumented.length || exampleOnly.length) {
  if (undocumented.length) {
    const message = `Consumed but undocumented: ${undocumented.join(', ')}`;
    console.error(message);
    if (process.env['GITHUB_ACTIONS'] === 'true')
      console.error(`::error title=Environment inventory::${message}`);
  }
  if (exampleOnly.length) {
    const message = `Example entries with no consumer: ${exampleOnly.join(', ')}`;
    console.error(message);
    if (process.env['GITHUB_ACTIONS'] === 'true')
      console.error(`::error title=Environment examples::${message}`);
  }
  process.exit(1);
}

console.log(
  `environment inventory covers ${consumed.size} consumed variables and has no stale examples`,
);
