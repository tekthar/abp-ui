import { useState } from 'react';
import { HStack, Stack } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import {
  AppLink,
  Button,
  DataTable,
  IconButton,
  InlineAlert,
  Loading,
  PageHeader,
  Panel,
  StatusPill,
  Tooltip,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  type DataTableColumn,
} from '@abpjs/ui';
import { DirectoryForm, DirectoryWarnings } from './DirectoryForm';
import { guardRoutes, type GuardRoutes } from './routes';
import { FlagPill, SyncStatus } from './status';
import { useGuardNs } from './texts';
import type { DirectoryDto, DirectoryInput, DirectoryTypeDto, SyncRunDto } from './types';

const EMPTY_INPUT: DirectoryInput = {
  name: '',
  type: '',
  isActive: true,
  authenticationEnabled: true,
  syncIntervalMinutes: 60,
  settings: {},
};

/**
 * The site's directories, in the order sign-in tries them: added, reordered, synced now. A connector a directory needs
 * that isn't there (its plugin turned off) says so, and what a connector warns of in its settings is shown.
 */
export function DirectoriesScreen({ routes = guardRoutes() }: { routes?: GuardRoutes }) {
  const t = useGuardNs('directories');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const dirs = useApiQuery<DirectoryDto[]>('guard', '/directories');
  const types = useApiQuery<DirectoryTypeDto[]>('guard', '/directory-types');
  const action = useApiAction();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  // The directory just added, when its connector warns of its settings: said once it's saved.
  const [added, setAdded] = useState<DirectoryDto | null>(null);

  const list = dirs.data ?? [];

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((d) => d.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const result = await action.run(() => request<DirectoryDto[]>('/directories/reorder', { method: 'POST', body: { directoryIds: ids } }));
    if (result) dirs.setData(result);
  }

  async function sync(d: DirectoryDto) {
    setSyncing(d.id);
    setNotice(null);
    const run = await action.run(() => request<SyncRunDto>(`/directories/${d.id}/sync`, { method: 'POST' }));
    setSyncing(null);
    if (run) {
      setNotice(
        run.succeeded === false
          ? { ok: false, text: t('syncFailed', { name: d.name, error: run.error ?? tc('unknownError') }) }
          : {
              ok: true,
              text: t('synced', {
                name: d.name,
                added: run.usersAdded,
                updated: run.usersUpdated,
                deactivated: run.usersDeactivated,
                groups: run.groupsSynced,
                memberships: run.membershipsSynced,
              }),
            },
      );
    }
    await dirs.reload();
  }

  async function create(input: DirectoryInput) {
    const made = await request<DirectoryDto>('/directories', { method: 'POST', body: input });
    setAdded((made.warnings ?? []).length > 0 ? made : null);
    setAdding(false);
    await dirs.reload();
  }

  const columns: DataTableColumn<DirectoryDto>[] = [
    { id: 'order', header: tc('order'), numeric: true, width: '16', cell: (d) => d.order },
    {
      id: 'name',
      header: tc('name'),
      cell: (d) => (
        <Stack gap="1" align="flex-start">
          <AppLink href={routes.directory(d.id)} fontWeight="medium">
            {d.name}
          </AppLink>
          {!d.connectorAvailable && (
            <StatusPill tone="warning" title={d.pluginKey ? t('pluginDisabledHint', { plugin: d.pluginKey }) : undefined}>
              {t('connectorDisabled')}
            </StatusPill>
          )}
          {d.warnings && d.warnings.length > 0 && (
            <StatusPill tone="warning" title={d.warnings.join('\n')}>
              {t('warnings', { count: d.warnings.length })}
            </StatusPill>
          )}
        </Stack>
      ),
    },
    { id: 'type', header: tc('type'), cell: (d) => d.typeDisplayName || d.type },
    { id: 'active', header: tc('active'), cell: (d) => <FlagPill value={d.isActive} yes={tc('active')} no={tc('inactive')} />, skeleton: 'pill' },
    { id: 'signIn', header: t('signIn'), cell: (d) => <FlagPill value={d.authenticationEnabled} yes={tc('enabled')} no={tc('disabled')} />, skeleton: 'pill' },
    { id: 'users', header: tc('users'), numeric: true, cell: (d) => d.userCount },
    { id: 'groups', header: tc('groups'), numeric: true, cell: (d) => d.groupCount },
    { id: 'lastSync', header: t('lastSync'), cell: (d) => <SyncStatus d={d} />, skeleton: 'pill' },
    {
      id: 'actions',
      header: tc('actions'),
      align: 'end',
      nowrap: true,
      // Its buttons as their ghosts while the list loads, so a placeholder row is as tall as a real one.
      skeleton: () => (
        <Loading when>
          <HStack gap="1" justify="flex-end">
            <IconButton size="sm" aria-label={t('moveUp', { name: '' })}>
              <ArrowUp />
            </IconButton>
            <IconButton size="sm" aria-label={t('moveDown', { name: '' })}>
              <ArrowDown />
            </IconButton>
            <Button size="sm">
              <RefreshCw />
              {t('syncNow')}
            </Button>
          </HStack>
        </Loading>
      ),
      cell: (d) => {
        const i = list.indexOf(d);
        return (
          <HStack gap="1" justify="flex-end">
            <IconButton size="sm" aria-label={t('moveUp', { name: d.name })} disabled={i === 0 || action.busy} onClick={() => move(i, -1)}>
              <ArrowUp />
            </IconButton>
            <IconButton size="sm" aria-label={t('moveDown', { name: d.name })} disabled={i === list.length - 1 || action.busy} onClick={() => move(i, 1)}>
              <ArrowDown />
            </IconButton>
            <Tooltip content={t('connectorDisabled')} disabled={d.connectorAvailable}>
              <Button size="sm" disabled={syncing != null || !d.connectorAvailable} loading={syncing === d.id} onClick={() => sync(d)}>
                <RefreshCw />
                {t('syncNow')}
              </Button>
            </Tooltip>
          </HStack>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          !adding && (
            <Button variant="primary" onClick={() => { setAdded(null); setAdding(true); }}>
              {t('add')}
            </Button>
          )
        }
      />
      <Stack gap="section">
        {adding && (
          <Panel title={t('add')}>
            {types.error ? (
              <InlineAlert tone="danger">{types.error}</InlineAlert>
            ) : (
              // The form is there while the types load, its fields as their ghosts.
              <Loading when={!types.data}>
                <DirectoryForm
                  mode="create"
                  types={[
                    // An internal directory, kept by the site itself: the accounts people make by signing up.
                    { type: 'internal', displayName: t('internalType'), capabilities: ['Authenticate'], settings: [], pluginKey: null },
                    ...(types.data ?? []),
                  ]}
                  initial={EMPTY_INPUT}
                  onSubmit={create}
                  onCancel={() => setAdding(false)}
                />
              </Loading>
            )}
          </Panel>
        )}

        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {added && <DirectoryWarnings title={t('addedWithWarnings', { name: added.name })} warnings={added.warnings} />}
        {notice && <InlineAlert tone={notice.ok ? 'success' : 'warning'}>{notice.text}</InlineAlert>}

        <Panel flush>
          <DataTable
            aria-label={t('title')}
            columns={columns}
            rows={dirs.data}
            getRowId={(d) => d.id}
            loading={dirs.loading}
            skeletonRows={2}
            error={dirs.error}
            empty={t('empty')}
          />
        </Panel>
      </Stack>
    </>
  );
}
