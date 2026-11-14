import type { components } from './api';

type Schemas = components['schemas'];

/** AbpAi.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type AiTypes = Schemas;
export type AiSite = Schemas['AiSiteSettings'];
export type AiConnection = Schemas['AiConnectionInfo'];
export type AiConnectionInput = Schemas['AiConnectionInput'];
export type AiModelSettings = Schemas['AiModelSettings'];
export type AiAlias = Schemas['AiAliasInfo'];
export type AiAliasTarget = Schemas['AiAliasTarget'];
export type AiLimit = Schemas['AiLimitInfo'];
export type AiLimitInput = Schemas['AiLimitInput'];
export type AiScopeAccess = Schemas['AiScopeAccessInfo'];
export type AiScopeAccessInput = Schemas['AiScopeAccessInput'];
export type AiUsageReport = Schemas['AiUsageReport'];
export type AiUsageRow = Schemas['AiUsageRow'];
export type AiCall = Schemas['AiCallRow'];
export type AiExport = Schemas['AiExportInfo'];
export type AiScopeView = Schemas['AiScopeView'];
export type AiScopeModel = Schemas['AiScopeModel'];
export type AiTryInput = Schemas['AiTryInput'];
export type AiTryReply = Schemas['AiTryReply'];

/** A number the API may give as a string (its decimals and 64-bit counts). */
export const num = (value: number | string | null | undefined): number =>
  value == null || value === '' ? 0 : typeof value === 'number' ? value : Number(value);

/** `?scopeId=…` for a scope's call, nothing for the site's. */
export const scopeQuery = (scopeId: string | null | undefined, joiner: '?' | '&' = '?') =>
  scopeId ? `${joiner}scopeId=${encodeURIComponent(scopeId)}` : '';
