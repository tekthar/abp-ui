// Directories' form rules, apart from the screens so node's tests can reach them (tests/directory-rules.test.mjs).

/** A stored secret as the server shows it: kept, never sent back. */
export const MASKED_SECRET = '********';

/** What a directory's form edits (AbpGuard's DirectoryInput, as far as these rules need it). */
export interface DirectoryFormInput {
  name: string;
  names?: Record<string, string> | null;
  type: string;
  isActive: boolean;
  authenticationEnabled: boolean;
  syncIntervalMinutes: number | null;
  settings: Record<string, string>;
}

/** A directory as the list has it (AbpGuard's DirectoryDto, as far as editing needs it). */
export interface DirectoryRow {
  name: string;
  names?: Record<string, string> | null;
  type: string;
  isActive: boolean;
  authenticationEnabled: boolean;
  syncIntervalMinutes: number | string | null;
  settings: Record<string, string>;
}

/**
 * A directory's form, started from the directory: a secret setting (named by its type, or shown masked) starts empty,
 * which the server reads as "keep the stored one", so saving never writes the mask back.
 */
export function editInput(dir: DirectoryRow, secretNames: ReadonlySet<string> = new Set()): DirectoryFormInput {
  const settings: Record<string, string> = {};
  for (const [k, v] of Object.entries(dir.settings)) settings[k] = secretNames.has(k) || v === MASKED_SECRET ? '' : v;
  const minutes = dir.syncIntervalMinutes === null || dir.syncIntervalMinutes === '' ? null : Number(dir.syncIntervalMinutes);
  return {
    name: dir.name,
    names: dir.names,
    type: dir.type,
    isActive: dir.isActive,
    authenticationEnabled: dir.authenticationEnabled,
    syncIntervalMinutes: minutes !== null && Number.isFinite(minutes) ? minutes : null,
    settings,
  };
}

/**
 * Whether a directory of this type syncs from somewhere (AbpGuard's `Sync` or `IncrementalSync` capability), so a sync
 * interval means something. An internal directory only signs people in.
 */
export function syncs(capabilities: readonly string[] | undefined): boolean {
  return (capabilities ?? []).some((c) => c === 'Sync' || c === 'IncrementalSync');
}

/** The ids in their new order after moving one a step up (-1) or down (1); unchanged at either end. */
export function moved(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  const out = [...ids];
  const i = out.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
