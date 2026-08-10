import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const matrix = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'test-coverage-matrix.json'), 'utf8'),
);
const required = [
  'unit',
  'component',
  'integration-real-services',
  'browser-e2e',
  'accessibility',
  'mobile-tablet',
  'visual',
  'performance',
  'dependency-failure',
  'regression-ci',
];
const layers = new Map(matrix.layers?.map((item) => [item.layer, item]));
for (const layer of required) {
  const item = layers.get(layer);
  if (!item?.evidence?.length) throw new Error(`Quality matrix lacks ${layer} evidence.`);
  for (const file of item.evidence) await access(resolve(root, file));
}
process.stdout.write(`Quality matrix verifies ${required.length} test layers.\n`);
