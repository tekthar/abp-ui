import type { components } from './api';

type Schemas = components['schemas'];

/** AbpDocuments.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type DocumentInfo = Schemas['DocumentInfo'];
export type DocumentsList = Schemas['DocumentsList'];
export type DocumentPages = Schemas['DocumentPages'];
export type DocumentPageText = Schemas['DocumentPageText'];
export type DocumentsSettings = Schemas['DocumentsSettings'];
export type DocumentsSearchResult = Schemas['SearchResult'];
export type FoundPassage = Schemas['FoundPassage'];

/** Where a document's reading stands: `queued`, `reading`, `indexing`, `ready`, `waiting` (a limit) or `failed`. */
export type DocumentStatus = 'queued' | 'reading' | 'indexing' | 'ready' | 'waiting' | 'failed';

/** Statuses still on their way to ready or failed: a list with any of them is read again. */
export const IN_PROGRESS: readonly string[] = ['queued', 'reading', 'indexing', 'waiting'];
