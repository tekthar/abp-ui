import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Grid, HStack, Input, Stack, Text, chakra } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
  Button,
  errorText,
  HostSlot,
  IconButton,
  InlineAlert,
  notify,
  PageHeader,
  Panel,
  StatusPill,
  useApiDownload,
  useApiQuery,
  useAreaRequest,
  type HostFile,
} from '@abpjs/ui';
import { useDocumentsTexts } from './texts';
import { IN_PROGRESS, type DocumentInfo, type DocumentPages } from './types';

export interface DocumentViewerProps {
  /** The document. The host keys the viewer by it, so nothing of one document's carries over to the next. */
  documentId: string;
  /** The page it opens at, from 1 (kept within the document's pages). */
  page?: number;
  /** Words to mark on the page: what a citation was about. */
  highlight?: string;
  /** The library's address, for the way back. */
  libraryHref: string;
  /** Told when the person goes to another page, so the host keeps it in its address. */
  onPage?: (page: number) => void;
}

/** How long after each answer a document still being read is read again. */
const POLL_MS = 3000;

/**
 * One document at a page: the text as it was read (what an answer cites), the words asked about marked, with its file
 * beside it for a PDF (the browser's own viewer, at the page) or a picture, and a download for anything else. Pages go
 * back and forth, or straight to a number, always within the document's. The host's own buttons go in
 * `documents.viewer.actions`.
 */
export function DocumentViewer({ documentId, page = 1, highlight, libraryHref, onPage }: DocumentViewerProps) {
  const t = useDocumentsTexts();
  const doc = useApiQuery<DocumentInfo>('documents', `/${documentId}`);
  const d = doc.data;
  const ready = d?.status === 'ready' || (d != null && Number(d.pages) > 0 && d.status !== 'reading');
  const pages = Math.max(1, Number(d?.pages ?? 1));
  const [at, setAt] = useState(() => Math.max(1, Math.floor(page)));
  const current = Math.min(Math.max(1, at), pages);
  useEffect(() => setAt(Math.max(1, Math.floor(page))), [page]);

  // A document still being read is read again a few seconds after each answer until it's done.
  const { reload } = doc;
  const reading = d != null && IN_PROGRESS.includes(d.status);
  useEffect(() => {
    if (!reading) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      timer = setTimeout(async () => {
        await reload();
        if (!stopped) next();
      }, POLL_MS);
    };
    next();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [reading, reload]);

  const text = useApiQuery<DocumentPages>('documents', ready ? `/${documentId}/pages?from=${current}&to=${current}` : null);
  const go = (n: number) => {
    const to = Math.min(Math.max(1, Math.floor(n)), pages);
    setAt(to);
    onPage?.(to);
  };

  if (doc.error && !d) {
    return (
      <Stack gap="section">
        <PageHeader breadcrumbs={[{ label: t('title'), href: libraryHref }]} title={t('viewer.notFound')} />
        <InlineAlert tone="danger">{doc.error}</InlineAlert>
      </Stack>
    );
  }

  const status = d ? t(`statuses.${d.status}`) : '';
  return (
    <Stack gap="section">
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: libraryHref }]}
        title={d?.name ?? t('viewer.loading')}
        actions={
          <HStack gap="2">
            <HostSlot name="documents.viewer.actions" context={{ documentId, page: current }} />
            {d && <DownloadButton document={d} />}
          </HStack>
        }
      />
      {d && !ready && (
        <InlineAlert tone={d.status === 'failed' ? 'danger' : 'info'}>{d.status === 'failed' ? (d.problem ?? status) : t('viewer.notReady', { status })}</InlineAlert>
      )}
      {d && ready && (
        <>
          <PageControls current={current} pages={pages} onGo={go} />
          {d.kind === 'docx' && (
            <Text textStyle="sm" color="fg.muted">
              {t('viewer.wordPages')}
            </Text>
          )}
          <Grid templateColumns={{ base: '1fr', lg: d.kind === 'pdf' || ['png', 'jpeg', 'webp'].includes(d.kind) ? '1fr 1fr' : '1fr' }} gap="4">
            <Panel title={t('viewer.text')} description={t('viewer.textHint')} loading={text.loading && !text.data && !text.error} data-testid="document-text">
              <Stack gap="3">
                <InlineAlert tone="danger">{text.error}</InlineAlert>
                {text.data && <PageText pages={text.data} highlight={highlight} />}
              </Stack>
            </Panel>
            <Original document={d} page={current} />
          </Grid>
        </>
      )}
      {!d && doc.loading && <Panel title={t('viewer.text')} loading />}
    </Stack>
  );
}

/** Back, forth, and straight to a page by its number, always within the document's. */
function PageControls({ current, pages, onGo }: { current: number; pages: number; onGo: (page: number) => void }) {
  const t = useDocumentsTexts();
  const [typed, setTyped] = useState(String(current));
  useEffect(() => setTyped(String(current)), [current]);
  return (
    <HStack gap="2" justify="center" flexWrap="wrap" data-testid="document-pages">
      <IconButton aria-label={t('viewer.previous')} size="sm" variant="secondary" disabled={current <= 1} onClick={() => onGo(current - 1)}>
        <ChevronLeft />
      </IconButton>
      <chakra.form
        display="flex"
        alignItems="center"
        gap="2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(typed);
          if (Number.isFinite(n)) onGo(n);
          else setTyped(String(current));
        }}
      >
        <label>
          <Text as="span" srOnly>
            {t('viewer.goTo')}
          </Text>
          <Input size="sm" w="20" type="number" min={1} max={pages} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={t('viewer.goTo')} />
        </label>
        <Text textStyle="sm" color="fg.muted" aria-live="polite">
          {t('viewer.page', { page: current, pages })}
        </Text>
      </chakra.form>
      <IconButton aria-label={t('viewer.next')} size="sm" variant="secondary" disabled={current >= pages} onClick={() => onGo(current + 1)}>
        <ChevronRight />
      </IconButton>
    </HStack>
  );
}

/** A page's text as read: its Markdown headings as headings, the words asked about marked, each paragraph in its own direction. */
function PageText({ pages, highlight }: { pages: DocumentPages; highlight?: string }) {
  const t = useDocumentsTexts();
  const words = useMemo(() => wordsOf(highlight), [highlight]);
  const page = pages.pages[0];
  if (!page || !page.text.trim()) {
    return (
      <Text color="fg.muted" textStyle="sm">
        {t('viewer.emptyPage')}
      </Text>
    );
  }

  return (
    <Stack gap="3">
      {highlight && words.length > 0 && (
        <Text textStyle="xs" color="fg.muted">
          {t('viewer.highlight', { query: highlight })}
        </Text>
      )}
      {page.fromImage && (
        <Text textStyle="xs" color="fg.muted">
          {t('viewer.fromImage')}
        </Text>
      )}
      {page.text.split(/\n{2,}/).map((block, i) => {
        const heading = /^(#{1,6})\s+(.*)$/.exec(block.trim());
        return heading ? (
          <Text key={i} dir="auto" fontWeight="semibold" textStyle={heading[1].length <= 1 ? 'lg' : 'md'}>
            <Marked text={heading[2]} words={words} />
          </Text>
        ) : (
          <Text key={i} dir="auto" whiteSpace="pre-wrap" textStyle="sm">
            <Marked text={block} words={words} />
          </Text>
        );
      })}
    </Stack>
  );
}

/** The words of a highlight worth marking: three letters or more, or numbers. */
function wordsOf(highlight?: string): string[] {
  return [...new Set((highlight ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 || /\p{N}/u.test(w)))].slice(0, 20);
}

function Marked({ text, words }: { text: string; words: string[] }): ReactNode {
  if (!words.length) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let at = 0;
  while (at < text.length) {
    let next = -1;
    let length = 0;
    for (const w of words) {
      const i = lower.indexOf(w, at);
      if (i >= 0 && (next < 0 || i < next)) {
        next = i;
        length = w.length;
      }
    }

    if (next < 0) break;
    if (next > at) parts.push(text.slice(at, next));
    parts.push(
      <chakra.mark key={next} bg="accent.muted" color="inherit" rounded="xs">
        {text.slice(next, next + length)}
      </chakra.mark>,
    );
    at = next + length;
  }

  if (at < text.length) parts.push(text.slice(at));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

/**
 * The file itself, for a PDF (the browser's own viewer, at the page) or a picture, from the package's route through the
 * host's request as a local copy (so the host's sign-in and headers hold); anything else is only downloaded.
 */
function Original({ document: d, page }: { document: DocumentInfo; page: number }) {
  const t = useDocumentsTexts();
  const request = useAreaRequest('documents');
  const shown = d.kind === 'pdf' || ['png', 'jpeg', 'webp'].includes(d.kind);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    let made: string | null = null;
    let stopped = false;
    request<HostFile>(`/${d.id}/file`, { as: 'file' })
      .then((file) => {
        if (stopped) return;
        made = URL.createObjectURL(file.blob);
        setUrl(made);
      })
      .catch((e) => !stopped && setError(errorText(e)));
    return () => {
      stopped = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [shown, d.id, request]);

  if (!shown) {
    return (
      <Text textStyle="sm" color="fg.muted">
        {t('viewer.noPreview', { kind: t(`kinds.${d.kind}`) })}
      </Text>
    );
  }

  return (
    <Panel title={t('viewer.original')} loading={!url && !error} data-testid="document-original">
      <InlineAlert tone="danger">{error}</InlineAlert>
      {url && d.kind === 'pdf' && (
        // A new frame for each page, so the browser's viewer opens at it.
        <chakra.iframe key={page} src={`${url}#page=${page}`} title={d.name} w="full" h="70vh" borderWidth="1px" borderColor="border.muted" rounded="l2" />
      )}
      {url && d.kind !== 'pdf' && <chakra.img src={url} alt={d.name} maxW="full" rounded="l2" />}
    </Panel>
  );
}

function DownloadButton({ document: d }: { document: DocumentInfo }) {
  const t = useDocumentsTexts();
  const download = useApiDownload('documents');
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await download(`/${d.id}/file?download=true`, {}, d.name);
        } catch (e) {
          notify.error(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download />
      {t('download')}
    </Button>
  );
}

/** A document's state as a pill, for a host that lists documents its own way. */
export function DocumentStatusPill({ status }: { status: string }) {
  const t = useDocumentsTexts();
  const key = `statuses.${status}`;
  const text = t(key);
  const tone = status === 'ready' ? 'success' : status === 'failed' ? 'danger' : status === 'waiting' ? 'warning' : 'info';
  return <StatusPill tone={tone}>{text !== key ? text : status}</StatusPill>;
}
