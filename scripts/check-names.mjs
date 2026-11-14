// The package names no product (ADR 0109): not the application it came from, in the source, the tests, the docs or the built
// output. Run after the build: `npm run check:names`. Exits 1 with every place it finds one.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NAMES = [/\btoda\b/i, /todahq/i, /تودا/];
const ROOTS = ['src', 'tests', 'dist', 'README.md', 'CHANGELOG.md', 'package.json'];
const TEXT = /\.(ts|tsx|mts|js|mjs|cjs|json|md|css|map)$/;

const found = [];
function walk(path) {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry));
    return;
  }
  if (!TEXT.test(path)) return;
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    for (const name of NAMES) {
      const m = line.match(name);
      if (m) found.push(`${path}:${i + 1}: "${m[0]}"`);
    }
  });
}
for (const root of ROOTS) walk(root);

if (found.length) {
  console.error(`A product's name in the package (${found.length}):\n${found.slice(0, 50).join('\n')}`);
  process.exit(1);
}
console.log('No product names.');
