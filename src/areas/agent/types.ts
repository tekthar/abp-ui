import type { StatusTone } from '@abpjs/ui';
import type { components } from './api';

type Schemas = components['schemas'];

/** AbpAgent.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type AgentTypes = Schemas;
export type AgentSwitch = Schemas['AgentSwitch'];
export type AgentInfo = Schemas['AgentInfo'];
export type AgentChange = Schemas['AgentChange'];
export type AgentPerson = Schemas['AgentPerson'];
export type AgentRunLimits = Schemas['AgentRunLimits'];
export type ScopeAgentInfo = Schemas['ScopeAgentInfo'];
export type AgentTool = Schemas['AgentTool'];
export type AgentUsage = Schemas['AgentUsage'];
export type AgentUsagePeriod = Schemas['AgentUsagePeriod'];
export type AgentMemoryInfo = Schemas['AgentMemoryInfo'];
export type AgentGraphPage = Schemas['AgentGraphPage'];
export type AgentGraphThing = Schemas['AgentGraphThing'];
export type AgentGraphLink = Schemas['AgentGraphLink'];
export type AgentGraphNote = Schemas['AgentGraphNote'];
export type AgentPermissionInfo = Schemas['AgentPermissionInfo'];
export type AgentAllowablePlace = Schemas['AgentAllowablePlace'];
export type AgentAllowableAgent = Schemas['AgentAllowableAgent'];
export type AgentAllowableTool = Schemas['AgentAllowableTool'];
export type AskableAgent = Schemas['AskableAgent'];
export type AgentRunInfo = Schemas['AgentRunInfo'];
export type AgentRunStepInfo = Schemas['AgentRunStepInfo'];
export type AgentQuestionInfo = Schemas['AgentQuestionInfo'];
export type AgentChatPlace = Schemas['AgentChatPlace'];
export type AgentChatSummary = Schemas['AgentChatSummary'];
export type AgentChatInfo = Schemas['AgentChatInfo'];

/** A number the API may give as a string (its 64-bit counts and decimals). */
export const num = (value: number | string | null | undefined): number =>
  value == null || value === '' ? 0 : typeof value === 'number' ? value : Number(value);

/** A number the API may give as a string, or null when there's none. */
export const numOrNull = (value: number | string | null | undefined): number | null =>
  value == null || value === '' ? null : typeof value === 'number' ? value : Number(value);

/** A run's states that are still going: it may be stopped, and a screen keeps itself current while one is. */
export const GOING: ReadonlySet<string> = new Set(['queued', 'running', 'waiting']);

/** A run's state as a pill's tone. */
export const RUN_TONES: Record<string, StatusTone> = {
  queued: 'neutral',
  running: 'info',
  waiting: 'accent',
  done: 'success',
  failed: 'danger',
  stopped: 'warning',
};

/** An item in a path: its kind and key, each escaped. */
export const itemPath = (kind: string, key: string) => `/items/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`;

/** Where a chat or a run is about: an item of a kind (a record, an asset, a ticket), or a scope. */
export type AgentTarget = { kind: string; key: string };
