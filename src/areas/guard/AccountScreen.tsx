import { HStack, Stack, Text, type TableRowProps } from '@chakra-ui/react';
import {
  AppLink,
  Button,
  DataTable,
  EMPTY_VALUE,
  HostSlot,
  InlineAlert,
  Loading,
  PageHeader,
  Panel,
  PathChips,
  PropertyList,
  RecordKey,
  StatusPill,
  TextSlot,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useFormatters,
  useMe,
  useNavigate,
  type DataTableColumn,
} from '@abpjs/ui';
import { AccountEmailsPanel } from './AccountEmailsPanel';
import { AccountNameEditor } from './AccountNameEditor';
import { AccountSecondFactorPanel } from './AccountSecondFactorPanel';
import { MergesPanel } from './MergeParts';
import { guardRoutes, type GuardRoutes } from './routes';
import { AccountStatusPill } from './status';
import { useGuardNs, withParts } from './texts';
import type { AccountCanDto, AccountDetailDto, AccountDto, AccountEmailsDto, EffectiveGroupDto, IdentityDto } from './types';

/** What the person looking may do to this account, as AbpGuard.HttpApi answers it with the account. */
export type AccountAction = keyof AccountCanDto;

/**
 * Whether the person looking may do `action` to the account: the account's own `can` flags, the server's answer for this
 * person and this account. While the account loads, nothing.
 */
export function useAccountCan(detail: AccountDetailDto | undefined): (action: AccountAction) => boolean {
  return (action) => detail?.can?.[action] ?? false;
}

/** The addresses panel while the account loads: its rows are placeholders until they come. */
const NO_ADDRESSES: AccountEmailsDto = { directoryEmail: null, directoryMailGoesHere: false, mailTo: null, addresses: [] };

export interface AccountScreenProps {
  id: string;
  routes?: GuardRoutes;
}

/**
 * An account: its name, addresses and second factor, the directories it comes from and which one wins, the groups it's
 * in (directly or through others), and the merges it was in. Lock, unlock and merge are shown only where AbpGuard allows
 * them for this very account (a helpdesk scoped to one directory, say). A host adds its own buttons before the area's
 * through the `guard.account.actions` slot and after them through `guard.account.actions.end` (a destructive one last),
 * notices above the panels through `guard.account.notices`, and panels below the account's through
 * `guard.account.panels`; each gets `{ account, detail, reload }`.
 */
export function AccountScreen({ id, routes = guardRoutes() }: AccountScreenProps) {
  const t = useGuardNs('accountDetail');
  const tm = useGuardNs('merge');
  const tc = useGuardNs('common');
  const tn = useGuardNs('nav');
  const fmt = useFormatters();
  const navigate = useNavigate();
  const me = useMe();
  const request = useAreaRequest('guard');
  const detail = useApiQuery<AccountDetailDto>('guard', `/accounts/${id}`);
  const action = useApiAction();
  const may = useAccountCan(detail.data);

  async function setLocked(lock: boolean) {
    const updated = await action.run(() => request<AccountDto>(`/accounts/${id}/${lock ? 'lock' : 'unlock'}`, { method: 'POST' }));
    if (updated) await detail.reload();
  }

  if (detail.error && !detail.data) return <InlineAlert tone="danger">{detail.error}</InlineAlert>;

  // While it loads, the page is drawn as it will be, its data coming.
  const data = detail.data;
  const account = data?.account;
  const merged = account?.mergedIntoId != null;
  const slotContext = { account, detail: data, reload: detail.reload };

  const identityColumns: DataTableColumn<IdentityDto>[] = [
    { id: 'order', header: tc('order'), numeric: true, sortValue: (i) => i.directoryOrder, cell: (i) => i.directoryOrder },
    {
      id: 'directory',
      header: tc('directory'),
      sortValue: (i) => i.directoryName,
      cell: (i) => (
        <AppLink href={routes.directory(i.directoryId)} fontWeight={i.isWinning ? 'medium' : undefined}>
          {i.directoryName}
        </AppLink>
      ),
    },
    { id: 'username', header: tc('username'), sortValue: (i) => i.username, cell: (i) => <RecordKey value={i.username} />, skeleton: 'key' },
    {
      id: 'externalId',
      header: t('externalId'),
      cell: (i) => (
        <Text as="span" textStyle="code" color="fg.muted" wordBreak="break-all" dir="ltr">
          {i.externalId}
        </Text>
      ),
    },
    { id: 'displayName', header: tc('displayName'), sortValue: (i) => i.displayName, cell: (i) => i.displayName ?? EMPTY_VALUE, skeleton: 'person' },
    { id: 'email', header: tc('email'), sortValue: (i) => i.email, cell: (i) => i.email ?? EMPTY_VALUE },
    {
      id: 'active',
      header: tc('active'),
      sortValue: (i) => i.isActive,
      cell: (i) => (i.isActive ? <StatusPill tone="success">{tc('active')}</StatusPill> : <StatusPill>{tc('inactive')}</StatusPill>),
      skeleton: 'pill',
    },
    {
      id: 'synced',
      header: t('lastSynced'),
      nowrap: true,
      sortValue: (i) => (i.lastSyncedAt ? new Date(i.lastSyncedAt) : null),
      cell: (i) => fmt.dateTime(i.lastSyncedAt),
      skeleton: 'date',
      skeletonWidth: 17,
    },
    {
      id: 'precedence',
      header: t('precedence'),
      sortValue: (i) => i.isWinning,
      cell: (i) => (i.isWinning ? <StatusPill tone="success">{t('winning')}</StatusPill> : <StatusPill>{t('shadowed')}</StatusPill>),
      skeleton: 'pill',
    },
  ];

  const groupColumns: DataTableColumn<EffectiveGroupDto>[] = [
    {
      id: 'group',
      header: tc('group'),
      sortValue: (g) => g.name,
      cell: (g) => (
        <AppLink href={routes.group(g.groupId)} fontWeight="medium">
          {g.name}
        </AppLink>
      ),
    },
    { id: 'directory', header: tc('directory'), sortValue: (g) => g.directoryName, cell: (g) => g.directoryName },
    {
      id: 'membership',
      header: tc('membership'),
      sortValue: (g) => (g.direct ? 0 : 1),
      cell: (g) => (g.direct ? <StatusPill tone="info">{tc('direct')}</StatusPill> : <StatusPill>{tc('nested')}</StatusPill>),
      skeleton: 'pill',
    },
    { id: 'path', header: tc('path'), sortValue: (g) => g.path.length, cell: (g) => <PathChips path={g.path} />, skeleton: () => <PathChips path={[]} loading /> },
  ];

  return (
    <Loading when={!data}>
      <PageHeader
        breadcrumbs={[{ label: tn('accounts'), href: routes.accounts }, { label: account?.username }]}
        title={account && (account.displayName || account.username)}
        meta={
          <>
            {account ? <AccountStatusPill status={account.status} /> : <StatusPill />}
            <RecordKey value={account?.username} variant="muted" />
            <Text as="span">
              <TextSlot width={12}>{account?.directoryName}</TextSlot>
            </Text>
            {account?.statusReason && <Text as="span">{account.statusReason}</Text>}
          </>
        }
        actions={
          !merged && (
            <HStack gap="2">
              {account && <HostSlot name="guard.account.actions" context={slotContext} />}
              {may('merge') && <Button onClick={() => navigate(routes.accountMerge(account?.id ?? id))}>{tm('mergeInto')}</Button>}
              {account?.status === 'Locked'
                ? may('unlock') && (
                    <Button onClick={() => setLocked(false)} loading={action.busy}>
                      {t('unlock')}
                    </Button>
                  )
                : may('lock') && (
                    <Button danger onClick={() => setLocked(true)} loading={action.busy}>
                      {t('lock')}
                    </Button>
                  )}
              {account && <HostSlot name="guard.account.actions.end" context={slotContext} />}
            </HStack>
          )
        }
      />
      <Stack gap="section">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {merged && (
          <InlineAlert tone="info" data-testid="merged">
            {withParts(tm('mergedBanner'), {
              survivor: (
                <AppLink href={routes.account(account?.mergedIntoId ?? '')} fontWeight="medium">
                  {data?.mergedIntoUsername ?? account?.mergedIntoId}
                </AppLink>
              ),
            })}
          </InlineAlert>
        )}
        {account && <HostSlot name="guard.account.notices" context={slotContext} />}
        <Panel title={t('account')}>
          <PropertyList
            items={[
              {
                label: tc('displayName'),
                value: account && (
                  <AccountNameEditor
                    name={account.displayName || account.username}
                    names={account.displayNames}
                    base={`/accounts/${account.id}`}
                    correctable={(data?.addresses?.correctable ?? false) && may('update')}
                    onRenamed={() => void detail.reload()}
                  />
                ),
              },
              { label: tc('email'), value: account && (account.email ?? EMPTY_VALUE) },
              { label: t('owningDirectory'), value: account?.directoryName },
              { label: tc('lastSignIn'), value: account && fmt.dateTime(account.lastLoginAt) },
            ]}
          />
        </Panel>

        {/* Never one's own: a person resets their own second factor where they set it up. */}
        {!merged && account && (
          <AccountSecondFactorPanel
            accountId={account.id}
            name={account.displayName || account.username}
            canReset={may('resetSecondFactor') && account.id !== me?.accountId}
          />
        )}

        {/* A merged account's addresses are its survivor's now. */}
        {!merged && (
          <AccountEmailsPanel
            addresses={data?.addresses ?? NO_ADDRESSES}
            base={`/accounts/${account?.id ?? id}`}
            canEdit={may('update')}
            onChange={(updated) => data && detail.setData({ ...data, addresses: updated })}
          />
        )}

        {account && <HostSlot name="guard.account.panels" context={slotContext} />}

        <Panel
          title={<TextSlot width={14}>{t('identities', { count: data?.identities.length ?? 0 })}</TextSlot>}
          description={t('identitiesHint')}
          flush
        >
          <DataTable
            aria-label={t('identities', { count: data?.identities.length ?? 0 })}
            size="sm"
            columns={identityColumns}
            rows={data?.identities}
            skeletonRows={1}
            getRowId={(i) => `${i.directoryId}:${i.externalId}`}
            defaultSort={{ columnId: 'order', direction: 'asc' }}
            rowProps={(i) => (i.isWinning ? ({ 'data-selected': '' } as TableRowProps) : undefined)}
            empty={t('noIdentities')}
          />
        </Panel>

        <Panel title={<TextSlot width={20}>{t('effectiveGroups', { count: data?.groups.length ?? 0 })}</TextSlot>} flush>
          <DataTable
            aria-label={t('effectiveGroups', { count: data?.groups.length ?? 0 })}
            columns={groupColumns}
            rows={data?.groups}
            getRowId={(g) => g.groupId}
            defaultSort={{ columnId: 'path', direction: 'asc' }}
            empty={t('noGroups')}
          />
        </Panel>

        {/* Last on the page, so it comes with the data: nothing below it moves. */}
        {data && (data.merges.length > 0 || may('merge')) && (
          <MergesPanel accountId={data.account.id} merges={data.merges} onChange={detail.reload} routes={routes} />
        )}
      </Stack>
    </Loading>
  );
}
