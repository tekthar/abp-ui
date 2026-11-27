import { useMemo, useState } from 'react';
import { chakra, Stack, Text } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, ExternalLink, FolderTree, Pencil, Power, PowerOff, RefreshCw, Trash2 } from 'lucide-react';
import {
  Button,
  DataTable,
  FormDialog,
  IconTile,
  InlineAlert,
  Loading,
  PageHeader,
  Panel,
  PreviewCard,
  RowMenu,
  StatusPill,
  errorText,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useNavigate,
  type DataTableColumn,
  type RowMenuEntry,
} from '@abpjs/ui';
import { DirectoryFields, DirectoryWarnings } from './DirectoryForm';
import { editInput, moved, syncs } from './directoryRules';
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

/** The dialog: a new directory, or a quick edit of one (its type fixed). */
type Editing = { mode: 'create' } | { mode: 'edit'; dir: DirectoryDto };

/**
 * The site's directories, in the order sign-in tries them (the design canvas's board). New directory and a directory's
 * name open the dialog with a preview: its name, type, sync, whether it's active and signs people in, and its
 * connector's settings. A row's menu edits it, opens its page (sync runs, connection tests, everything else), syncs it
 * now, moves it up or down, turns it off or on, or deletes it. A connector that isn't there (its plugin turned off) says
 * so, and what a connector warns of in its settings is shown.
 */
export function DirectoriesScreen({ routes = guardRoutes() }: { routes?: GuardRoutes }) {
  const t = useGuardNs('directories');
  const tf = useGuardNs('directoryForm');
  const td = useGuardNs('directoryDetail');
  const tc = useGuardNs('common');
  const request = useAreaRequest('guard');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const dirs = useApiQuery<DirectoryDto[]>('guard', '/directories');
  const types = useApiQuery<DirectoryTypeDto[]>('guard', '/directory-types');
  const action = useApiAction();
  const dialog = useApiAction();
  const [editing, setEditing] = useState<Editing | null>(null);
  // What the dialog last showed: kept while it closes, so its words don't switch mid-animation.
  const [shown, setShown] = useState<Editing>({ mode: 'create' });
  const [input, setInput] = useState<DirectoryInput>(EMPTY_INPUT);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  // A directory just saved, when its connector warns of its settings: said once it's saved.
  const [warned, setWarned] = useState<DirectoryDto | null>(null);

  const list = dirs.data ?? [];
  // An internal directory, kept by the site itself: the accounts people make by signing up.
  const allTypes = useMemo<DirectoryTypeDto[]>(
    () => [{ type: 'internal', displayName: t('internalType'), capabilities: ['Authenticate'], settings: [], pluginKey: null }, ...(types.data ?? [])],
    [types.data, t],
  );
  const typeOf = (type: string) => allTypes.find((x) => x.type === type);
  // A type's short name: the internal one in the area's words, a connector's as it names itself.
  const typeName = (type: string, displayName?: string | null) => (type === 'internal' ? t('internal') : displayName || typeOf(type)?.displayName || type);
  const secretsOf = (type: string) => new Set((typeOf(type)?.settings ?? []).filter((s) => s.secret).map((s) => s.name));

  function open(next: Editing) {
    setEditing(next);
    setShown(next);
    setInput(next.mode === 'edit' ? (editInput(next.dir, secretsOf(next.dir.type)) as DirectoryInput) : EMPTY_INPUT);
    dialog.setError(null);
  }

  async function save() {
    if (!editing) return;
    const saved = await dialog.run(() =>
      editing.mode === 'create'
        ? request<DirectoryDto>('/directories', { method: 'POST', body: input })
        : request<DirectoryDto>(`/directories/${editing.dir.id}`, { method: 'PUT', body: input }),
    );
    if (!saved) return;
    setWarned((saved.warnings ?? []).length > 0 ? saved : null);
    setEditing(null);
    await dirs.reload();
  }

  async function remove(d: DirectoryDto) {
    if (!(await confirm({ title: td('deleteTitle', { name: d.name }), description: td('deleteDescription'), confirmLabel: tc('delete'), danger: true }))) return;
    const done = await action.run(async () => {
      await request(`/directories/${d.id}`, { method: 'DELETE' });
      return true;
    });
    if (done) {
      setEditing(null);
      await dirs.reload();
    }
  }

  async function setActive(d: DirectoryDto, isActive: boolean) {
    const body = { ...(editInput(d, secretsOf(d.type)) as DirectoryInput), isActive };
    const saved = await action.run(() => request<DirectoryDto>(`/directories/${d.id}`, { method: 'PUT', body }));
    if (saved) await dirs.reload();
  }

  async function move(d: DirectoryDto, delta: -1 | 1) {
    const ids = moved(list.map((x) => x.id), d.id, delta);
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

  function menu(d: DirectoryDto): RowMenuEntry[] {
    const i = list.indexOf(d);
    const canSync = d.connectorAvailable && syncs(typeOf(d.type)?.capabilities);
    return [
      { id: 'edit', label: t('edit'), icon: <Pencil />, onSelect: () => open({ mode: 'edit', dir: d }) },
      { id: 'open', label: t('openPage'), icon: <ExternalLink />, onSelect: () => navigate(routes.directory(d.id)) },
      { id: 'sync', label: t('syncNow'), icon: <RefreshCw />, disabled: !canSync || syncing != null, onSelect: () => void sync(d) },
      ...(!d.connectorAvailable ? [{ note: t('connectorDisabled') }] : []),
      { separator: true as const },
      { id: 'up', label: t('moveUp', { name: d.name }), icon: <ArrowUp />, disabled: i <= 0 || action.busy, onSelect: () => void move(d, -1) },
      { id: 'down', label: t('moveDown', { name: d.name }), icon: <ArrowDown />, disabled: i === list.length - 1 || action.busy, onSelect: () => void move(d, 1) },
      { separator: true as const },
      d.isActive
        ? { id: 'deactivate', label: t('deactivate'), icon: <PowerOff />, onSelect: () => void setActive(d, false) }
        : { id: 'activate', label: t('activate'), icon: <Power />, onSelect: () => void setActive(d, true) },
      { id: 'delete', label: tc('delete'), icon: <Trash2 />, danger: true, onSelect: () => void remove(d) },
    ];
  }

  const columns: DataTableColumn<DirectoryDto>[] = [
    // The order sign-in tries them, counted from 1 (the server's is from 0).
    { id: 'order', header: t('priority'), numeric: true, width: '16', cell: (d) => list.indexOf(d) + 1 },
    {
      id: 'name',
      header: tc('name'),
      cell: (d) => (
        <Stack gap="1" align="flex-start">
          <chakra.button type="button" fontWeight="semibold" textAlign="start" color="fg" _hover={{ textDecoration: 'underline' }}
            onClick={() => open({ mode: 'edit', dir: d })}>
            {d.name}
          </chakra.button>
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
    { id: 'type', header: tc('type'), cell: (d) => typeName(d.type, d.typeDisplayName) },
    { id: 'active', header: tc('status'), cell: (d) => <FlagPill value={d.isActive} yes={tc('active')} no={tc('inactive')} />, skeleton: 'pill' },
    { id: 'signIn', header: t('signIn'), cell: (d) => <FlagPill value={d.authenticationEnabled} yes={t('on')} no={t('off')} />, skeleton: 'pill' },
    { id: 'users', header: tc('users'), numeric: true, cell: (d) => d.userCount },
    { id: 'groups', header: tc('groups'), numeric: true, cell: (d) => d.groupCount },
    { id: 'lastSync', header: t('lastSync'), cell: (d) => <SyncStatus d={d} />, skeleton: 'pill' },
    {
      id: 'actions',
      header: <Text as="span" srOnly>{tc('actions')}</Text>,
      align: 'end',
      cell: (d) => <RowMenu label={t('menuLabel', { name: d.name })} items={menu(d)} />,
    },
  ];

  const type = typeOf(input.type);
  const synced = !!type && syncs(type.capabilities);
  const minutes = input.syncIntervalMinutes;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={<Button variant="primary" onClick={() => { setWarned(null); open({ mode: 'create' }); }}>{t('add')}</Button>}
      />
      <Stack gap="section">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {warned && <DirectoryWarnings title={t('savedWithWarnings', { name: warned.name })} warnings={warned.warnings} />}
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

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        title={shown.mode === 'edit' ? t('editTitle') : t('newTitle')}
        submitLabel={shown.mode === 'edit' ? tf('save') : tf('create')}
        onSubmit={save}
        busy={dialog.busy}
        error={dialog.error ?? (types.error ? errorText(types.error) : null)}
        dangerAction={shown.mode === 'edit' ? { label: t('deleteDirectory'), onClick: () => shown.mode === 'edit' && void remove(shown.dir) } : undefined}
        preview={
          <PreviewCard
            media={<IconTile size="md"><FolderTree /></IconTile>}
            title={input.name || <Text as="span" color="fg.muted">{t('namePreview')}</Text>}
            subtitle={type ? typeName(type.type, type.displayName) : undefined}
            items={[
              ...(type && !synced ? [] : [{ label: t('sync'), value: minutes ? t('syncEvery', { count: minutes }) : t('onRequest') }]),
              { label: tc('status'), value: input.isActive ? tc('active') : tc('inactive') },
              { label: t('signIn'), value: input.authenticationEnabled ? t('on') : t('off') },
            ]}
          />
        }
      >
        {/* The form is there while the types load, its fields as their ghosts. */}
        <Loading when={!types.data && !types.error}>
          <DirectoryFields compact mode={shown.mode} types={allTypes} input={input} onChange={setInput} />
        </Loading>
      </FormDialog>
    </>
  );
}
