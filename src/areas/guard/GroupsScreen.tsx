import { useState, type FormEvent } from 'react';
import { HStack, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import {
  AppLink,
  Button,
  DataTable,
  EMPTY_VALUE,
  errorText,
  Field,
  InlineAlert,
  notify,
  PageHeader,
  Panel,
  SearchInput,
  SelectField,
  StatusPill,
  TranslatedInput,
  useApiQuery,
  useAreaListSource,
  useAreaRequest,
  useCan,
  useListState,
  type DataTableColumn,
  type ListSource,
} from '@abpjs/ui';
import { fromNamesValue, splitList } from '@abpjs/ui/rules';
import { ListFooter } from './ListFooter';
import { useWrittenName } from './names';
import { guardRoutes, type GuardRoutes } from './routes';
import { useGuardNs } from './texts';
import { num, type DirectoryDto, type GroupDto } from './types';

const KINDS = ['standard', 'directory', 'ou', 'organization'] as const;

export interface GroupsScreenProps {
  routes?: GuardRoutes;
  /** Where the rows come from: AbpGuard.HttpApi's `/groups/page` by default; a host may give its own. */
  source?: ListSource<GroupDto>;
}

/**
 * The groups, a page at a time: local ones made here, synced ones from a directory, and those AbpGuard keeps itself
 * (everyone in a directory, an OU). Searched by name, filtered by directory and kind, sorted by name, kind or directory.
 * A site admin creates groups here: a group, or an organization customers join by their address's domain.
 */
export function GroupsScreen({ routes = guardRoutes(), source }: GroupsScreenProps) {
  const t = useGuardNs('groups');
  const tc = useGuardNs('common');
  const written = useWrittenName();
  const can = useCan();
  const admin = can('guard.site.admin');
  const dirs = useApiQuery<DirectoryDto[]>('guard', '/directories');
  const served = useAreaListSource<GroupDto>('guard', '/groups/page');
  const list = useListState(source ?? served, { initial: { sort: { columnId: 'name', direction: 'asc' } } });
  const [creating, setCreating] = useState(false);

  const columns: DataTableColumn<GroupDto>[] = [
    {
      id: 'name',
      header: tc('name'),
      sortValue: (g) => g.name,
      cell: (g) => (
        <AppLink href={routes.group(g.id)} fontWeight="medium">
          {written(g.name, g.names)}
        </AppLink>
      ),
    },
    { id: 'kind', header: t('kind'), sortValue: (g) => g.kind, cell: (g) => <StatusPill dot={false}>{t(`kinds.${g.kind}`)}</StatusPill>, skeleton: 'pill' },
    {
      id: 'description',
      header: tc('description'),
      cell: (g) =>
        g.description ? (
          <Text as="span" color="fg.muted">
            {g.description}
          </Text>
        ) : (
          EMPTY_VALUE
        ),
    },
    { id: 'directory', header: tc('directory'), sortValue: (g) => g.directoryName, cell: (g) => g.directoryName },
    {
      id: 'source',
      header: tc('source'),
      cell: (g) => (g.isLocal ? <StatusPill tone="accent">{t('local')}</StatusPill> : <StatusPill tone="info">{t('synced')}</StatusPill>),
      skeleton: 'pill',
    },
    { id: 'members', header: t('directMembers'), numeric: true, cell: (g) => num(g.directMemberCount) },
    { id: 'memberGroups', header: t('memberGroups'), numeric: true, cell: (g) => num(g.memberGroupCount) },
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
          <CreateGroup
            directories={dirs.data ?? []}
            onCancel={() => setCreating(false)}
            onDone={(created) => {
              setCreating(false);
              notify.success(t('created', { name: created.name }));
              list.reload();
            }}
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
              aria-label={t('searchPlaceholder')}
            />
            <SelectField
              size="sm"
              maxW="14rem"
              aria-label={tc('directory')}
              value={list.query.filters.directoryId ?? ''}
              onChange={(e) => list.setFilter('directoryId', e.target.value || null)}
              options={[{ value: '', label: t('allDirectories') }, ...(dirs.data ?? []).map((d) => ({ value: d.id, label: d.name }))]}
            />
            <SelectField
              size="sm"
              maxW="14rem"
              aria-label={t('kind')}
              value={list.query.filters.kind ?? ''}
              onChange={(e) => list.setFilter('kind', e.target.value || null)}
              options={[{ value: '', label: t('kind') }, ...KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))]}
            />
          </HStack>
          <DataTable aria-label={t('title')} columns={columns} getRowId={(g) => g.id} empty={t('empty')} {...list.table} />
          <ListFooter list={list} />
        </Stack>
      </Stack>
    </>
  );
}

function CreateGroup({ directories, onDone, onCancel }: { directories: DirectoryDto[]; onDone: (created: GroupDto) => void; onCancel: () => void }) {
  const t = useGuardNs('groups');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const [nameValue, setNameValue] = useState<Record<string, string>>({});
  const { name, names } = fromNamesValue(nameValue);
  const [description, setDescription] = useState('');
  const [directoryId, setDirectoryId] = useState('');
  const [kind, setKind] = useState<'standard' | 'organization'>('standard');
  const [domains, setDomains] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await request<GroupDto>('/groups', {
        method: 'POST',
        body: {
          name,
          names,
          description: description || null,
          ...(directoryId ? { directoryId } : {}),
          kind,
          ...(kind === 'organization' ? { emailDomains: splitList(domains) } : {}),
        },
      });
      onDone(created);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t('create')}>
      <form onSubmit={submit}>
        <Stack gap="field">
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="field">
            <Field label={tc('name')} required>
              <TranslatedInput value={nameValue} onChange={setNameValue} aria-label={tc('name')} />
            </Field>
            <Field label={tc('description')}>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label={tc('directory')} helperText={t('directoryHint')}>
              <SelectField
                value={directoryId}
                onChange={(e) => setDirectoryId(e.target.value)}
                options={[
                  { value: '', label: t('internalDefault') },
                  ...directories.filter((d) => d.type !== 'internal').map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </Field>
            <Field label={t('kind')} helperText={t('kindHint')}>
              <SelectField
                value={kind}
                onChange={(e) => setKind(e.target.value as 'standard' | 'organization')}
                options={(['standard', 'organization'] as const).map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
              />
            </Field>
            {kind === 'organization' && (
              <Field label={t('domains')} helperText={t('domainsHint')}>
                <Input value={domains} onChange={(e) => setDomains(e.target.value)} dir="ltr" placeholder="acme.com" />
              </Field>
            )}
          </SimpleGrid>
          <InlineAlert tone="danger">{error}</InlineAlert>
          <HStack gap="2">
            <Button type="submit" variant="primary" loading={busy}>
              {t('create')}
            </Button>
            <Button onClick={onCancel}>{tc('cancel')}</Button>
          </HStack>
        </Stack>
      </form>
    </Panel>
  );
}
