import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const inventory = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'data-inventory.json'), 'utf8'),
);
const schemaDirectory = resolve(root, 'apps/api/src/database/schemas');
const schemaFiles = (await readdir(schemaDirectory)).filter((name) => name.endsWith('.schema.ts'));
const schemaTables = new Set();
for (const file of schemaFiles) {
  const source = await readFile(resolve(schemaDirectory, file), 'utf8');
  for (const match of source.matchAll(/pgTable\(\s*['"]([^'"]+)['"]/g)) schemaTables.add(match[1]);
}

const required = [
  'name',
  'tables',
  'subjects',
  'dataClasses',
  'purpose',
  'access',
  'retention',
  'deletion',
];
const inventoried = new Map();
for (const collection of inventory.collections ?? []) {
  for (const field of required) {
    if (
      !collection[field] ||
      (Array.isArray(collection[field]) && collection[field].length === 0)
    ) {
      throw new Error(`Privacy collection ${collection.name ?? '<unnamed>'} lacks ${field}.`);
    }
  }
  for (const table of collection.tables) {
    if (inventoried.has(table)) throw new Error(`Table ${table} is inventoried more than once.`);
    inventoried.set(table, collection.name);
  }
}
const missing = [...schemaTables].filter((table) => !inventoried.has(table));
const stale = [...inventoried.keys()].filter((table) => !schemaTables.has(table));
if (missing.length || stale.length) {
  throw new Error(
    `Privacy inventory drift. Missing: ${missing.join(', ') || 'none'}; stale: ${stale.join(', ') || 'none'}.`,
  );
}
for (const control of ['leastPrivilege', 'export', 'backup', 'evidence', 'deletion']) {
  if (!inventory.controls?.[control])
    throw new Error(`Privacy inventory lacks ${control} control evidence.`);
}
process.stdout.write(`Privacy inventory covers ${schemaTables.size} database tables.\n`);
