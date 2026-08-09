import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const matrix = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'abuse-test-matrix.json'), 'utf8'),
);
const requiredCategories = [
  'sessions-otp',
  'csrf-origins',
  'idor',
  'roles',
  'xss',
  'injection',
  'ssrf',
  'uploads',
  'rate-cost-limits',
  'secrets-logs',
  'error-disclosure',
];
const categories = new Set(matrix.categories?.map(({ category }) => category));
for (const category of requiredCategories)
  if (!categories.has(category)) throw new Error(`Abuse matrix lacks ${category}.`);
for (const item of matrix.categories) {
  const sources = [];
  for (const file of item.evidence ?? []) sources.push(await readFile(resolve(root, file), 'utf8'));
  const combined = sources.join('\n');
  for (const required of item.requiredText ?? []) {
    if (!combined.toLowerCase().includes(required.toLowerCase()))
      throw new Error(`${item.category} evidence lacks: ${required}`);
  }
}
process.stdout.write(`Abuse matrix verifies ${requiredCategories.length} security categories.\n`);
