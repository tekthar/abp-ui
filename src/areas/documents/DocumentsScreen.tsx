import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { HStack, Input, Stack, Text, VisuallyHidden } from '@chakra-ui/react';
import { Upload } from 'lucide-react';
import {
  AppLink,
  Button,
  DataTable,
  EmptyState,
  errorText,
  Field,
  FileDropArea,
  FormDialog,
  HostSlot,
  InlineAlert,
  notify,
  PageHeader,
  Pagination,
  Panel,
  RowMenu,
  SearchInput,
  SelectField,
  StatusPill,
  UploadList,
  useApiDownload,
  useApiQuery,
  useAreaRequest,
  useCan,
  useConfirm,
  useFormatters,
  useMe,
  useNavigate,
  type DataTableColumn,
  type StatusTone,
  type UploadRow,
} from '@abpjs/ui';
import { useDocumentsTexts } from './texts';
import { pollDelay, refusalOf } from './rules';
import type { DocumentInfo, DocumentsList, DocumentsSettings } from './types';

export interface DocumentsScreenProps {
  /** The scope (a project) whose documents these are. The host keys the screen by it. */
  scopeId: string;
  /** Where the viewer opens a document, at a page when given. */
  viewerHref: (documentId: string, page?: number) => string;
  /** The page's title: the area's "Documents" by default. */
  title?: string;
  /** Told after a change the server has taken: a file added, deleted, renamed, reclassified or read again. */
  onChanged?: () => void | Promise<void>;
}

const PAGE_SIZE = 25;
/** How long after the last keystroke a search of names is asked. */
const SEARCH_MS = 300;

type QueuedFile = { id: string; file: File; dataClass: string; state: UploadRow['state']; fraction: number; error?: string };

const STATUS_TONES: Record<string, StatusTone> = {
  queued: 'neutral',
  reading: 'info',
  indexing: 'info',
  ready: 'success',
  waiting: 'warning',
  failed: 'danger',
};

/**
 * A scope's documents (AbpDocuments): added by dropping files or choosing them (each checked by the server by its bytes,
 * with its class), how each one's reading stands (read again every few seconds while any is on its way, and each change
 * said aloud), their names searched, and for each one: open it in the viewer, download it, read it again, rename it,
 * change its class (the host's step-up when it asks) or delete it. The host's own links go in `documents.list.actions`.
 */
export function DocumentsScreen({ scopeId, viewerHref, title, onChanged }: DocumentsScreenProps) {
  const t = useDocumentsTexts();
  const can = useCan();
  const me = useMe();
  const mayAdd = can('documents.scope.add', scopeId);
  const mayManage = can('documents.scope.manage', scopeId);
  const settings = useApiQuery<DocumentsSettings>('documents', '/settings');

  const [search, setSearch] = useState('');
  const [asked, setAsked] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setAsked(search.trim());
      setPage(1);
    }, SEARCH_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const path = `?scopeId=${encodeURIComponent(scopeId)}&skip=${(page - 1) * PAGE_SIZE}&take=${PAGE_SIZE}${asked ? `&search=${encodeURIComponent(asked)}` : ''}`;
  const list = useApiQuery<DocumentsList>('documents', path);
  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const total = Number(list.data?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A delete, or a search, can leave fewer documents than the page shown: the last page there is.
  useEffect(() => {
    if (list.data && page > pages) setPage(pages);
  }, [list.data, page, pages]);

  // Read again a while after each answer while any document is on its way, never on a fixed beat: every few seconds
  // while one is being read, at the soonest retry while some only wait on a limit.
  const { reload } = list;
  const delay = pollDelay(items);
  useEffect(() => {
    if (delay == null) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      timer = setTimeout(async () => {
        await reload();
        if (!stopped) next();
      }, delay);
    };
    next();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [delay, reload]);

  const announce = useStatusAnnouncements(items);
  const uploads = useUploads(
    scopeId,
    async () => {
      await reload();
      await onChanged?.();
    },
    settings.data,
  );
  const go = useLeaveGuard(uploads.inFlight);

  const changed = useCallback(async () => {
    await reload();
    await onChanged?.();
  }, [reload, onChanged]);

  const defaultClass = settings.data?.defaultDataClass ?? 'internal';
  const empty = list.data && total === 0;
  return (
    <Stack gap="section">
      <PageHeader title={title ?? t('title')} description={t('description')} actions={<HostSlot name="documents.list.actions" context={{ scopeId }} />} />
      <InlineAlert tone="danger">{settings.error}</InlineAlert>
      {mayAdd && <AddFiles settings={settings.data} settingsLoading={settings.loading} defaultClass={defaultClass} mayManage={mayManage} onFiles={uploads.add} />}
      {uploads.rows.length > 0 && (
        <UploadList
          rows={uploads.rows}
          summary={uploads.total > 0 ? t('uploadSummary', { done: uploads.done, total: uploads.total }) : undefined}
          fraction={uploads.total > 0 ? uploads.fraction : undefined}
          announce={uploads.total > 0 ? t('uploadAnnounce', { done: uploads.done, total: uploads.total }) : undefined}
          labels={{ cancel: (name) => t('uploadCancel', { name }), retry: (name) => t('uploadRetry', { name }), dismiss: (name) => t('uploadDismiss', { name }) }}
          onCancel={uploads.cancel}
          onRetry={uploads.retry}
          onDismiss={uploads.dismiss}
        />
      )}
      <Panel
        title={t('title')}
        flush
        data-testid="documents-list"
        loading={list.loading && !list.data && !list.error}
        actions={<SearchInput size="sm" maxW="64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} aria-label={t('searchLabel')} />}
      >
        <Stack gap="0">
          <InlineAlert tone="danger">{list.error}</InlineAlert>
          {empty ? (
            asked ? (
              <EmptyState kind="no-results" title={t('noMatches', { search: asked })} />
            ) : (
              <EmptyState kind="first-use" title={t('emptyTitle')} description={t('emptyBody')} />
            )
          ) : (
            list.data && (
              <DocumentsTable
                items={items}
                scopeId={scopeId}
                viewerHref={viewerHref}
                mayManage={mayManage}
                me={me?.accountId}
                classes={settings.data?.dataClasses ?? []}
                onChanged={changed}
                go={go}
              />
            )
          )}
          {pages > 1 && (
            <HStack justify="center" p="3">
              <Pagination
                page={page}
                pages={pages}
                onPage={setPage}
                label={t('paging')}
                previous={t('previous')}
                next={t('next')}
                pageLabel={(n) => t('pageNumber', { page: n })}
              />
            </HStack>
          )}
        </Stack>
      </Panel>
      <VisuallyHidden role="status" aria-live="polite">
        {announce}
      </VisuallyHidden>
    </Stack>
  );
}

/** The files' drop area, with the labelled input behind its button and the class new files get. */
function AddFiles({ settings, settingsLoading, defaultClass, mayManage, onFiles }: {
  settings?: DocumentsSettings;
  settingsLoading: boolean;
  defaultClass: string;
  mayManage: boolean;
  onFiles: (files: File[], dataClass: string) => void;
}) {
  const t = useDocumentsTexts();
  const input = useRef<HTMLInputElement>(null);
  const [dataClass, setDataClass] = useState<string | null>(null);
  const [awake, setAwake] = useState(false);
  const [over, setOver] = useState(false);
  const classes = settings?.dataClasses ?? [];
  const chosen = dataClass ?? defaultClass;
  const at = classes.indexOf(defaultClass);
  const mb = settings ? Math.round(Number(settings.maxBytes) / (1024 * 1024)) : 25;

  // Files dragged anywhere over the page wake the area.
  useEffect(() => {
    let depth = 0;
    const enter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      setAwake(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setAwake(false);
    };
    const end = () => {
      depth = 0;
      setAwake(false);
      setOver(false);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', end);
    window.addEventListener('dragend', end);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', end);
      window.removeEventListener('dragend', end);
    };
  }, []);

  function chosenFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length) onFiles(files, chosen);
  }

  function dropped(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    setAwake(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files, chosen);
  }

  return (
    <FileDropArea
      awake={awake}
      over={over}
      hint={t('dropHint')}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={dropped}
      data-testid="documents-add"
    >
      <HStack gap="4" align="end" flexWrap="wrap">
        <Stack gap="1" flex="1" minW="56">
          <Button size="sm" alignSelf="start" onClick={() => input.current?.click()}>
            <Upload />
            {t('add')}
          </Button>
          <VisuallyHidden>
            <label>
              {t('fileInput')}
              <Input ref={input} type="file" multiple accept={(settings?.extensions ?? []).join(',')} onChange={chosenFiles} tabIndex={-1} />
            </label>
          </VisuallyHidden>
          <Text textStyle="xs" color="fg.muted">
            {t('addHint', { mb })}
          </Text>
        </Stack>
        <Field label={t('dataClass')} helperText={mayManage || at <= 0 ? t('dataClassHint') : t('dataClassManagers', { class: className(t, defaultClass) })} maxW="64">
          <SelectField
            size="sm"
            value={chosen}
            onChange={(e) => setDataClass(e.target.value)}
            options={classes.map((c, i) => ({ value: c, label: className(t, c), disabled: !mayManage && at >= 0 && i < at }))}
            loading={settingsLoading && !settings}
          />
        </Field>
      </HStack>
    </FileDropArea>
  );
}

const className = (t: ReturnType<typeof useDocumentsTexts>, c: string) => {
  const key = `classes.${c}`;
  const text = t(key);
  return text !== key ? text : c;
};

/** The documents as a table: each one's name (to the viewer), kind, pages, class, reading, when it was added, and its menu. */
function DocumentsTable({ items, scopeId, viewerHref, mayManage, me, classes, onChanged, go }: {
  items: DocumentInfo[];
  scopeId: string;
  viewerHref: (documentId: string, page?: number) => string;
  mayManage: boolean;
  me?: string;
  classes: string[];
  onChanged: () => Promise<void>;
  /** The way out to another page, through the leave guard while files are on their way. */
  go: (href: string) => void;
}) {
  const t = useDocumentsTexts();
  const { dateTime } = useFormatters();
  const request = useAreaRequest('documents');
  const download = useApiDownload('documents');
  const confirm = useConfirm();
  const [renaming, setRenaming] = useState<DocumentInfo | null>(null);
  const [classifying, setClassifying] = useState<DocumentInfo | null>(null);

  const kind = (k: string) => {
    const key = `kinds.${k}`;
    const text = t(key);
    return text !== key ? text : k;
  };
  const status = (s: string) => {
    const key = `statuses.${s}`;
    const text = t(key);
    return text !== key ? text : s;
  };

  async function act(fn: () => Promise<unknown>, done?: string) {
    try {
      await fn();
      if (done) notify.success(done);
      await onChanged();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  async function remove(d: DocumentInfo) {
    const sure = await confirm({ title: t('deleteTitle', { name: d.name }), description: t('deleteDescription'), confirmLabel: t('delete'), danger: true });
    if (sure) await act(() => request(`/${d.id}`, { method: 'DELETE' }), t('deleted', { name: d.name }));
  }

  const columns: DataTableColumn<DocumentInfo>[] = [
    {
      id: 'name',
      header: t('columns.name'),
      cell: (d) => (
        <Stack gap="0.5">
          <AppLink href={viewerHref(d.id)} fontWeight="medium">
            {d.name}
          </AppLink>
          {d.problem && (
            <Text textStyle="xs" color={d.status === 'failed' ? 'fg.error' : 'fg.muted'}>
              {d.problem}
            </Text>
          )}
          {d.status === 'waiting' && d.retryAt && (
            <Text textStyle="xs" color="fg.muted">
              {t('retryAt', { time: dateTime(d.retryAt, { timeStyle: 'short' }) })}
            </Text>
          )}
        </Stack>
      ),
    },
    { id: 'kind', header: t('columns.kind'), nowrap: true, cell: (d) => kind(d.kind) },
    {
      id: 'pages',
      header: t('columns.pages'),
      nowrap: true,
      cell: (d) =>
        d.status === 'ready' || Number(d.pages) > 0 ? (
          <Stack gap="0">
            <Text>{t('pagesCount', { count: Number(d.pages) })}</Text>
            {Number(d.pagesFromImages) > 0 && (
              <Text textStyle="xs" color="fg.muted">
                {t('fromImages', { count: Number(d.pagesFromImages) })}
              </Text>
            )}
          </Stack>
        ) : null,
    },
    { id: 'class', header: t('columns.class'), nowrap: true, cell: (d) => <StatusPill tone="neutral">{className(t, d.dataClass)}</StatusPill> },
    { id: 'status', header: t('columns.status'), nowrap: true, cell: (d) => <StatusPill tone={STATUS_TONES[d.status] ?? 'neutral'}>{status(d.status)}</StatusPill> },
    { id: 'added', header: t('columns.added'), nowrap: true, cell: (d) => dateTime(d.addedAt, { dateStyle: 'medium' }) },
    {
      id: 'menu',
      header: <VisuallyHidden>{t('columns.actions')}</VisuallyHidden>,
      align: 'end',
      cell: (d) => {
        const mayDelete = mayManage || (!!me && d.addedBy === me);
        return (
          <RowMenu
            label={t('rowMenu', { name: d.name })}
            items={[
              { id: 'open', label: t('open'), onSelect: () => go(viewerHref(d.id)) },
              { id: 'download', label: t('download'), onSelect: () => void download(`/${d.id}/file?download=true`, {}, d.name).catch((e) => notify.error(errorText(e))) },
              ...(mayManage
                ? [
                    { separator: true as const },
                    { id: 'reindex', label: t('reindex'), onSelect: () => void act(() => request(`/${d.id}/reindex`, { method: 'POST' }), t('reindexed', { name: d.name })) },
                    { id: 'rename', label: t('rename'), onSelect: () => setRenaming(d) },
                    { id: 'class', label: t('changeClass'), onSelect: () => setClassifying(d) },
                  ]
                : []),
              ...(mayDelete ? [{ separator: true as const }, { id: 'delete', label: t('delete'), danger: true, onSelect: () => void remove(d) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <DataTable aria-label={t('title')} rows={items} getRowId={(d) => d.id} columns={columns} />
      {renaming && (
        <RenameDialog key={renaming.id} document={renaming} onClose={() => setRenaming(null)} onSaved={onChanged} />
      )}
      {classifying && (
        <ClassDialog key={classifying.id} document={classifying} classes={classes} scopeId={scopeId} onClose={() => setClassifying(null)} onSaved={onChanged} />
      )}
    </>
  );
}

/** A document's new name, kept as typed while the list beside it is read again. */
function RenameDialog({ document, onClose, onSaved }: { document: DocumentInfo; onClose: () => void; onSaved: () => Promise<void> }) {
  const t = useDocumentsTexts();
  const request = useAreaRequest('documents');
  const [name, setName] = useState(document.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await request(`/${document.id}`, { method: 'PUT', body: { name: name.trim() } });
      await onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('renameTitle', { name: document.name })}
      submitLabel={t('save')}
      onSubmit={save}
      busy={busy}
      error={error}
      submitDisabled={!name.trim() || name.trim() === document.name}
    >
      <Field label={t('name')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
      </Field>
    </FormDialog>
  );
}

/** A document's class: which models may receive its text. The host's step-up answers a 403 that asks for one. */
function ClassDialog({ document, classes, onClose, onSaved }: {
  document: DocumentInfo;
  classes: string[];
  scopeId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const t = useDocumentsTexts();
  const request = useAreaRequest('documents');
  const [dataClass, setDataClass] = useState(document.dataClass);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await request(`/${document.id}/class`, { method: 'PUT', body: { dataClass } });
      await onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('classTitle', { name: document.name })}
      description={t('classHint')}
      submitLabel={t('save')}
      onSubmit={save}
      busy={busy}
      error={error}
      submitDisabled={dataClass === document.dataClass}
    >
      <Field label={t('dataClass')}>
        <SelectField value={dataClass} onChange={(e) => setDataClass(e.target.value)} options={classes.map((c) => ({ value: c, label: className(t, c) }))} />
      </Field>
    </FormDialog>
  );
}

/**
 * Said aloud when a document's reading changes in the list shown (ready, or couldn't be read), so a person who added
 * files hears them land without looking.
 */
function useStatusAnnouncements(items: DocumentInfo[]): string {
  const t = useDocumentsTexts();
  const last = useRef(new Map<string, string>());
  const [said, setSaid] = useState('');
  useEffect(() => {
    const lines: string[] = [];
    for (const d of items) {
      const before = last.current.get(d.id);
      if (before && before !== d.status) {
        if (d.status === 'ready') lines.push(t('announceReady', { name: d.name }));
        if (d.status === 'failed') lines.push(t('announceFailed', { name: d.name }));
      }
      last.current.set(d.id, d.status);
    }
    if (lines.length) setSaid(lines.join(' '));
  }, [items, t]);
  return said;
}

/**
 * The files being added: one at a time, each with its class, stopped, tried again or dismissed (one being sent is
 * stopped first). A file the server would refuse (empty, too big, a kind it doesn't read) is refused here, before it's
 * sent. Leaving the page stops what's on its way; asking first is the leave guard's.
 */
function useUploads(scopeId: string, onAdded: () => Promise<void>, settings?: DocumentsSettings) {
  const t = useDocumentsTexts();
  const request = useAreaRequest('documents');
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const running = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(queue);
  // Each file being sent, by its id: stopping it aborts its request.
  const controllers = useRef(new Map<string, AbortController>());
  // What's current when a file lands: the list as the person now filters and pages it, not as it was when the file began.
  const added = useRef(onAdded);
  added.current = onAdded;
  const limits = useRef(settings);
  limits.current = settings;

  const set = useCallback((next: QueuedFile[]) => {
    latest.current = next;
    if (mounted.current) setQueue(next);
  }, []);
  const update = useCallback((id: string, change: Partial<QueuedFile>) => set(latest.current.map((u) => (u.id === id ? { ...u, ...change } : u))), [set]);

  // Leaving the page (or the host keying it afresh) stops every file on its way, and the queue with them.
  useEffect(() => {
    mounted.current = true;
    const sending = controllers.current;
    return () => {
      mounted.current = false;
      for (const controller of sending.values()) controller.abort();
      sending.clear();
    };
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (mounted.current) {
        const next = latest.current.find((u) => u.state === 'waiting');
        if (!next) break;
        const controller = new AbortController();
        controllers.current.set(next.id, controller);
        update(next.id, { state: 'sending', fraction: 0 });
        const form = new FormData();
        form.append('file', next.file, next.file.name);
        form.append('scopeId', scopeId);
        form.append('dataClass', next.dataClass);
        try {
          await request('', { method: 'POST', body: form, signal: controller.signal });
          update(next.id, { state: 'done', fraction: 1 });
          if (mounted.current) await added.current();
        } catch (e) {
          const stopped = controller.signal.aborted;
          update(next.id, { state: stopped ? 'cancelled' : 'failed', error: stopped ? undefined : errorText(e) });
        } finally {
          controllers.current.delete(next.id);
        }
      }
    } finally {
      running.current = false;
    }
  }, [request, scopeId, update]);

  const add = useCallback(
    (files: File[], dataClass: string) => {
      const s = limits.current;
      const mb = s ? Math.round(Number(s.maxBytes) / (1024 * 1024)) : 0;
      const queued: QueuedFile[] = files.map((file) => {
        const why = refusalOf(file, s?.maxBytes, s?.extensions);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          dataClass,
          state: why ? 'refused' : 'waiting',
          fraction: 0,
          error: why === 'tooBig' ? t('tooBig', { mb }) : why === 'kind' ? t('notAKind') : why === 'empty' ? t('emptyFile') : undefined,
        };
      });
      set([...latest.current, ...queued]);
      void pump();
    },
    [pump, set, t],
  );

  const stop = (id: string) => {
    const controller = controllers.current.get(id);
    if (controller) controller.abort();
    else update(id, { state: 'cancelled' });
  };

  const inFlight = queue.filter((u) => u.state === 'waiting' || u.state === 'sending').length;
  const rows: UploadRow[] = queue.map((u) => ({
    id: u.id,
    name: u.file.name,
    state: u.state,
    fraction: u.fraction,
    detail: u.error ?? (u.file.size < 100 * 1024 ? t('uploadSizeKb', { size: Math.max(1, Math.round(u.file.size / 1024)) }) : t('uploadSize', { size: (u.file.size / (1024 * 1024)).toFixed(1) })),
    status: u.state === 'waiting' ? t('uploadWaiting') : u.state === 'sending' ? t('uploadSending') : u.state === 'done' ? t('uploadDone') : undefined,
  }));
  const counted = queue.filter((u) => u.state !== 'refused' && u.state !== 'cancelled');
  return {
    rows,
    inFlight,
    done: counted.filter((u) => u.state === 'done').length,
    total: counted.length,
    fraction: counted.length ? counted.reduce((sum, u) => sum + (u.state === 'done' ? 1 : u.fraction), 0) / counted.length : 0,
    add,
    cancel: stop,
    retry: (id: string) => {
      set(latest.current.map((u) => (u.id === id ? { ...u, state: 'waiting', fraction: 0, error: undefined } : u)));
      void pump();
    },
    dismiss: (id: string) => {
      controllers.current.get(id)?.abort();
      set(latest.current.filter((u) => u.id !== id));
    },
  };
}

/**
 * Leaving while files are on their way asks first: closing or reloading the tab (the browser's own question), following
 * a link inside the app, and the screen's own ways out (`go`), each then waiting for the person's answer. Leaving stops
 * them (`useUploads`).
 */
function useLeaveGuard(inFlight: number): (href: string) => void {
  const t = useDocumentsTexts();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const count = useRef(inFlight);
  count.current = inFlight;
  const ask = useCallback(
    (href: string) => {
      if (!count.current) {
        navigate(href);
        return;
      }

      void confirm({ title: t('leaveTitle'), description: t('leaveDescription', { count: count.current }), confirmLabel: t('leave'), danger: true }).then((leave) => {
        if (leave) navigate(href);
      });
    },
    [t, confirm, navigate],
  );
  useEffect(() => {
    if (!inFlight) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const to = new URL(link.href, window.location.href);
      const here = window.location;
      if (to.origin !== here.origin || (to.pathname === here.pathname && to.search === here.search)) return;
      // Ahead of the host's router, which listens further down: the link waits for the answer.
      e.preventDefault();
      e.stopPropagation();
      ask(`${to.pathname}${to.search}${to.hash}`);
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', click, true);
    };
  }, [inFlight, ask]);
  return ask;
}
