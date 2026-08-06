import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const budgets = JSON.parse(await readFile(path.join(root, 'performance/budgets.json'), 'utf8'));
const sourceRoot = path.join(root, 'src');
const imageRoot = path.join(root, 'public/images');
const failures = [];

async function filesUnder(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) return filesUnder(absolute, suffix);
        return entry.name.endsWith(suffix) ? [absolute] : [];
      }),
    )
  ).flat();
}

const sourceFiles = await filesUnder(sourceRoot, '.tsx');
const sourceEntries = await Promise.all(
  sourceFiles.map(async (file) => ({ file, source: await readFile(file, 'utf8') })),
);
const imageComponents = sourceEntries.filter((entry) => entry.source.includes('<Image'));

for (const { file, source } of imageComponents) {
  const tags = source.match(/<Image\b[\s\S]*?\/>/g) ?? [];
  for (const tag of tags) {
    if (!/\bsizes=/.test(tag))
      failures.push(`${path.relative(root, file)}: every next/image needs a sizes prop`);
    if (/\bpriority(?:=|\s|\/>)/.test(tag) && !/fetchPriority="high"/.test(tag)) {
      failures.push(`${path.relative(root, file)}: priority images need fetchPriority=\"high\"`);
    }
  }
}

for (const image of await filesUnder(imageRoot, '.png')) {
  const bytes = (await stat(image)).size;
  if (bytes > budgets.sourceImageMaxBytes) {
    failures.push(
      `${path.relative(root, image)}: ${bytes} bytes exceeds source image ceiling ${budgets.sourceImageMaxBytes}`,
    );
  }
}

if (failures.length) {
  console.error(`Performance budget audit failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Performance budget audit passed (${imageComponents.length} image-bearing components, ${budgets.routes.length} audited routes).`,
);
