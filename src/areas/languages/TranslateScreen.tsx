import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Grid, HStack, Progress, Stack, Text, Textarea } from '@chakra-ui/react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import {
  boneWidth,
  Button,
  CheckboxField,
  errorText,
  Field,
  FormDialog,
  ghostCss,
  IconButton,
  InlineAlert,
  Loading,
  notify,
  PageHeader,
  Panel,
  SaveBar,
  SearchInput,
  SelectField,
  StatusPill,
  TextBone,
  TextSlot,
  useApiQuery,
  useAreaRequest,
  type StatusTone,
} from '@abpjs/ui';
import { useLanguagesTexts } from './texts';
import type { ImportTextsResult, LanguagesList, SaveTextsResult, TextEntries, TextEntry } from './types';

const PAGE = 50;
const STATUSES = ['all', 'missing', 'outdated', 'translated', 'bundled'] as const;
type StatusFilter = (typeof STATUSES)[number];
const TONES: Record<string, StatusTone> = { missing: 'danger', outdated: 'warning', translated: 'success', bundled: 'info', source: 'neutral' };

const keyOf = (e: { catalog: string; key: string }) => `${e.catalog}:${e.key}`;

export interface TranslateScreenProps {
  /** The language's code, as the address names it. */
  code: string;
  /** The languages' list, for the way back. */
  listHref: string;
  /** Told after every save or import, once the server has it: the host reads its texts again. */
  onChanged?: () => void | Promise<void>;
  /** The catalog of the host's own texts (AbpLanguages' `MainCatalog`), named as `editor.mainCatalog` says: `app` by default. */
  mainCatalog?: string;
  /** The name to show for any other catalog (a plugin's, by its key); its key by default. */
  catalogName?: (catalog: string) => string;
}

/**
 * One language's texts (AbpLanguages): every text of every catalog with its English source, what ships in this
 * language, and the site's own wording, filtered by status and catalog and searched. Changes wait in a save bar until
 * saved; saving shows them on every page at once. A catalog can be exported as a translator's file and imported back.
 * The server refuses a translation that drops one of the source's placeholders.
 */
export function TranslateScreen({ code, listHref, onChanged, mainCatalog = 'app', catalogName }: TranslateScreenProps) {
  const t = useLanguagesTexts();
  const request = useAreaRequest('languages');
  const languages = useApiQuery<LanguagesList>('languages', '/languages?all=true');
  const entries = useApiQuery<TextEntries>('languages', `/texts/${encodeURIComponent(code)}/entries`);
  const language = languages.data?.languages.find((l) => l.code === code);
  const [changes, setChanges] = useState<Map<string, string>>(new Map());
  const [catalog, setCatalog] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const dirty = changes.size > 0;

  // Leaving with unsaved texts asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const all = useMemo(() => entries.data?.entries ?? [], [entries.data]);
  const catalogs = useMemo(() => [...new Set(all.map((e) => e.catalog))], [all]);
  // What the same English is already worded as elsewhere, in this language: offered for a text left empty.
  const memory = useMemo(() => {
    const found = new Map<string, Set<string>>();
    for (const e of all) {
      const text = (changes.get(keyOf(e)) ?? e.value ?? e.bundled ?? '').trim();
      if (!text) continue;
      if (!found.has(e.source)) found.set(e.source, new Set());
      found.get(e.source)!.add(text);
    }
    return found;
  }, [all, changes]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (e) =>
        (catalog === 'all' || e.catalog === catalog) &&
        (status === 'all' || e.status === status) &&
        (!q || e.key.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || (changes.get(keyOf(e)) ?? e.value ?? e.bundled ?? '').toLowerCase().includes(q)),
    );
  }, [all, catalog, status, search, changes]);
  useEffect(() => setPage(0), [catalog, status, search]);

  if (entries.error) return <InlineAlert tone="danger">{entries.error}</InlineAlert>;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const nameOf = (c: string) => (c === mainCatalog ? t('editor.mainCatalog') : catalogName?.(c) ?? c);

  function edit(e: TextEntry, text: string) {
    const next = new Map(changes);
    if (text === (e.value ?? '')) next.delete(keyOf(e));
    else next.set(keyOf(e), text);
    setChanges(next);
  }

  async function reloadAll() {
    await Promise.all([entries.reload(), languages.reload()]);
    await onChanged?.();
  }

  async function save() {
    setBusy(true);
    try {
      const texts = [...changes.entries()].map(([k, value]) => {
        const at = k.indexOf(':');
        return { catalog: k.slice(0, at), key: k.slice(at + 1), value: value.trim() ? value : null };
      });
      const result = await request<SaveTextsResult>(`/texts/${encodeURIComponent(code)}`, { method: 'PUT', body: { texts } });
      setChanges(new Map());
      notify.success(t('editor.saved', { saved: Number(result.saved), removed: Number(result.removed) }));
      await reloadAll();
    } catch (e) {
      notify.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportCatalog(name: string) {
    try {
      const json = await request<Record<string, unknown>>(`/texts/${encodeURIComponent(code)}/export?catalog=${encodeURIComponent(name)}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2) + '\n'], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.${code}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  // While the texts load, the editor is drawn as it will be, its entries coming.
  const loading = !entries.data || !languages.data;
  const total = Number(language?.total ?? entries.data?.total ?? 0);
  const done = Number(language?.translated ?? entries.data?.translated ?? 0);
  const percent = total ? Math.floor((done / total) * 100) : 0;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, s === 'all' ? all.length : all.filter((e) => e.status === s).length]));
  const direction = (language?.direction ?? 'ltr') as 'ltr' | 'rtl';

  return (
    <Loading when={loading}>
      <Stack gap="section" pb={dirty ? '24' : undefined}>
        <PageHeader
          breadcrumbs={[{ label: t('title'), href: listHref }, { label: language?.englishName ?? code }]}
          title={languages.data && t('editor.title', { name: language?.nativeName ?? code })}
          description={t('editor.description')}
          actions={
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload />
              {t('editor.import')}
            </Button>
          }
        />
        <Panel>
          <Stack gap="3">
            <HStack justify="space-between" wrap="wrap" gap="3">
              <Stack gap="1" minW="60" flex="1">
                <Progress.Root value={percent} size="sm" colorPalette={percent === 100 ? 'green' : 'blue'} css={loading ? ghostCss : undefined}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <Text textStyle="caption" color="fg.muted">
                  <TextSlot width={28}>{t('progress', { done, total, percent })}</TextSlot>
                </Text>
              </Stack>
              <HStack gap="1" wrap="wrap">
                {/* Every language has the host's own texts: its button is there, as its ghost, while the rest come. */}
                {(loading ? [mainCatalog] : catalogs).map((c) => (
                  <Button key={c} size="xs" variant="ghost" onClick={() => exportCatalog(c)}>
                    <Download />
                    {t('editor.export', { catalog: nameOf(c) })}
                  </Button>
                ))}
              </HStack>
            </HStack>
            <Grid templateColumns={{ base: '1fr', md: catalogs.length > 1 ? '1fr 1fr 2fr' : '1fr 2fr' }} gap="2">
              {catalogs.length > 1 && (
                <SelectField
                  aria-label={t('editor.catalog')}
                  value={catalog}
                  onChange={(e) => setCatalog(e.target.value)}
                  options={[{ value: 'all', label: t('editor.allCatalogs') }, ...catalogs.map((c) => ({ value: c, label: nameOf(c) }))]}
                />
              )}
              <SelectField
                aria-label={t('editor.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                options={STATUSES.map((s) => ({ value: s, label: `${t(`editor.statuses.${s}`)} (${counts[s]})` }))}
              />
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('editor.search')} aria-label={t('editor.search')} />
            </Grid>
          </Stack>
        </Panel>

        <Stack gap="2" data-testid="text-entries">
          {loading && Array.from({ length: 8 }, (_, i) => <EntryPlaceholder key={i} index={i} />)}
          {!loading && shown.length === 0 && <Text color="fg.muted">{t('editor.nothing')}</Text>}
          {shown.map((e) => (
            <EntryRow
              key={keyOf(e)}
              entry={e}
              catalogs={catalogs.length}
              catalogName={nameOf}
              language={code}
              direction={direction}
              value={changes.get(keyOf(e)) ?? e.value ?? ''}
              changed={changes.has(keyOf(e))}
              memory={code === 'en' ? [] : [...(memory.get(e.source) ?? [])].filter((text) => text !== (changes.get(keyOf(e)) ?? e.value ?? e.bundled ?? '').trim()).slice(0, 3)}
              onChange={(text) => edit(e, text)}
            />
          ))}
        </Stack>

        {pages > 1 && (
          <HStack justify="center" gap="2">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('editor.previous')}</Button>
            <Text textStyle="caption">{t('editor.page', { page: page + 1, pages, count: filtered.length })}</Text>
            <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t('editor.next')}</Button>
          </HStack>
        )}

        <SaveBar open={dirty} count={changes.size} onSave={save} onDiscard={() => setChanges(new Map())} busy={busy} />

        {importing && (
          <ImportDialog
            code={code}
            catalogs={catalogs.length ? catalogs : [mainCatalog]}
            catalogName={nameOf}
            onClose={() => setImporting(false)}
            onImported={async () => {
              setImporting(false);
              await reloadAll();
            }}
          />
        )}
      </Stack>
    </Loading>
  );
}

/** An entry while the texts load: its key, status and English coming, its box as its ghost. */
function EntryPlaceholder({ index }: { index: number }) {
  return (
    <Box borderWidth="1px" borderColor="border.muted" rounded="l2" p="3">
      <HStack justify="space-between" gap="2" mb="2" wrap="wrap">
        <Text fontFamily="mono" textStyle="caption">
          <TextBone width={boneWidth(index, 14, 30)} />
        </Text>
        <StatusPill />
      </HStack>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="3">
        <Text textStyle="body.sm">
          <TextBone width={boneWidth(index, 10, 40)} />
        </Text>
        <Textarea size="sm" rows={1} readOnly tabIndex={-1} aria-hidden="true" css={ghostCss} />
      </Grid>
    </Box>
  );
}

function EntryRow({ entry, catalogs, catalogName, language, direction, value, changed, memory, onChange }: {
  entry: TextEntry;
  catalogs: number;
  catalogName: (catalog: string) => string;
  language: string;
  direction: 'ltr' | 'rtl';
  value: string;
  changed: boolean;
  memory: string[];
  onChange: (text: string) => void;
}) {
  const t = useLanguagesTexts();
  const long = entry.source.length > 60 || entry.source.includes('\n');
  return (
    <Box borderWidth="1px" borderColor={changed ? 'border.emphasized' : 'border.muted'} rounded="l2" p="3" data-key={entry.key} data-status={entry.status}>
      <HStack justify="space-between" gap="2" mb="2" wrap="wrap">
        <Text fontFamily="mono" textStyle="caption" color="fg.muted" dir="ltr">
          {catalogs > 1 ? `${catalogName(entry.catalog)} · ` : ''}
          {entry.key}
        </Text>
        <HStack gap="1">
          <StatusPill tone={changed ? 'warning' : (TONES[entry.status] ?? 'neutral')}>{changed ? t('editor.unsaved') : t(`editor.statuses.${entry.status}`)}</StatusPill>
          {(entry.value != null || changed) && (
            <IconButton size="xs" variant="ghost" aria-label={t('editor.reset')} onClick={() => onChange(changed ? (entry.value ?? '') : '')}>
              <RotateCcw />
            </IconButton>
          )}
        </HStack>
      </HStack>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="3">
        <Text textStyle="body.sm" dir="ltr" lang="en" whiteSpace="pre-wrap">{entry.source}</Text>
        <Textarea
          size="sm"
          rows={long ? 3 : 1}
          autoresize
          dir={direction}
          lang={language}
          value={value}
          placeholder={language === 'en' ? entry.source : (entry.bundled ?? '')}
          aria-label={t('editor.translationOf', { key: entry.key })}
          onChange={(e) => onChange(e.target.value)}
        />
      </Grid>
      {memory.length > 0 && !value.trim() && (
        <HStack gap="1" mt="2" wrap="wrap" data-testid="translation-memory">
          <Text textStyle="caption" color="fg.muted">{t('editor.memory')}</Text>
          {memory.map((text) => (
            <Button key={text} size="xs" variant="ghost" onClick={() => onChange(text)}>
              <span lang={language} dir={direction}>{t('editor.useMemory', { text })}</span>
            </Button>
          ))}
        </HStack>
      )}
      {entry.status === 'outdated' && <Text textStyle="caption" color="fg.warning" mt="1">{t('editor.outdatedHint')}</Text>}
    </Box>
  );
}

/** A translator's file for one catalog (nested JSON, as Export gives it). Texts already translated stay unless replaced. */
function ImportDialog({ code, catalogs, catalogName, onClose, onImported }: {
  code: string;
  catalogs: string[];
  catalogName: (catalog: string) => string;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const t = useLanguagesTexts();
  const request = useAreaRequest('languages');
  const file = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState(catalogs[0]);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const chosen = file.current?.files?.[0];
    if (!chosen) {
      setError(t('editor.chooseFile'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const messages = JSON.parse(await chosen.text()) as unknown;
      const result = await request<ImportTextsResult>(`/texts/${encodeURIComponent(code)}/import`, { method: 'POST', body: { catalog, messages, overwrite } });
      notify.success(
        t('editor.imported', {
          imported: Number(result.imported),
          unchanged: Number(result.unchanged),
          kept: Number(result.kept),
          unknown: result.unknown.length,
          refused: result.refused.length,
        }),
      );
      await onImported();
    } catch (e) {
      setError(e instanceof SyntaxError ? t('editor.notJson') : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={t('editor.import')} submitLabel={t('editor.importSubmit')} onSubmit={submit} busy={busy} error={error}>
      <Text textStyle="body.sm" color="fg.muted">{t('editor.importHint')}</Text>
      {catalogs.length > 1 && (
        <Field label={t('editor.catalog')}>
          <SelectField value={catalog} onChange={(e) => setCatalog(e.target.value)} options={catalogs.map((c) => ({ value: c, label: catalogName(c) }))} />
        </Field>
      )}
      <Field label={t('editor.file')} required>
        <input ref={file} type="file" accept="application/json,.json" />
      </Field>
      <CheckboxField label={t('editor.overwrite')} checked={overwrite} onCheckedChange={setOverwrite} />
    </FormDialog>
  );
}
