import { useEffect, useState, type FormEvent } from 'react';
import { Grid, HStack, Input, List, Stack, Text, Textarea } from '@chakra-ui/react';
import {
  AppLink,
  Button,
  DataTable,
  errorText,
  Field,
  InlineAlert,
  Loading,
  notify,
  PageHeader,
  Panel,
  PathChips,
  RecordKey,
  SearchInput,
  StatusPill,
  TextBone,
  TextSlot,
  TranslatedInput,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useNavigate,
  useSettledValue,
  type DataTableColumn,
} from '@abpjs/ui';
import { fromNamesValue, splitList, toNamesValue } from '@abpjs/ui/rules';
import { GroupTree } from './GroupTree';
import { GroupTwoFactorPanel } from './GroupTwoFactorPanel';
import { useWrittenName } from './names';
import { guardRoutes, type GuardRoutes } from './routes';
import { useGuardNs } from './texts';
import type { AccountDto, EffectiveMemberDto, GroupDetailDto, GroupDto, GroupMemberDto } from './types';

export interface GroupScreenProps {
  id: string;
  routes?: GuardRoutes;
}

/**
 * A group: its names, its direct members (accounts and groups) and the groups it's in, the groups nested in it as a
 * tree, whether its members are asked for a second factor, an organization's domains and attributes, and everyone in it
 * through any path. A local group takes members here; a synced or computed one says where its members come from.
 */
export function GroupScreen({ id, routes = guardRoutes() }: GroupScreenProps) {
  const t = useGuardNs('groupDetail');
  const tg = useGuardNs('groups');
  const tc = useGuardNs('common');
  const tn = useGuardNs('nav');
  const tf = useGuardNs('groupDetail.twoFactor');
  const written = useWrittenName();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const request = useAreaRequest('guard');
  const detail = useApiQuery<GroupDetailDto>('guard', `/groups/${id}`);
  const action = useApiAction();
  const [treeKey, setTreeKey] = useState(0);

  async function reload() {
    await detail.reload();
    setTreeKey((k) => k + 1);
  }

  async function removeMember(m: GroupMemberDto) {
    const ok = await action.run(async () => {
      await request(`/groups/${id}/members/${m.memberType}/${m.memberId}`, { method: 'DELETE' });
      return true;
    });
    if (ok) await reload();
  }

  async function deleteGroup() {
    if (!detail.data) return;
    const yes = await confirm({ title: t('deleteTitle', { name: detail.data.group.name }), confirmLabel: tc('delete'), danger: true });
    if (!yes) return;
    const ok = await action.run(async () => {
      await request(`/groups/${id}`, { method: 'DELETE' });
      return true;
    });
    if (ok) navigate(routes.groups);
  }

  if (detail.error && !detail.data) return <InlineAlert tone="danger">{detail.error}</InlineAlert>;

  // While it loads, the page is drawn as it will be, its data coming.
  const group = detail.data?.group;
  const members = detail.data?.members;
  const parents = detail.data?.parents;
  const effectiveMembers = detail.data?.effectiveMembers;
  const hasGroupMembers = members?.some((m) => m.memberType === 'Group') ?? false;

  const memberColumns: DataTableColumn<GroupMemberDto>[] = [
    {
      id: 'type',
      header: tc('type'),
      sortValue: (m) => (m.memberType === 'Group' ? 0 : 1),
      cell: (m) => (m.memberType === 'Group' ? <StatusPill tone="info">{tc('group')}</StatusPill> : <StatusPill>{tc('account')}</StatusPill>),
      skeleton: 'pill',
    },
    {
      id: 'name',
      header: tc('name'),
      sortValue: (m) => m.name,
      cell: (m) => (
        <HStack gap="2" wrap="wrap">
          {m.memberType === 'Group' ? (
            <AppLink href={routes.group(m.memberId)} fontWeight="medium">
              {m.name}
            </AppLink>
          ) : (
            <RecordKey value={m.name} href={routes.account(m.memberId)} />
          )}
          {m.displayName && m.displayName !== m.name && (
            <Text as="span" textStyle="caption" color="fg.muted">
              {m.displayName}
            </Text>
          )}
        </HStack>
      ),
      skeleton: 'key',
    },
    { id: 'directory', header: tc('directory'), sortValue: (m) => m.directoryName, cell: (m) => m.directoryName },
    {
      id: 'source',
      header: tc('source'),
      sortValue: (m) => m.source,
      cell: (m) =>
        m.source === 'Directory' ? (
          <StatusPill tone="info">{t('fromDirectory')}</StatusPill>
        ) : m.source === 'Domain' ? (
          <StatusPill tone="info">{t('byDomain')}</StatusPill>
        ) : m.source === 'Import' ? (
          <StatusPill tone="info">{t('fromImport')}</StatusPill>
        ) : (
          <StatusPill tone="accent">{t('manual')}</StatusPill>
        ),
      skeleton: 'pill',
    },
    {
      id: 'actions',
      header: (
        <Text as="span" srOnly>
          {tc('actions')}
        </Text>
      ),
      align: 'end',
      cell: (m) =>
        m.removable && (
          <Button size="sm" variant="ghost" danger onClick={() => removeMember(m)} disabled={action.busy}>
            {t('remove')}
          </Button>
        ),
      skeleton: () => (
        <Button size="sm" variant="ghost" danger>
          {t('remove')}
        </Button>
      ),
    },
  ];

  const effectiveColumns: DataTableColumn<EffectiveMemberDto>[] = [
    {
      id: 'username',
      header: tc('username'),
      sortValue: (m) => m.username,
      cell: (m) => <RecordKey value={m.username} href={routes.account(m.accountId)} />,
      skeleton: 'key',
    },
    { id: 'displayName', header: tc('displayName'), sortValue: (m) => m.displayName, cell: (m) => m.displayName, skeleton: 'person' },
    { id: 'path', header: tc('path'), sortValue: (m) => m.path.length, cell: (m) => <PathChips path={m.path} />, skeleton: () => <PathChips path={[]} loading /> },
  ];

  return (
    <Loading when={!detail.data}>
      <PageHeader
        breadcrumbs={[{ label: tn('groups'), href: routes.groups }, { label: group && written(group.name, group.names) }]}
        title={group && written(group.name, group.names)}
        description={group?.description ?? undefined}
        meta={
          <>
            <Text as="span">
              <TextSlot width={10}>{group?.directoryName}</TextSlot>
            </Text>
            <StatusPill dot={false}>{group && tg(`kinds.${group.kind}`)}</StatusPill>
            {!group ? <StatusPill /> : group.isLocal ? <StatusPill tone="accent">{tg('local')}</StatusPill> : <StatusPill tone="info">{tg('synced')}</StatusPill>}
            {!group ? <StatusPill /> : group.writable ? <StatusPill tone="success">{t('writable')}</StatusPill> : <StatusPill>{tg('readOnly')}</StatusPill>}
            {group && group.twoFactor && group.twoFactor !== 'off' && (
              <StatusPill tone="accent" data-testid="group-two-factor-pill">
                {tf('pill', { mode: tf(`modes.${group.twoFactor}`) })}
              </StatusPill>
            )}
          </>
        }
        actions={
          (!group || (group.isLocal && !group.computed)) && (
            <Button danger onClick={deleteGroup} disabled={action.busy}>
              {t('delete')}
            </Button>
          )
        }
      />
      <Stack gap="section">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {group && group.writable && group.isLocal && <GroupNames group={group} onSaved={reload} />}

        <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) {sizes.sidePanel}' }} gap="section" alignItems="start">
          <Panel title={<TextSlot width={18}>{t('directMembers', { count: members?.length ?? 0 })}</TextSlot>} flush>
            <DataTable
              aria-label={t('directMembers', { count: members?.length ?? 0 })}
              columns={memberColumns}
              rows={members}
              getRowId={(m) => `${m.memberType}:${m.memberId}`}
              defaultSort={{ columnId: 'type', direction: 'asc' }}
              empty={t('noMembers')}
            />
          </Panel>

          <Stack gap="section">
            <Panel title={<TextSlot width={14}>{t('memberOf', { count: parents?.length ?? 0 })}</TextSlot>}>
              {!parents ? (
                <Text textStyle="body">
                  <TextBone width={t('notNested').length} />
                </Text>
              ) : parents.length === 0 ? (
                <Text textStyle="body" color="fg.muted">
                  {t('notNested')}
                </Text>
              ) : (
                <List.Root listStyle="none" gap="1.5">
                  {parents.map((p) => (
                    <List.Item key={p.id}>
                      <HStack justify="space-between" gap="2" w="full">
                        <AppLink href={routes.group(p.id)}>{written(p.name, p.names)}</AppLink>
                        <Text as="span" textStyle="caption" color="fg.muted">
                          {p.directoryName}
                        </Text>
                      </HStack>
                    </List.Item>
                  ))}
                </List.Root>
              )}
            </Panel>
            {/* Any group may ask, synced ones too: the policy is the site's, not the directory's. */}
            {group && detail.data && (
              <GroupTwoFactorPanel key={group.id} group={group} onSaved={(updated) => detail.data && detail.setData({ ...detail.data, group: updated })} />
            )}
            {group && members && hasGroupMembers && (
              <Panel title={t('nestedGroups')}>
                <GroupTree key={treeKey} rootId={group.id} rootName={group.name} rootMembers={members} routes={routes} />
              </Panel>
            )}
          </Stack>
        </Grid>

        {group?.kind === 'organization' && <OrganizationPanel group={group} onSaved={reload} />}

        {/* Most groups take members here, so the panel is there while it loads. */}
        {!group || group.writable ? (
          <AddMember groupId={group?.id ?? id} existing={members ?? []} onAdded={reload} />
        ) : (
          <InlineAlert tone="neutral">{group.computed ? t(group.kind === 'ou' ? 'ouNotice' : 'directoryNotice') : t('readOnlyNotice')}</InlineAlert>
        )}

        <Panel title={<TextSlot width={22}>{t('effectiveMembers', { count: effectiveMembers?.length ?? 0 })}</TextSlot>} flush>
          <DataTable
            aria-label={t('effectiveMembers', { count: effectiveMembers?.length ?? 0 })}
            columns={effectiveColumns}
            rows={effectiveMembers}
            getRowId={(m) => `${m.accountId}:${m.path.join('>')}`}
            defaultSort={{ columnId: 'path', direction: 'asc' }}
            empty={t('noEffectiveMembers')}
          />
        </Panel>
      </Stack>
    </Loading>
  );
}

type Candidate = { kind: 'Group'; group: GroupDto } | { kind: 'Account'; account: AccountDto };

/** An organization's email domains (people whose email is in one join it) and attributes. */
function OrganizationPanel({ group, onSaved }: { group: GroupDto; onSaved: () => Promise<void> }) {
  const t = useGuardNs('groupDetail');
  const tg = useGuardNs('groups');
  const request = useAreaRequest('guard');
  const [domains, setDomains] = useState(group.emailDomains.join(', '));
  const [attributes, setAttributes] = useState(
    Object.entries(group.attributes)
      .map(([k, v]) => `${k} = ${v}`)
      .join('\n'),
  );
  const action = useApiAction();

  async function save() {
    const parsed: Record<string, string> = {};
    for (const line of attributes
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      const at = line.indexOf('=');
      if (at > 0) parsed[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    const ok = await action.run(async () => {
      await request(`/groups/${group.id}`, {
        method: 'PUT',
        body: { name: group.name, description: group.description, emailDomains: splitList(domains), attributes: parsed },
      });
      return true;
    });
    if (ok) {
      notify.success(t('organizationSaved'));
      await onSaved();
    }
  }

  return (
    <Panel title={t('organization')} description={t('organizationHint')} data-testid="organization">
      <Stack gap="field" maxW="2xl">
        <Field label={tg('domains')} helperText={tg('domainsHint')}>
          <Input value={domains} onChange={(e) => setDomains(e.target.value)} dir="ltr" placeholder="acme.com" />
        </Field>
        <Field label={t('attributes')} helperText={t('attributesHint')}>
          <Textarea value={attributes} onChange={(e) => setAttributes(e.target.value)} rows={4} fontFamily="mono" fontSize="sm" />
        </Field>
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        <HStack>
          <Button onClick={() => void save()} loading={action.busy}>
            {t('saveOrganization')}
          </Button>
        </HStack>
      </Stack>
    </Panel>
  );
}

function AddMember({ groupId, existing, onAdded }: { groupId: string; existing: GroupMemberDto[]; onAdded: () => Promise<void> }) {
  const t = useGuardNs('groupDetail');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const [query, setQuery] = useState('');
  const settled = useSettledValue(query.trim());
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!settled) {
      setAccounts([]);
      setGroups([]);
      return;
    }
    let cancelled = false;
    const search = new URLSearchParams({ search: settled });
    Promise.all([request<AccountDto[]>(`/accounts?${search}`), request<GroupDto[]>(`/groups?${search}`)])
      .then(([a, g]) => {
        if (cancelled) return;
        setAccounts(a.slice(0, 10));
        setGroups(g.filter((x) => x.id !== groupId).slice(0, 10));
        setSearchError(null);
      })
      .catch((e) => !cancelled && setSearchError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [settled, groupId, request]);

  const isMember = (type: 'Account' | 'Group', id: string) => existing.some((m) => m.memberType === type && m.memberId === id);

  async function add(body: { accountId: string } | { groupId: string }, key: string) {
    setBusyId(key);
    setError(null);
    try {
      await request(`/groups/${groupId}/members`, { method: 'POST', body });
      await onAdded();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  }

  const candidates: Candidate[] = [
    ...groups.map((g) => ({ kind: 'Group' as const, group: g })),
    ...accounts.map((a) => ({ kind: 'Account' as const, account: a })),
  ];
  const keyOf = (c: Candidate) => (c.kind === 'Group' ? `g:${c.group.id}` : `a:${c.account.id}`);

  const columns: DataTableColumn<Candidate>[] = [
    {
      id: 'type',
      header: tc('type'),
      width: '24',
      cell: (c) => (c.kind === 'Group' ? <StatusPill tone="info">{tc('group')}</StatusPill> : <StatusPill>{tc('account')}</StatusPill>),
    },
    {
      id: 'name',
      header: tc('name'),
      cell: (c) =>
        c.kind === 'Group' ? (
          <Text as="span" fontWeight="medium">
            {c.group.name}
          </Text>
        ) : (
          <HStack gap="2">
            <RecordKey value={c.account.username} />
            <Text as="span" textStyle="caption" color="fg.muted">
              {c.account.displayName}
            </Text>
          </HStack>
        ),
    },
    { id: 'directory', header: tc('directory'), cell: (c) => (c.kind === 'Group' ? c.group.directoryName : c.account.directoryName) },
    {
      id: 'add',
      header: (
        <Text as="span" srOnly>
          {tc('actions')}
        </Text>
      ),
      align: 'end',
      cell: (c) => {
        const member = c.kind === 'Group' ? isMember('Group', c.group.id) : isMember('Account', c.account.id);
        if (member)
          return (
            <Text as="span" textStyle="caption" color="fg.muted">
              {t('alreadyMember')}
            </Text>
          );
        const key = keyOf(c);
        return (
          <Button
            size="sm"
            disabled={busyId != null}
            loading={busyId === key}
            onClick={() => add(c.kind === 'Group' ? { groupId: c.group.id } : { accountId: c.account.id }, key)}
          >
            {t('add')}
          </Button>
        );
      },
    },
  ];

  return (
    <Panel title={t('addMember')}>
      <Stack gap="stack">
        <SearchInput maxW="md" placeholder={t('searchMembers')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('searchMembers')} />
        <InlineAlert tone="danger">{error}</InlineAlert>
        <InlineAlert tone="danger">{searchError}</InlineAlert>
        {settled && candidates.length === 0 && !searchError && (
          <Text textStyle="body" color="fg.muted">
            {t('noMatches')}
          </Text>
        )}
        {candidates.length > 0 && (
          <Panel flush>
            <DataTable size="sm" aria-label={t('addMember')} columns={columns} rows={candidates} getRowId={keyOf} />
          </Panel>
        )}
      </Stack>
    </Panel>
  );
}

/**
 * A group's name in each of the site's languages: the English one is the name as written, which history and the
 * directory keep; each other language's shows to readers of that language.
 */
function GroupNames({ group, onSaved }: { group: GroupDto; onSaved: () => Promise<void> }) {
  const t = useGuardNs('groupDetail');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const action = useApiAction();
  const [value, setValue] = useState<Record<string, string>>(() => toNamesValue(group.name, group.names));
  const { name, names } = fromNamesValue(value);
  const unchanged = name === group.name && JSON.stringify(names) === JSON.stringify(fromNamesValue(toNamesValue(group.name, group.names)).names);

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await action.run(async () => {
      await request(`/groups/${group.id}`, {
        method: 'PUT',
        body: { name, description: group.description, names, attributes: group.attributes, emailDomains: group.emailDomains },
      });
      return true;
    });
    if (ok) await onSaved();
  }

  return (
    <Panel title={t('names')} description={t('namesHint')}>
      <form onSubmit={save}>
        <HStack gap="2" align="start" wrap="wrap">
          <TranslatedInput value={value} onChange={setValue} aria-label={tc('name')} suggest={false} />
          <Button type="submit" loading={action.busy} disabled={!name || unchanged}>
            {t('saveNames')}
          </Button>
        </HStack>
        <InlineAlert tone="danger">{action.error}</InlineAlert>
      </form>
    </Panel>
  );
}
