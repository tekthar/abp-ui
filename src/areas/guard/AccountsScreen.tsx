import { useState, type ChangeEvent, type FormEvent } from 'react';
import { HStack, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import {
  Button,
  DataTable,
  EMPTY_VALUE,
  errorText,
  Field,
  InlineAlert,
  notify,
  PageHeader,
  Panel,
  RecordKey,
  SearchInput,
  SelectField,
  useApiQuery,
  useAreaListSource,
  useAreaRequest,
  useCan,
  useFormatters,
  useListState,
  type DataTableColumn,
  type ListSource,
} from '@abpjs/ui';
import { DuplicatesPanel } from './DuplicatesPanel';
import { ListFooter } from './ListFooter';
import { guardRoutes, type GuardRoutes } from './routes';
import { AccountStatusPill } from './status';
import { useGuardNs } from './texts';
import type { AccountDto, AccountStatus, DirectoryDto } from './types';

/** AbpGuard's own internal directory, where accounts go unless another internal one is chosen. */
const INTERNAL_DIRECTORY = '00000000-0000-0000-0000-00000000d001';

const STATUSES: AccountStatus[] = ['Active', 'Inactive', 'Locked'];

export interface AccountsScreenProps {
  routes?: GuardRoutes;
  /** Where the rows come from: AbpGuard.HttpApi's `/accounts/page` by default; a host may give its own. */
  source?: ListSource<AccountDto>;
}

/**
 * The accounts the person may see, a page at a time: searched by username, name or address, filtered by status, sorted
 * by any column but the directory. A site admin creates internal accounts here, and sees accounts that share an address.
 */
export function AccountsScreen({ routes = guardRoutes(), source }: AccountsScreenProps) {
  const t = useGuardNs('accounts');
  const tc = useGuardNs('common');
  const ts = useGuardNs('status.account');
  const fmt = useFormatters();
  const can = useCan();
  const admin = can('guard.site.admin');
  const served = useAreaListSource<AccountDto>('guard', '/accounts/page', { sortFields: { lastSignIn: 'lastLoginAt' } });
  const list = useListState(source ?? served, { initial: { sort: { columnId: 'username', direction: 'asc' } } });
  const [creating, setCreating] = useState(false);

  const columns: DataTableColumn<AccountDto>[] = [
    { id: 'username', header: tc('username'), sortValue: (a) => a.username, cell: (a) => <RecordKey value={a.username} href={routes.account(a.id)} />, skeleton: 'key' },
    { id: 'displayName', header: tc('displayName'), sortValue: (a) => a.displayName, cell: (a) => a.displayName || EMPTY_VALUE, skeleton: 'person' },
    {
      id: 'email',
      header: tc('email'),
      sortValue: (a) => a.email,
      cell: (a) =>
        a.email ? (
          <Text as="span" color="fg.muted" dir="ltr" wordBreak="break-all">
            {a.email}
          </Text>
        ) : (
          EMPTY_VALUE
        ),
    },
    { id: 'directory', header: tc('directory'), cell: (a) => a.directoryName },
    { id: 'status', header: tc('status'), sortValue: (a) => a.status, cell: (a) => <AccountStatusPill status={a.status} />, skeleton: 'pill' },
    {
      id: 'lastSignIn',
      header: tc('lastSignIn'),
      nowrap: true,
      sortValue: (a) => (a.lastLoginAt ? new Date(a.lastLoginAt) : null),
      cell: (a) => (
        <Text as="span" color="fg.muted">
          {fmt.dateTime(a.lastLoginAt)}
        </Text>
      ),
      skeleton: 'date',
    },
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          !creating &&
          admin && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              {t('create')}
            </Button>
          )
        }
      />
      <Stack gap="section">
        {creating && (
          <CreateAccount
            onDone={(created) => {
              setCreating(false);
              notify.success(t('created', { username: created.username }));
              list.reload();
            }}
            onCancel={() => setCreating(false)}
          />
        )}
        <Stack gap="field">
          <HStack gap="2" wrap="wrap">
            <SearchInput
              size="sm"
              maxW="sm"
              value={list.query.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
            />
            <SelectField
              size="sm"
              maxW="12rem"
              aria-label={tc('status')}
              value={list.query.filters.status ?? ''}
              onChange={(e) => list.setFilter('status', e.target.value || null)}
              options={[{ value: '', label: t('allStatuses') }, ...STATUSES.map((s) => ({ value: s, label: ts(s) }))]}
            />
          </HStack>
          <DataTable aria-label={t('title')} columns={columns} getRowId={(a) => a.id} empty={t('empty')} {...list.table} />
          <ListFooter list={list} />
        </Stack>
        {admin && <DuplicatesPanel routes={routes} />}
      </Stack>
    </>
  );
}

function CreateAccount({ onDone, onCancel }: { onDone: (created: AccountDto) => void; onCancel: () => void }) {
  const t = useGuardNs('accounts');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '' });
  const [directoryId, setDirectoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Accounts are made in a directory AbpGuard keeps: its own, or another internal one (customers, say).
  const internal = (useApiQuery<DirectoryDto[]>('guard', '/directories').data ?? []).filter((d) => d.type === 'internal');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await request<AccountDto>('/accounts', { method: 'POST', body: { ...form, ...(directoryId ? { directoryId } : {}) } });
      onDone(created);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Panel title={t('createTitle')} description={t('createHint')}>
      <form onSubmit={submit}>
        <Stack gap="field">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="field">
            <Field label={tc('username')} required>
              <Input value={form.username} onChange={set('username')} autoComplete="off" />
            </Field>
            <Field label={tc('displayName')} required>
              <Input value={form.displayName} onChange={set('displayName')} />
            </Field>
            <Field
              label={tc('email')}
              optionalText={
                <Text as="span" color="fg.subtle">
                  {tc('optional')}
                </Text>
              }
            >
              <Input type="email" value={form.email} onChange={set('email')} dir="ltr" />
            </Field>
            <Field label={tc('password')} required>
              <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </Field>
            {internal.length > 1 && (
              <Field label={tc('directory')}>
                <SelectField
                  value={directoryId}
                  onChange={(e) => setDirectoryId(e.target.value)}
                  options={internal.map((d) => ({ value: d.id === INTERNAL_DIRECTORY ? '' : d.id, label: d.name }))}
                />
              </Field>
            )}
          </SimpleGrid>
          <InlineAlert tone="danger">{error}</InlineAlert>
          <HStack gap="2">
            <Button type="submit" variant="primary" loading={busy}>
              {t('createSubmit')}
            </Button>
            <Button onClick={onCancel}>{tc('cancel')}</Button>
          </HStack>
        </Stack>
      </form>
    </Panel>
  );
}
