// Every component draws its own skeleton (ADR 0061): each component file reads its loading (useLoading, or a Loading
// scope for what it holds), or is named here with why it has none. A new component fails until it does one or the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const components = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'components');

/** Components with no skeleton of their own, and why. */
const WITHOUT = {
  'AppShell.tsx': 'the frame: its skeleton comes once the UI track\'s open branch is on main (ADR 0061)',
  'KanbanBoard.tsx': 'its skeleton comes once the UI track\'s open branch is on main (ADR 0061)',
  'ConfirmDialog.tsx': 'a dialog opens on an action, after the data it acts on',
  'DirectionalIcon.tsx': 'an icon: drawn as it is wherever it sits',
  'EmptyState.tsx': 'shown when the data says there is nothing, so after it loads',
  'FileDrop.tsx': 'a frame around its children (an Upload button), which draw their own; its hint shows on a drag',
  'InlineAlert.tsx': 'shown for a result or an error, so after it',
  'LoadingState.tsx': 'a placeholder itself',
  'Toaster.tsx': 'toasts come after something happened',
  'Tooltip.tsx': 'shown on hover, around what it describes',
  'UploadList.tsx': 'its rows are files the person drops, after the page has loaded; empty, it takes no room',
};

test('every component draws its own skeleton or says why not', () => {
  const missing = [];
  for (const file of readdirSync(components).filter((f) => f.endsWith('.tsx'))) {
    const source = readFileSync(join(components, file), 'utf8');
    const reads = /\buseLoading\(|<Loading\b/.test(source);
    if (!reads && !(file in WITHOUT)) missing.push(file);
    if (reads && file in WITHOUT) missing.push(`${file} (named as having no skeleton, but it has one)`);
  }
  assert.deepEqual(missing, [], 'components without a skeleton (ADR 0061): give them one, or name them in WITHOUT with why');
});
