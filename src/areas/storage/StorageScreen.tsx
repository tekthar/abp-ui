import { useCallback, useEffect, useRef, useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import {
  Button,
  DataTable,
  EMPTY_VALUE,
  HostSlot,
  InlineAlert,
  PageHeader,
  Panel,
  PropertyList,
  StatusPill,
  useApiAction,
  useAbpLocale,
  useApiQuery,
  useAreaRequest,
  useFormatters,
} from '@abpjs/ui';
import { useStorageTexts } from './texts';
import type { StorageCopy, StorageInfo, StorageTest } from './types';

export interface StorageScreenProps {
  /** Told after a change the server has taken: a copy started, and a copy that finished or stopped. */
  onChanged?: () => void | Promise<void>;
  /**
   * A store's name for people. By default the area's text `storeNames.<store>` (a host gives those through
   * `AbpHost.texts.storage`), else the store's own key.
   */
  storeName?: (store: string) => string;
}

/** How long after each answer a running copy is read again. */
const COPY_POLL_MS = 1000;

/** A path or URL set apart from the sentence around it (U+2068 … U+2069), so it keeps its order in right-to-left text. */
const isolate = (text: string) => `\u2068${text}\u2069`;

/**
 * The site's storage (AbpCluster.Storage): where its files are kept (the provider and its place, never a key), what's
 * kept there, a test of each store, and, while a previous storage is being left, the copy from it with its progress.
 * Storage is set in the server's configuration, so nothing here changes where files go. Starting the copy is the one
 * sensitive action: a host's step-up answers its 403 through the host's request. The host's own links go in the
 * `storage.page.actions` slot.
 */
export function StorageScreen({ onChanged, storeName }: StorageScreenProps) {
  const t = useStorageTexts();
  const request = useAreaRequest('storage');
  // The package's root route: the base path itself, with no slash after it.
  const storage = useApiQuery<StorageInfo>('storage', '');
  const action = useApiAction();
  const { number } = useFormatters();
  const { locale } = useAbpLocale();
  const [tests, setTests] = useState<StorageTest[] | null>(null);

  const nameOf = useCallback(
    (store: string) => {
      const key = `storeNames.${store}`;
      const text = t(key);
      return text !== key ? text : (storeName?.(store) ?? store);
    },
    [t, storeName],
  );
  const provider = (p: string) => {
    const key = `providers.${p}`;
    const text = t(key);
    return text !== key ? text : p;
  };

  async function test() {
    // Last time's results go first, so a test that fails never leaves them saying "Works".
    setTests(null);
    const result = await action.run(() => request<StorageTest[]>('/test', { method: 'POST' }));
    if (result) setTests(result);
  }

  const data = storage.data;
  return (
    <Stack gap="section">
      <PageHeader title={t('title')} description={t('description')} actions={<HostSlot name="storage.page.actions" />} />
      <InlineAlert tone="danger">{storage.error ?? action.error}</InlineAlert>
      {(data || storage.loading) && (
        <Panel
          title={t('whereTitle')}
          description={t('whereHint')}
          data-testid="storage-where"
          loading={storage.loading && !data}
          actions={
            <Button size="sm" onClick={() => void test()} loading={action.busy} disabled={!data}>
              {t('test')}
            </Button>
          }
        >
          <Stack gap="4">
            <PropertyList
              loading={storage.loading && !data}
              items={[
                { label: t('provider'), value: data ? provider(data.current.provider) : null },
                {
                  label: t('location'),
                  value: data ? (
                    <Text as="span" fontFamily="mono" dir="ltr">
                      {data.current.location}
                    </Text>
                  ) : null,
                },
                { label: t('stores'), value: data ? new Intl.ListFormat(locale, { type: 'conjunction' }).format(data.stores.map(nameOf)) : null },
              ]}
            />
            {data?.previous && (
              <InlineAlert tone="info" title={t('previousTitle')}>
                {t('previousBody', { provider: provider(data.previous.provider), location: isolate(data.previous.location) })}
              </InlineAlert>
            )}
          </Stack>
        </Panel>
      )}
      {data?.previous && <CopyPanel onChanged={onChanged} />}
      {tests && (
        <Panel title={t('testTitle')} flush data-testid="storage-test">
          <DataTable
            aria-label={t('testTitle')}
            rows={tests}
            getRowId={(r) => r.store}
            columns={[
              { id: 'store', header: t('store'), cell: (r) => nameOf(r.store) },
              {
                id: 'result',
                header: t('result'),
                cell: (r) => (
                  <HStack gap="2">
                    <StatusPill tone={r.ok ? 'success' : 'danger'}>{r.ok ? t('works') : t('fails')}</StatusPill>
                    {r.error && (
                      <Text textStyle="sm" color="fg.muted">
                        {r.error}
                      </Text>
                    )}
                  </HStack>
                ),
              },
              { id: 'time', header: t('time'), numeric: true, cell: (r) => t('ms', { ms: number(Number(r.milliseconds)) }) },
            ]}
          />
        </Panel>
      )}
    </Stack>
  );
}

/**
 * The copy from the previous storage: started by a site admin (the host's step-up, when it asks for one), read again
 * every second while it runs, then its counts and the first problems.
 */
function CopyPanel({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const t = useStorageTexts();
  const request = useAreaRequest('storage');
  const copy = useApiQuery<StorageCopy>('storage', '/copy');
  const action = useApiAction();
  const { number } = useFormatters();
  const running = copy.data?.state === 'running';

  // Read again a second after each answer, never on a fixed beat, so slow answers don't pile up.
  const { reload } = copy;
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      timer = setTimeout(async () => {
        await reload();
        if (!stopped) next();
      }, COPY_POLL_MS);
    };
    next();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [running, reload]);

  // A copy that was running and has now finished or stopped is a change the host may want to hear of.
  const last = useRef<string | undefined>(undefined);
  const state = copy.data?.state;
  useEffect(() => {
    if (last.current === 'running' && state && state !== 'running') void onChanged?.();
    last.current = state;
  }, [state, onChanged]);

  async function start() {
    const started = await action.run(() => request<StorageCopy>('/copy', { method: 'POST' }));
    if (started) {
      copy.setData(started);
      await onChanged?.();
    }
  }

  const c = copy.data;
  const n = (value: number | string) => number(Number(value));
  const stateName = (value: string) => {
    const key = `copyStates.${value}`;
    const text = t(key);
    return text !== key ? text : value;
  };
  return (
    <Panel
      title={t('copyTitle')}
      description={t('copyHint')}
      data-testid="storage-copy"
      loading={copy.loading && !c && !copy.error}
      actions={
        <Button size="sm" onClick={() => void start()} loading={action.busy || running} disabled={running || !c}>
          {t('copyStart')}
        </Button>
      }
    >
      <Stack gap="3">
        <InlineAlert tone="danger">{copy.error ?? action.error}</InlineAlert>
        {c && c.state !== 'idle' && (
          <>
            <HStack gap="2" flexWrap="wrap" role="status" aria-live="polite">
              <StatusPill
                tone={c.state === 'done' ? (Number(c.failed) > 0 || Number(c.missing) > 0 ? 'warning' : 'success') : c.state === 'failed' ? 'danger' : 'info'}
              >
                {stateName(c.state)}
              </StatusPill>
              <Text textStyle="sm">
                {t('copyCounts', { total: Number(c.total), copied: n(c.copied), skipped: n(c.skipped), missing: n(c.missing), failed: n(c.failed) })}
              </Text>
            </HStack>
            {c.problems.length > 0 && (
              <DataTable
                aria-label={t('copyProblems')}
                rows={c.problems.map((p, i) => ({ ...p, row: i }))}
                getRowId={(p) => String(p.row)}
                columns={[
                  {
                    id: 'file',
                    header: t('copyFile'),
                    cell: (p) => (
                      <Text fontFamily="mono" textStyle="sm" dir="ltr">
                        {p.store ? `${p.store}/${p.name}` : p.name || EMPTY_VALUE}
                      </Text>
                    ),
                  },
                  { id: 'problem', header: t('copyProblem'), cell: (p) => <Text textStyle="sm">{p.problem}</Text> },
                ]}
              />
            )}
          </>
        )}
      </Stack>
    </Panel>
  );
}

/** An address under the storage page, which has none: a header that says so, with the way back. */
export function StorageNotFound({ href }: { href: string }) {
  const t = useStorageTexts();
  return <PageHeader breadcrumbs={[{ label: t('title'), href }]} title={t('notFound')} />;
}
