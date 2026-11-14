import { useState, type FormEvent } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Button, DataTable, Field, InlineAlert, Panel, errorText, useApiAction, useApiDownload, useApiQuery, useAreaRequest, useConfirm, useFormatters } from '@abpjs/ui';
import { useAiTexts } from './texts';
import { num, type AiExport } from './types';

/** A day as the date field holds it (yyyy-mm-dd, UTC). */
const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Exports of AI calls for support: a period's calls, up to 31 days, one line of JSON each (gzipped), with their prompts
 * and replies only where the site keeps them. Asked for with the password again (the host's step-up); each export and
 * download is in the security log. Kept a week.
 */
export function ExportsPanel({ scopeId }: { scopeId?: string }) {
  const t = useAiTexts();
  const fmt = useFormatters();
  const confirm = useConfirm();
  const request = useAreaRequest('ai');
  const downloadFile = useApiDownload('ai');
  const exports = useApiQuery<AiExport[]>('ai', '/exports');
  const action = useApiAction();
  const today = new Date();
  const [from, setFrom] = useState(day(new Date(today.getTime() - 86_400_000)));
  const [to, setTo] = useState(day(today));
  const [fetching, setFetching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  const valid = Number.isFinite(days) && days >= 1 && days <= 31;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    // The last day is whole: up to the next midnight (UTC).
    const end = new Date(Date.parse(to) + 86_400_000).toISOString();
    const made = await action.run(() => request<AiExport>('/exports', { method: 'POST', body: { from: `${from}T00:00:00Z`, to: end, scopeId: scopeId ?? null } }));
    if (made) await exports.reload();
  }

  async function download(x: AiExport) {
    setFetching(x.id);
    setError(null);
    try {
      await downloadFile(`/exports/${encodeURIComponent(x.id)}/file`, { method: 'POST' }, `ai-calls-${day(new Date(x.from))}.jsonl.gz`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setFetching(null);
    }
  }

  async function remove(x: AiExport) {
    if (!(await confirm({ title: t('exportDeleteTitle'), description: t('exportDeleteHint'), confirmLabel: t('exportDelete'), danger: true }))) return;
    const done = await action.run(async () => {
      await request(`/exports/${encodeURIComponent(x.id)}`, { method: 'DELETE' });
      return true;
    });
    if (done) await exports.reload();
  }

  const period = (x: AiExport) =>
    `${fmt.dateTime(x.from, { dateStyle: 'medium', timeZone: 'UTC' })} – ${fmt.dateTime(new Date(Date.parse(x.to) - 1).toISOString(), { dateStyle: 'medium', timeZone: 'UTC' })}`;

  return (
    <Panel title={t('exportsTitle')} description={t('exportsHint')} flush data-testid="ai-exports">
      <Stack gap="4" px="5" py="4" borderBottomWidth="1px">
        <form onSubmit={create}>
          <HStack gap="3" align="end" flexWrap="wrap">
            {/* A field is as wide as its row unless told otherwise: both days and the button share one line. */}
            <Field label={t('exportFrom')} w="11rem">
              <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t('exportTo')} w="11rem">
              <Input type="date" value={to} min={from} max={day(today)} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Button type="submit" disabled={!valid} loading={action.busy}>{t('exportCreate')}</Button>
          </HStack>
        </form>
        {!valid && <Text textStyle="sm" color="fg.muted">{t('exportPeriodHint')}</Text>}
        {(action.error || error) && <InlineAlert tone="danger">{action.error ?? error}</InlineAlert>}
      </Stack>
      <DataTable
        aria-label={t('exportsTitle')}
        rows={exports.data}
        loading={exports.loading}
        error={exports.error}
        getRowId={(x) => x.id}
        empty={t('noExports')}
        columns={[
          { id: 'period', header: t('exportPeriod'), cell: (x) => <Text>{period(x)}</Text> },
          {
            id: 'calls',
            header: t('calls'),
            numeric: true,
            cell: (x) => (
              <Stack gap="0" align="end">
                <Text>{fmt.number(num(x.calls))}</Text>
                <Text textStyle="caption" color="fg.muted">{t('exportPrompts', { count: num(x.prompts) })}</Text>
                {x.truncated && <Text textStyle="caption" color="fg.warning">{t('exportTruncated')}</Text>}
              </Stack>
            ),
          },
          { id: 'made', header: t('exportMade'), nowrap: true, cell: (x) => fmt.dateTime(x.at, { dateStyle: 'short', timeStyle: 'short' }) },
          { id: 'expires', header: t('exportExpires'), nowrap: true, cell: (x) => fmt.dateTime(x.expiresAt, { dateStyle: 'short', timeStyle: 'short' }) },
          {
            id: 'actions',
            header: '',
            cell: (x) => (
              <HStack gap="2" justify="end">
                <Button size="sm" variant="secondary" loading={fetching === x.id} onClick={() => download(x)}>{t('exportDownload')}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(x)}>{t('exportDelete')}</Button>
              </HStack>
            ),
          },
        ]}
      />
    </Panel>
  );
}
