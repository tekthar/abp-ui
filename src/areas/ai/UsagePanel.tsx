import { useMemo, useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { DataTable, EMPTY_VALUE, Panel, SelectField, StatusPill, useFormatters, useNames, type StatusTone } from '@abpjs/ui';
import { useAiTexts } from './texts';
import { num, type AiCall, type AiUsageReport } from './types';
import { usePostQuery } from './usePostQuery';

/** How usage is summed, in the screens' words, and AbpAi's group for each. */
export const USAGE_BY = { project: 'scope', model: 'model', purpose: 'purpose', account: 'account' } as const;
export type UsageBy = keyof typeof USAGE_BY;

/** A call's state as the screens name it: AbpAi's `done` is an answered call. */
const outcomeOf = (state: string) => (state === 'done' ? 'ok' : state);
const OUTCOME_TONES: Record<string, StatusTone> = { ok: 'success', refused: 'warning', failed: 'danger', reserved: 'info' };

function monthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

/** The usage ledger for the site or a scope: summed by what's asked for, this month or an earlier one, with the latest calls. */
export function UsagePanel({ scopeId, by: byOptions }: { scopeId?: string; by: UsageBy[] }) {
  const t = useAiTexts();
  const fmt = useFormatters();
  const [by, setBy] = useState<UsageBy>(byOptions[0]);
  const [month, setMonth] = useState(0);
  const { from, to } = monthRange(month);
  const usage = usePostQuery<AiUsageReport>('/usage', { from, to, scopeId: scopeId ?? null, groupBy: USAGE_BY[by] });
  const recent = usePostQuery<AiCall[]>('/usage/recent', { from, to, scopeId: scopeId ?? null, count: 50 });
  const rows = usage.data?.rows;
  // The server names people (AbpAi 0.8.0); the host names only the ones it didn't.
  const people = useNames('people', useMemo(() => [
    ...(by === 'account' ? (rows ?? []).filter((r) => !r.title && r.key).map((r) => r.key) : []),
    ...(recent.data ?? []).flatMap((c) => [
      ...(c.accountId && !c.accountName ? [c.accountId] : []),
      ...(c.onBehalfOf && !c.onBehalfOfName ? [c.onBehalfOf] : []),
    ]),
  ], [by, rows, recent.data]));
  const nameOf = (id: string | null | undefined, name: string | null | undefined) => name || (id ? people[id] : undefined) || id || EMPTY_VALUE;
  const scopes = useNames('scopes', useMemo(() => (by === 'project' ? (rows ?? []).filter((r) => !r.title && r.key).map((r) => r.key) : []), [by, rows]));
  const months = [0, 1, 2, 3, 4, 5].map((m) => ({ value: String(m), label: fmt.dateTime(monthRange(m).from, { year: 'numeric', month: 'long', timeZone: 'UTC' }) }));
  const total = (rows ?? []).reduce((sum, r) => sum + num(r.cost), 0);
  const money = (v: number | string) => fmt.number(num(v), { maximumFractionDigits: 6 });
  const label = (key: string, title: string | null) =>
    key === '' && by === 'project' ? t('siteCalls') : title || (by === 'account' ? people[key] : by === 'project' ? scopes[key] : undefined) || key;

  return (
    <Stack gap="section">
      <Panel title={t('usageTitle')} description={t('usageTotal', { cost: money(total) })} flush data-testid="ai-usage"
        actions={
          <HStack gap="2">
            <SelectField size="sm" width="auto" value={by} aria-label={t('by')} options={byOptions.map((b) => ({ value: b, label: t(`byOptions.${b}`) }))}
              onChange={(e) => setBy(e.target.value as UsageBy)} />
            <SelectField size="sm" width="auto" value={String(month)} aria-label={t('month')} options={months} onChange={(e) => setMonth(Number(e.target.value))} />
          </HStack>
        }>
        <DataTable
          aria-label={t('usageTitle')}
          rows={rows}
          loading={usage.loading}
          error={usage.error}
          getRowId={(r) => r.key}
          empty={t('noUsage')}
          columns={[
            { id: 'label', header: t(`byOptions.${by}`), cell: (r) => <Text dir="auto">{label(r.key, r.title)}</Text> },
            { id: 'calls', header: t('calls'), numeric: true, cell: (r) => fmt.number(num(r.calls)) },
            { id: 'in', header: t('tokensIn'), numeric: true, cell: (r) => fmt.number(num(r.inputTokens)) },
            { id: 'out', header: t('tokensOut'), numeric: true, cell: (r) => fmt.number(num(r.outputTokens)) },
            { id: 'cost', header: t('cost'), numeric: true, cell: (r) => money(r.cost) },
            { id: 'refused', header: t('refused'), numeric: true, cell: (r) => fmt.number(num(r.refused)) },
            { id: 'failed', header: t('failed'), numeric: true, cell: (r) => fmt.number(num(r.failed)) },
          ]}
        />
      </Panel>
      <Panel title={t('recentTitle')} flush data-testid="ai-recent">
        <DataTable
          aria-label={t('recentTitle')}
          rows={recent.data}
          loading={recent.loading}
          error={recent.error}
          getRowId={(u) => u.id}
          empty={t('noUsage')}
          columns={[
            { id: 'at', header: t('at'), nowrap: true, cell: (u) => fmt.dateTime(u.at, { dateStyle: 'short', timeStyle: 'medium' }) },
            {
              id: 'who',
              header: t('who'),
              // An agent's call is the person's it acted for, the agent beside it.
              cell: (u) => (
                <Stack gap="0">
                  <Text>{u.onBehalfOf ? nameOf(u.onBehalfOf, u.onBehalfOfName) : nameOf(u.accountId, u.accountName)}</Text>
                  {u.onBehalfOf && <Text textStyle="caption" color="fg.muted">{t('callThrough', { name: nameOf(u.accountId, u.accountName) })}</Text>}
                  {u.scope && <Text textStyle="caption" color="fg.muted" dir="ltr">{u.scope}</Text>}
                </Stack>
              ),
            },
            { id: 'purpose', header: t('purpose'), cell: (u) => <Text fontFamily="mono" textStyle="sm" dir="ltr">{u.purpose || EMPTY_VALUE}</Text> },
            { id: 'model', header: t('model'), cell: (u) => <Text fontFamily="mono" textStyle="sm" dir="ltr">{u.model}</Text> },
            { id: 'tokens', header: t('tokens'), numeric: true, cell: (u) => `${fmt.number(num(u.inputTokens))} / ${fmt.number(num(u.outputTokens))}` },
            { id: 'cost', header: t('cost'), numeric: true, cell: (u) => money(u.cost) },
            {
              id: 'outcome',
              header: t('outcome'),
              cell: (u) => (
                <Stack gap="0.5">
                  <StatusPill tone={OUTCOME_TONES[outcomeOf(u.state)] ?? 'neutral'}>{t(`outcomes.${outcomeOf(u.state)}`)}</StatusPill>
                  {u.error && <Text textStyle="caption" color="fg.muted" lineClamp={2} title={u.error}>{u.error}</Text>}
                </Stack>
              ),
            },
          ]}
        />
      </Panel>
    </Stack>
  );
}
