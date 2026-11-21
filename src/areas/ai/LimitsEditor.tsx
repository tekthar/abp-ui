import { useState } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { AddButton, Button, Field, IconButton, InlineAlert, SelectField, useFormatters, type HostRequest } from '@abpjs/ui';
import { useAiTexts } from './texts';
import { num, scopeQuery, type AiLimit, type AiLimitInput } from './types';

/** What a row of the editor says: what it counts (`cost`, `tokens`, `requests`) or `call-tokens`, over which period, how much. */
export type LimitRow = { kind: string; period: string; amount: string };

export const LIMIT_KINDS = ['cost', 'tokens', 'requests', 'call-tokens'] as const;
export const LIMIT_PERIODS = ['minute', 'day', 'month'] as const;

/** The limits this editor shows and changes: a scope's (or the site's) totals and its tokens per reply, not a person's or a group's. */
export const editableLimit = (l: AiLimit) => (l.kind === 'total' || l.kind === 'call-tokens') && !l.accountId && !l.groupId;

export const limitRow = (l: AiLimit): LimitRow =>
  l.kind === 'call-tokens'
    ? { kind: 'call-tokens', period: '', amount: String(num(l.amount)) }
    : { kind: l.measure ?? 'cost', period: l.period || 'day', amount: String(num(l.amount)) };

const limitInput = (r: LimitRow): AiLimitInput =>
  r.kind === 'call-tokens'
    ? { kind: 'call-tokens', period: '', measure: 'tokens', amount: Number(r.amount || 0) }
    : { kind: 'total', period: r.period || 'day', measure: r.kind, amount: Number(r.amount || 0) };

/**
 * Saves the editor's rows on the site or a scope: the limits no row keeps as they were are deleted, then the new and
 * changed ones are set. A person's and a group's limits are left alone.
 */
export async function saveLimits(request: HostRequest, scopeId: string | null | undefined, before: readonly AiLimit[], rows: readonly LimitRow[]) {
  const same = (a: LimitRow, b: LimitRow) => a.kind === b.kind && a.period === b.period && Number(a.amount || 0) === Number(b.amount || 0);
  const left = [...rows];
  const gone: AiLimit[] = [];
  for (const l of before.filter(editableLimit)) {
    const i = left.findIndex((r) => same(r, limitRow(l)));
    if (i >= 0) left.splice(i, 1);
    else gone.push(l);
  }
  for (const l of gone) await request(`/limits/${encodeURIComponent(l.id)}`, { method: 'DELETE' });
  for (const r of left) await request(`/limits${scopeQuery(scopeId)}`, { method: 'POST', body: limitInput(r) });
}

/** "Cost per day: 5", "Tokens per reply: 2,000", and a person's default: "Cost per day for each person: 1". */
export function useLimitText() {
  const t = useAiTexts();
  const fmt = useFormatters();
  return (l: AiLimit) => {
    const r = limitRow(l);
    if (r.kind === 'call-tokens') return t('limitCallTokens', { amount: fmt.number(num(l.amount)) });
    const values = { kind: t(`kinds.${r.kind}`), period: t(`periods.${r.period}`), amount: fmt.number(num(l.amount), { maximumFractionDigits: 6 }) };
    return t(l.kind === 'person' ? 'limitEachPerson' : 'limitText', values);
  };
}

/** A limit of one named account (an agent's, a person's) or group, not the scope's own. */
export const namedLimit = (l: AiLimit) => !!l.accountId || !!l.groupId || l.kind === 'account' || l.kind === 'group';

/**
 * Limits on a scope or the site: cost, tokens or requests per minute, day or month, and tokens per reply. With `onSave`
 * it has its own Save button; with `onChange` (inside a larger form) it reports every change instead.
 */
export function LimitsEditor({ limits, onSave, onChange, busy, error }: {
  limits: AiLimit[];
  onSave?: (rows: LimitRow[]) => Promise<void> | void;
  onChange?: (rows: LimitRow[]) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const t = useAiTexts();
  const [draft, setDraftRows] = useState<LimitRow[] | null>(null);
  const rows = draft ?? limits.filter(editableLimit).map(limitRow);
  const kinds = LIMIT_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }));
  const periods = LIMIT_PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`) }));
  const setDraft = (next: LimitRow[]) => {
    setDraftRows(next);
    onChange?.(next);
  };
  const set = (i: number, change: Partial<LimitRow>) => setDraft(rows.map((x, j) => (j === i ? { ...x, ...change } : x)));

  async function save() {
    if (!onSave) return;
    await onSave(rows);
    setDraftRows(null);
  }

  return (
    <Stack gap="3" data-testid="ai-limits">
      <InlineAlert tone="danger">{error}</InlineAlert>
      {rows.map((r, i) => (
        <HStack key={i} gap="2" alignItems="end">
          <Field label={i === 0 ? t('limitKind') : undefined} flex="2">
            <SelectField value={r.kind} options={kinds} aria-label={t('limitKind')}
              onChange={(e) => set(i, { kind: e.target.value, period: e.target.value === 'call-tokens' ? '' : r.period || 'day' })} />
          </Field>
          <Field label={i === 0 ? t('limitPeriod') : undefined} flex="1">
            {r.kind === 'call-tokens'
              ? <Text textStyle="sm" color="fg.muted" py="2">{t('perReply')}</Text>
              : <SelectField value={r.period} options={periods} aria-label={t('limitPeriod')} onChange={(e) => set(i, { period: e.target.value })} />}
          </Field>
          <Field label={i === 0 ? t('limitAmount') : undefined} flex="1">
            <Input type="number" min={0} step="any" value={r.amount} dir="ltr" aria-label={t('limitAmount')} onChange={(e) => set(i, { amount: e.target.value })} />
          </Field>
          <IconButton remove aria-label={t('removeLimit')} size="sm" onClick={() => setDraft(rows.filter((_, j) => j !== i))}>
            <Trash2 />
          </IconButton>
        </HStack>
      ))}
      {rows.length === 0 && <Text textStyle="sm" color="fg.muted">{t('noLimits')}</Text>}
      <HStack>
        <AddButton onClick={() => setDraft([...rows, { kind: 'cost', period: 'day', amount: '' }])}>{t('addLimit')}</AddButton>
        {onSave && <Button size="sm" loading={busy} disabled={draft === null} onClick={() => void save()}>{t('save')}</Button>}
      </HStack>
    </Stack>
  );
}
