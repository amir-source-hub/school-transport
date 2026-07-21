import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(process.cwd(), 'src');
const modulesRoot = resolve(sourceRoot, 'modules');
const importPattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return typescriptFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

function relativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(importPattern)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolve(dirname(file), specifier));
}

function display(path: string): string {
  return relative(sourceRoot, path).split(sep).join('/');
}

describe('backend architecture boundaries', () => {
  it('prevents product modules from importing another module internals', () => {
    const violations: string[] = [];

    for (const file of typescriptFiles(modulesRoot)) {
      const sourceModule = relative(modulesRoot, file).split(sep)[0];
      for (const importedPath of relativeImports(file)) {
        if (!importedPath.startsWith(modulesRoot + sep)) continue;
        const targetModule = relative(modulesRoot, importedPath).split(sep)[0];
        const importsCrossCuttingAccessControl = targetModule === 'access-control';
        if (sourceModule !== targetModule && !importsCrossCuttingAccessControl) {
          violations.push(`${display(file)} imports ${display(importedPath)}`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('keeps common, config, and database foundations independent of product modules', () => {
    const violations: string[] = [];

    for (const foundation of ['common', 'config', 'database']) {
      for (const file of typescriptFiles(resolve(sourceRoot, foundation))) {
        for (const importedPath of relativeImports(file)) {
          if (importedPath.startsWith(modulesRoot + sep)) {
            violations.push(`${display(file)} imports ${display(importedPath)}`);
          }
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('enforces inward dependencies inside layered modules', () => {
    const forbiddenTargets: Record<string, ReadonlySet<string>> = {
      domain: new Set(['application', 'infrastructure', 'presentation']),
      application: new Set(['infrastructure', 'presentation']),
      infrastructure: new Set(['presentation']),
      presentation: new Set(),
    };
    const violations: string[] = [];

    for (const file of typescriptFiles(modulesRoot)) {
      const parts = relative(modulesRoot, file).split(sep);
      const sourceLayer = parts[1];
      if (!(sourceLayer in forbiddenTargets)) continue;

      for (const importedPath of relativeImports(file)) {
        if (!importedPath.startsWith(modulesRoot + sep)) continue;
        const targetParts = relative(modulesRoot, importedPath).split(sep);
        if (parts[0] === targetParts[0] && forbiddenTargets[sourceLayer].has(targetParts[1])) {
          violations.push(`${display(file)} imports ${display(importedPath)}`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
