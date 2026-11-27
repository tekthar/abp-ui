import type { components } from './api';

type Schemas = components['schemas'];

/** AbpLanguages.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type LanguageInfo = Schemas['LanguageDto'];
export type LanguagesList = Schemas['LanguagesDto'];
export type LanguageInput = Schemas['LanguageInput'];
export type TextEntry = Schemas['TextEntryDto'];
export type TextEntries = Schemas['TextEntriesDto'];
export type SaveTextsResult = Schemas['SaveTextsResult'];
export type ImportTextsResult = Schemas['ImportTextsResult'];
