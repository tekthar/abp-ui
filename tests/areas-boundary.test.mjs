// The screens' areas keep to their boundary (ADR 0109 amendment), so moving one into its own package later is only a
// change of import path: an area imports the design system's public entries, its own files and npm packages; never
// another area, the design system's internals, a host's framework (next/*) or `fetch` directly. Each area also has
// its texts in English and Arabic, a README naming its server package's version, and an export in package.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const AREAS = join(ROOT, 'src', 'areas');
const areas = existsSync(AREAS) ? readdirSync(AREAS).filter((n) => statSync(join(AREAS, n)).isDirectory()) : [];
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const area of areas) {
  const home = join(AREAS, area);

  test(`${area}: imports only the design system's entries, its own files and npm packages`, () => {
    const wrong = [];
    for (const file of files(home)) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(IMPORT)) {
        const spec = m[1] ?? m[2];
        const where = `${relative(ROOT, file)}: ${spec}`;
        if (spec.startsWith('.')) {
          const target = resolve(dirname(file), spec);
          if (!(target + sep).startsWith(home + sep) && target !== home) wrong.push(`${where} (outside the area)`);
        } else if (spec.startsWith('@abpjs/ui')) {
          if (spec !== '@abpjs/ui' && spec !== '@abpjs/ui/rules') wrong.push(`${where} (another area or an internal path)`);
        } else if (spec === 'next' || spec.startsWith('next/') || spec.startsWith('@/')) {
          wrong.push(`${where} (a host's code)`);
        }
      }
      if (/(?<![\w.])fetch\s*\(/.test(source)) wrong.push(`${relative(ROOT, file)}: fetch( (calls go through the host's request)`);
    }
    assert.deepEqual(wrong, []);
  });

  test(`${area}: texts in English and Arabic, a README naming its server package, and an export`, () => {
    for (const lang of ['en', 'ar']) assert.ok(existsSync(join(home, 'texts', `${lang}.json`)), `src/areas/${area}/texts/${lang}.json`);
    const readme = join(home, 'README.md');
    assert.ok(existsSync(readme), `src/areas/${area}/README.md`);
    assert.match(readFileSync(readme, 'utf8'), /\b\d+\.\d+\.\d+\b/, 'the README names the server package version its types come from');
    assert.ok(pkg.exports[`./${area}`], `package.json exports "./${area}"`);
  });
}

test('the areas are known: one folder each, nothing else under src/areas', () => {
  for (const n of existsSync(AREAS) ? readdirSync(AREAS) : []) {
    assert.ok(n === 'README.md' || areas.includes(n), `src/areas/${n}`);
  }
});
