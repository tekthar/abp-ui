import { useMemo, useState, type FormEvent } from 'react';
import { Box, Grid, HStack, Input, List, Stack, Text } from '@chakra-ui/react';
import {
  AppLink,
  Button,
  DataTable,
  errorText,
  Field,
  HostSlot,
  InlineAlert,
  Loading,
  PageHeader,
  Panel,
  PropertyList,
  StatusPill,
  TextSlot,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useFormatters,
  useNavigate,
  type DataTableColumn,
} from '@abpjs/ui';
import { DirectoryForm, DirectoryWarnings } from './DirectoryForm';
import { guardRoutes, type GuardRoutes } from './routes';
import { FlagPill, PassFail, SyncResultPill, SyncStatus } from './status';
import { useGuardNs } from './texts';
import { num, type ConnectionTestResult, type DirectoryDto, type DirectoryInput, type DirectorySettingDefinition, type DirectoryTypeDto, type SyncRunDto, type TestLoginResult, type TestLoginStepName } from './types';

const STEPS: TestLoginStepName[] = ['Connection', 'FindUser', 'Authenticate', 'Precedence'];

/** What the settings form draws while the directory loads, under its fields' ghosts. */
const PLACEHOLDER: DirectoryInput = { name: '', type: '', isActive: true, authenticationEnabled: true, syncIntervalMinutes: 60, settings: {} };

/**
 * A directory: its settings (a secret is never sent back, only kept or replaced), a test of its connection and of one
 * person's sign-in, syncing it now, its sync runs, and the panels its type's connector adds (`guard.directory.panel`).
 */
export function DirectoryScreen({ id, routes = guardRoutes() }: { id: string; routes?: GuardRoutes }) {
  const t = useGuardNs('directoryDetail');
  const tc = useGuardNs('common');
  const tn = useGuardNs('nav');
  const fmt = useFormatters();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const request = useAreaRequest('guard');
  const dirs = useApiQuery<DirectoryDto[]>('guard', '/directories');
  const types = useApiQuery<DirectoryTypeDto[]>('guard', '/directory-types');
  const runs = useApiQuery<SyncRunDto[]>('guard', `/directories/${id}/sync-runs`);
  const action = useApiAction();
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dir = dirs.data?.find((d) => d.id === id);
  const type = types.data?.find((x) => x.type === dir?.type);

  const secretNames = useMemo(() => new Set((type?.settings ?? []).filter((s) => s.secret).map((s) => s.name)), [type]);

  const initial = useMemo<DirectoryInput | null>(() => {
    if (!dir) return null;
    const settings: Record<string, string> = {};
    for (const [k, v] of Object.entries(dir.settings)) settings[k] = secretNames.has(k) || v === '********' ? '' : v;
    return {
      name: dir.name,
      names: dir.names,
      type: dir.type,
      isActive: dir.isActive,
      authenticationEnabled: dir.authenticationEnabled,
      syncIntervalMinutes: dir.syncIntervalMinutes,
      settings,
    };
  }, [dir, secretNames]);

  // When the connector type is not registered (its plugin turned off), still show the stored settings.
  const fallbackSettings = useMemo<DirectorySettingDefinition[]>(
    () =>
      Object.keys(dir?.settings ?? {}).map((name) => ({
        name,
        label: name,
        required: false,
        secret: dir?.settings[name] === '********',
        defaultValue: null,
        help: null,
      })),
    [dir],
  );

  async function save(input: DirectoryInput) {
    setSaved(false);
    const updated = await request<DirectoryDto>(`/directories/${id}`, { method: 'PUT', body: input });
    // What its connector warns of now shows at once, from the save's answer; the list's comes after.
    if (dirs.data) dirs.setData(dirs.data.map((d) => (d.id === updated.id ? updated : d)));
    await dirs.reload();
    setFormKey((k) => k + 1);
    setSaved(true);
  }

  async function testConnection() {
    setTest(null);
    const r = await action.run(() => request<ConnectionTestResult>(`/directories/${id}/test`, { method: 'POST' }));
    if (r) setTest(r);
  }

  async function syncNow() {
    setSyncMsg(null);
    const run = await action.run(() => request<SyncRunDto>(`/directories/${id}/sync`, { method: 'POST' }));
    if (run)
      setSyncMsg(
        run.succeeded === false
          ? { ok: false, text: t('syncFailed', { error: run.error ?? tc('unknownError') }) }
          : { ok: true, text: t('syncCompleted') },
      );
    await Promise.all([runs.reload(), dirs.reload()]);
  }

  async function remove() {
    if (!dir) return;
    const ok = await confirm({ title: t('deleteTitle', { name: dir.name }), description: t('deleteDescription'), confirmLabel: tc('delete'), danger: true });
    if (!ok) return;
    const done = await action.run(async () => {
      await request(`/directories/${id}`, { method: 'DELETE' });
      return true;
    });
    if (done) navigate(routes.directories);
  }

  if (dirs.error) return <InlineAlert tone="danger">{dirs.error}</InlineAlert>;
  // While it loads, the page is drawn as it will be, its data coming.
  const loading = !dirs.data || !types.data;
  if (!loading && (!dir || !initial))
    return (
      <>
        <PageHeader breadcrumbs={[{ label: tn('directories'), href: routes.directories }]} title={t('notFound')} />
        <AppLink href={routes.directories}>{t('back')}</AppLink>
      </>
    );

  const runColumns: DataTableColumn<SyncRunDto>[] = [
    { id: 'started', header: t('started'), nowrap: true, cell: (r) => fmt.dateTime(r.startedAt), skeleton: 'date', skeletonWidth: 17 },
    { id: 'finished', header: t('finished'), nowrap: true, cell: (r) => fmt.dateTime(r.finishedAt), skeleton: 'date', skeletonWidth: 17 },
    { id: 'result', header: t('result'), cell: (r) => <SyncResultPill succeeded={r.succeeded ?? null} />, skeleton: 'pill' },
    { id: 'added', header: t('added'), numeric: true, cell: (r) => r.usersAdded },
    { id: 'updated', header: t('updated'), numeric: true, cell: (r) => r.usersUpdated },
    { id: 'deactivated', header: t('deactivated'), numeric: true, cell: (r) => r.usersDeactivated },
    { id: 'groups', header: tc('groups'), numeric: true, cell: (r) => r.groupsSynced },
    { id: 'memberships', header: t('memberships'), numeric: true, cell: (r) => r.membershipsSynced },
    {
      id: 'error',
      header: t('error'),
      cell: (r) =>
        r.error && (
          <Text as="span" textStyle="caption" color="fg.danger" wordBreak="break-word" maxW="xs" display="block">
            {r.error}
          </Text>
        ),
    },
  ];

  return (
    <Loading when={loading}>
      <PageHeader
        breadcrumbs={[{ label: tn('directories'), href: routes.directories }, { label: dir?.name }]}
        title={dir?.name}
        meta={
          <>
            <Text as="span">
              <TextSlot width={8}>{dir && (dir.typeDisplayName || dir.type)}</TextSlot>
            </Text>
            <Text as="span">
              <TextSlot width={8}>{dir && t('order', { order: dir.order })}</TextSlot>
            </Text>
            {dir ? <FlagPill value={dir.isActive} yes={tc('active')} no={tc('inactive')} /> : <StatusPill />}
            {dir ? <FlagPill value={dir.authenticationEnabled} yes={t('signInEnabled')} no={t('signInDisabled')} /> : <StatusPill />}
            {dir && !dir.connectorAvailable && <StatusPill tone="warning">{t('connectorDisabled')}</StatusPill>}
          </>
        }
        actions={
          <>
            <Button onClick={testConnection} disabled={action.busy || dir?.connectorAvailable === false}>
              {t('testConnection')}
            </Button>
            <Button onClick={syncNow} disabled={action.busy || dir?.connectorAvailable === false}>
              {t('syncNow')}
            </Button>
            {dir?.type !== 'internal' && (
              <Button danger onClick={remove} disabled={action.busy}>
                {tc('delete')}
              </Button>
            )}
          </>
        }
      />

      <Stack gap="section">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {dir && <DirectoryWarnings title={t('warningsTitle')} warnings={dir.warnings} />}
        {test && (
          <InlineAlert tone={test.succeeded ? 'success' : 'warning'} title={test.succeeded ? t('connectionSucceeded') : t('connectionFailed')}>
            {test.message}
            {test.succeeded && test.usersFound != null && test.groupsFound != null && ` ${t('found', { users: num(test.usersFound), groups: num(test.groupsFound) })}`}
          </InlineAlert>
        )}
        {syncMsg && <InlineAlert tone={syncMsg.ok ? 'success' : 'warning'}>{syncMsg.text}</InlineAlert>}

        <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) {sizes.sidePanel}' }} gap="section" alignItems="start">
          <Panel title={t('settings')}>
            <Stack gap="field">
              {saved && <InlineAlert tone="success">{t('saved')}</InlineAlert>}
              {/* Mounted again when the directory comes, so the form starts from it. */}
              <DirectoryForm
                key={loading ? 'loading' : formKey}
                mode="edit"
                types={types.data ?? []}
                initial={initial ?? PLACEHOLDER}
                onSubmit={save}
                fallbackSettings={fallbackSettings}
              />
            </Stack>
          </Panel>
          <Stack gap="section">
            <Panel title={t('summary')}>
              <PropertyList
                size="sm"
                items={[
                  { label: tc('users'), value: dir && fmt.number(num(dir.userCount)) },
                  { label: tc('groups'), value: dir && fmt.number(num(dir.groupCount)) },
                  {
                    label: t('syncInterval'),
                    value: dir && (dir.syncIntervalMinutes ? t('minutes', { count: num(dir.syncIntervalMinutes) }) : t('onDemand')),
                  },
                  { label: t('plugin'), value: dir && (dir.pluginKey ?? t('builtIn')) },
                  { label: t('lastSync'), value: dir && <SyncStatus d={dir} /> },
                ]}
              />
            </Panel>
            <TestLoginPanel directoryId={id} disabled={dir?.connectorAvailable === false} />
          </Stack>
        </Grid>

        {/* A connector's panels are for a directory of its type, so they come with it. */}
        {dir && <HostSlot name="guard.directory.panel" context={{ directoryId: dir.id, directoryType: dir.type }} />}

        <Panel title={t('syncRuns')} flush>
          <DataTable
            aria-label={t('syncRuns')}
            size="sm"
            columns={runColumns}
            rows={runs.data}
            getRowId={(r) => r.id}
            loading={runs.loading}
            error={runs.error}
            empty={t('noRuns')}
            stickyHeader
            maxHeight="md"
          />
        </Panel>
      </Stack>
    </Loading>
  );
}

function TestLoginPanel({ directoryId, disabled }: { directoryId: string; disabled: boolean }) {
  const t = useGuardNs('directoryDetail');
  const tc = useGuardNs('common');
  const ts = useGuardNs('directoryDetail.steps');
  const request = useAreaRequest('guard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<TestLoginResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await request<TestLoginResult>(`/directories/${directoryId}/test-login`, { method: 'POST', body: { username, password } }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const known = new Set<string>(STEPS);
  const rows = result
    ? [
        ...STEPS.map((step) => ({ step: step as string, label: ts(step), r: result.steps.find((s) => s.step === step) })),
        ...result.steps.filter((s) => !known.has(s.step)).map((s) => ({ step: s.step, label: s.step, r: s })),
      ]
    : [];

  return (
    <Panel title={t('testLogin')} description={t('testLoginHint')}>
      <Stack gap="stack">
        <form onSubmit={submit}>
          <Stack gap="stack">
            <Field label={tc('username')} required>
              <Input size="sm" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </Field>
            <Field label={tc('password')} required>
              <Input size="sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <Button type="submit" size="sm" w="full" loading={busy} disabled={disabled}>
              {t('runTest')}
            </Button>
          </Stack>
        </form>
        <InlineAlert tone="danger" size="sm">
          {error}
        </InlineAlert>
        {result && (
          <List.Root as="ol" gap="2" listStyle="none" aria-label={t('testSteps')}>
            {rows.map(({ step, label, r }) => (
              <List.Item key={step} layerStyle="sunken" px="3" py="2">
                <Box w="full">
                  <HStack justify="space-between" gap="2">
                    <Text textStyle="label">{label}</Text>
                    <PassFail ok={r ? r.succeeded : null} />
                  </HStack>
                  {r?.message && (
                    <Text textStyle="caption" color="fg.muted" mt="1">
                      {r.message}
                    </Text>
                  )}
                </Box>
              </List.Item>
            ))}
          </List.Root>
        )}
      </Stack>
    </Panel>
  );
}
