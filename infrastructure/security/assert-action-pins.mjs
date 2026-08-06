import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflowDirectory = resolve('.github/workflows');
const failures = [];

for (const file of readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/.test(name))) {
  const lines = readFileSync(resolve(workflowDirectory, file), 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)@([^\s#]+)/);
    if (!match || match[1].startsWith('./') || /^[a-f0-9]{40}$/.test(match[2])) return;
    failures.push(`${file}:${index + 1}: ${match[1]}@${match[2]}`);
  });
}

if (failures.length) {
  console.error(`Mutable GitHub Action references are forbidden:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('all external GitHub Actions are pinned to full commit SHAs');
