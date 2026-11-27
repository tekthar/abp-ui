import type { components } from './api';

type Schemas = components['schemas'];

/** AbpCluster.Storage.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type StorageInfo = Schemas['StorageDto'];
export type StorageLocation = Schemas['StorageLocationDto'];
export type StorageTest = Schemas['StorageTestDto'];
export type StorageCopy = Schemas['StorageCopyDto'];
export type StorageCopyProblem = Schemas['StorageCopyProblemDto'];
