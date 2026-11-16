import { Stack, Text } from '@chakra-ui/react';
import { StatusPill, useFormatters, type StatusTone } from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { AccountStatus, DirectoryDto, PluginState } from './types';

const accountTone: Record<AccountStatus, StatusTone> = { Active: 'success', Inactive: 'neutral', Locked: 'danger' };

/** The API sends the status as a string; one this version doesn't know is shown as sent. */
export function AccountStatusPill({ status }: { status: string }) {
  const t = useGuardNs('status.account');
  const known = Object.hasOwn(accountTone, status) ? (status as AccountStatus) : null;
  return <StatusPill tone={known ? accountTone[known] : 'neutral'}>{known ? t(known) : status}</StatusPill>;
}

const pluginTone: Record<PluginState, StatusTone> = { Enabled: 'success', Disabled: 'neutral', Installed: 'info', Failed: 'danger' };

/** The API sends the state as a string; one this version doesn't know is shown as sent. */
export function PluginStatePill({ state }: { state: string }) {
  const t = useGuardNs('status.plugin');
  const known = Object.hasOwn(pluginTone, state) ? (state as PluginState) : null;
  return <StatusPill tone={known ? pluginTone[known] : 'neutral'}>{known ? t(known) : state}</StatusPill>;
}

/** A yes/no flag as a pill: positive is success, negative is neutral. */
export function FlagPill({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return <StatusPill tone={value ? 'success' : 'neutral'}>{value ? yes : no}</StatusPill>;
}

export function PassFail({ ok }: { ok: boolean | null }) {
  const t = useGuardNs('status.check');
  if (ok == null) return <StatusPill>{t('notRun')}</StatusPill>;
  return <StatusPill tone={ok ? 'success' : 'danger'}>{ok ? t('pass') : t('fail')}</StatusPill>;
}

/** Result of a sync run: running (null), succeeded or failed. */
export function SyncResultPill({ succeeded }: { succeeded: boolean | null }) {
  const t = useGuardNs('status.sync');
  if (succeeded == null) return <StatusPill tone="warning">{t('running')}</StatusPill>;
  return <StatusPill tone={succeeded ? 'success' : 'danger'}>{succeeded ? t('succeeded') : t('failed')}</StatusPill>;
}

export function SyncStatus({ d }: { d: Pick<DirectoryDto, 'lastSyncAt' | 'lastSyncSucceeded' | 'lastSyncMessage'> }) {
  const t = useGuardNs('status.sync');
  const fmt = useFormatters();
  if (!d.lastSyncAt) return <StatusPill>{t('never')}</StatusPill>;
  return (
    <Stack gap="0.5" align="flex-start" minW="0" maxW="full">
      <SyncResultPill succeeded={d.lastSyncSucceeded ?? null} />
      <Text textStyle="caption" color="fg.muted">
        {fmt.dateTime(d.lastSyncAt)}
      </Text>
      {d.lastSyncMessage && (
        <Text textStyle="caption" color="fg.muted" maxW="full" truncate dir="auto" title={d.lastSyncMessage}>
          {d.lastSyncMessage}
        </Text>
      )}
    </Stack>
  );
}
