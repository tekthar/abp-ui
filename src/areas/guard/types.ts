import type { components } from './api';

type Schemas = components['schemas'];

/** AbpGuard.HttpApi's types, as its OpenAPI document gives them (`api.d.ts`). */
export type GuardTypes = Schemas;
export type AccountDto = Schemas['AccountDto'];
export type AccountCanDto = Schemas['AccountCanDto'];
export type AccountDetailDto = Schemas['AccountDetailDto'];
export type AccountSummaryDto = Schemas['AccountSummaryDto'];
export type AccountEmailsDto = Schemas['AccountEmailsDto'];
export type AccountNameDto = Schemas['AccountNameDto'];
export type AccountMergeDto = Schemas['AccountMergeDto'];
export type MergeCountDto = Schemas['MergeCountDto'];
export type MergePreviewDto = Schemas['MergePreviewDto'];
export type DuplicateDto = Schemas['DuplicateDto'];
export type IdentityDto = Schemas['IdentityDto'];
export type DirectoryDto = Schemas['DirectoryDto'];
export type DirectoryInput = Schemas['DirectoryInput'];
export type DirectoryTypeDto = Schemas['DirectoryTypeDto'];
export type DirectorySettingDefinition = Schemas['DirectorySettingDefinition'];
export type SyncRunDto = Schemas['SyncRunDto'];
export type ConnectionTestResult = Schemas['ConnectionTestResult'];
export type GroupDto = Schemas['GroupDto'];
export type GroupDetailDto = Schemas['GroupDetailDto'];
export type GroupMemberDto = Schemas['GroupMemberDto'];
export type EffectiveGroupDto = Schemas['EffectiveGroupDto'];
export type EffectiveMemberDto = Schemas['EffectiveMemberDto'];
export type SecondFactorDto = Schemas['SecondFactorDto'];
export type MySecondFactorsDto = Schemas['MySecondFactorsDto'];
export type AppEnrolmentDto = Schemas['AppEnrolmentDto'];
export type SecondFactorSenderDto = Schemas['SecondFactorSenderDto'];
export type SignUpSettingsDto = Schemas['SignUpSettingsDto'];
export type SignUpSettingsInput = Schemas['SignUpSettingsInput'];
export type AnonymousGrantDto = Schemas['AnonymousGrantDto'];
export type AccountPage = Schemas['PagedResultDtoOfAccountDto'];
export type GroupPage = Schemas['PagedResultDtoOfGroupDto'];

/** A directory's sign-in test, step by step (POST directories/{id}/test-login: its document names no answer). */
export type TestLoginStepName = 'Connection' | 'FindUser' | 'Authenticate' | 'Precedence';

export interface TestLoginResult {
  steps: { step: TestLoginStepName | string; succeeded: boolean; message: string }[];
}

/** An account's status as the API sends it; a status this version doesn't know is shown as sent. */
export type AccountStatus = 'Active' | 'Inactive' | 'Locked';

/** A connector plugin's state, as the directories' list names it. */
export type PluginState = 'Installed' | 'Enabled' | 'Disabled' | 'Failed';

/** A number the API may give as a string (its 64-bit counts). */
export const num = (value: number | string | null | undefined): number =>
  value == null || value === '' ? 0 : typeof value === 'number' ? value : Number(value);
