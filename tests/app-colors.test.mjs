// The phone's colour roles (@todahq/tokens/app) name the same scale steps as the web's semantic tokens, so the app and
// the web can't drift apart: change a step in one and this fails until the other follows. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appColors, appRoleSteps, stepColor } from '../../tokens/src/app.ts';

// The semantic tokens' source, read as text: each token there is c('light.step', 'dark.step').
const source = readFileSync(new URL('../src/theme/semantic-tokens.ts', import.meta.url), 'utf8');

/** The steps `group.key: c(...)` names inside a top-level group (`bg`, `fg`, `border`). */
function semantic(group, key) {
  const body = source.slice(source.indexOf(`\n  ${group}: {`));
  const end = body.indexOf('\n  },');
  const match = body.slice(0, end).match(new RegExp(`\\n\\s+${key}: c\\('([\\w.]+)', '([\\w.]+)'\\)`));
  assert.ok(match, `semantic-tokens.ts has no ${group}.${key}`);
  return [match[1], match[2]];
}

/** The steps a palette's part names: palette('blue', { solid: [500, 400] }) and the shared shape in palette(). */
function paletteSteps(name, part) {
  if (name === 'todo') {
    const todo = source.slice(source.indexOf('const todoPalette = {'));
    const neutral = source.slice(source.indexOf('const neutralPalette = {'));
    const own = todo.slice(0, todo.indexOf('};')).match(new RegExp(`${part}: c\\('([\\w.]+)', '([\\w.]+)'\\)`));
    const shared = neutral.slice(0, neutral.indexOf('};')).match(new RegExp(`${part}: c\\('([\\w.]+)', '([\\w.]+)'\\)`));
    const found = own ?? shared;
    return [found[1], found[2]];
  }

  const ramp = source.match(new RegExp(`const ${name}Palette = palette\\('(\\w+)', \\{ solid: \\[(\\d+), (\\d+)\\]`));
  assert.ok(ramp, `semantic-tokens.ts has no ${name}Palette`);
  if (part === 'solid') return [`${ramp[1]}.${ramp[2]}`, `${ramp[1]}.${ramp[3]}`];
  const shape = source.match(new RegExp(`\\n\\s+${part}: c\\(\`\\$\\{ramp\\}\\.(\\d+)\`, \`\\$\\{ramp\\}\\.(\\d+)\`\\)`));
  return [`${ramp[1]}.${shape[1]}`, `${ramp[1]}.${shape[2]}`];
}

// Each app role and the semantic token it stands for (statusCategory's bg is its palette's subtle, its fg its fg).
const counterparts = {
  canvas: () => semantic('bg', 'canvas'),
  panel: () => semantic('bg', 'panel'),
  subtle: () => semantic('bg', 'subtle'),
  muted: () => semantic('bg', 'muted'),
  border: () => semantic('border', 'DEFAULT'),
  fg: () => semantic('fg', 'DEFAULT'),
  fgMuted: () => semantic('fg', 'muted'),
  fgSubtle: () => semantic('fg', 'subtle'),
  accent: () => paletteSteps('accent', 'solid'),
  accentContrast: () => ['neutral.0', 'neutral.0'], // the palette's contrast is 'white' both ways
  accentFg: () => semantic('fg', 'accent'),
  accentSubtle: () => semantic('bg', 'accent'),
  success: () => semantic('fg', 'success'),
  warning: () => semantic('fg', 'warning'),
  danger: () => semantic('fg', 'danger'),
  info: () => semantic('fg', 'info'),
  successSubtle: () => semantic('bg', 'success'),
  warningSubtle: () => semantic('bg', 'warning'),
  dangerSubtle: () => semantic('bg', 'danger'),
  infoSubtle: () => semantic('bg', 'info'),
  todo: () => paletteSteps('todo', 'fg'),
  inProgress: () => paletteSteps('inProgress', 'fg'),
  done: () => paletteSteps('done', 'fg'),
  todoSubtle: () => paletteSteps('todo', 'subtle'),
  inProgressSubtle: () => paletteSteps('inProgress', 'subtle'),
  doneSubtle: () => paletteSteps('done', 'subtle'),
};

test('every app role names the steps its semantic token names', () => {
  assert.deepEqual(Object.keys(counterparts).sort(), Object.keys(appRoleSteps).sort());
  for (const [role, steps] of Object.entries(appRoleSteps)) {
    assert.deepEqual([...steps], counterparts[role](), role);
  }
});

test('the app colours are the scales\' hex values, white for the accent contrast', () => {
  assert.equal(appColors.light.canvas, stepColor('neutral.25'));
  assert.equal(appColors.dark.panel, stepColor('neutral.900'));
  assert.equal(appColors.light.accentContrast.toUpperCase(), '#FFFFFF');
  for (const mode of ['light', 'dark']) {
    assert.equal(Object.keys(appColors[mode]).length, 26);
    for (const [role, hex] of Object.entries(appColors[mode])) assert.match(hex, /^#[0-9A-Fa-f]{6}$/, `${mode}.${role}`);
  }
});
