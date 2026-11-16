import { HStack, Stack, Text } from '@chakra-ui/react';
import { AppLink, Button, DataTable, InlineAlert, Panel, StatusPill, useApiAction, useAreaRequest, useFormatters, type DataTableColumn } from '@abpjs/ui';
import { guardRoutes, type GuardRoutes } from './routes';
import { useGuardNs, withParts } from './texts';
import type { AccountMergeDto, MergeCountDto } from './types';

/**
 * A count as a person reads it: `merge.count.{key}` with its dots as underscores (`records.reporter` as
 * `merge.count.records_reporter`), which a host gives for its own modules' counts through `AbpHost.texts.guard`; else
 * the part's own label, else its key.
 */
export function useCountLabel(): (c: MergeCountDto) => string {
  const t = useGuardNs('merge');
  return (c) => {
    const key = `count.${c.key.replace(/\./g, '_')}`;
    const text = t(key, { count: c.count });
    return text === `merge.${key}` ? `${c.label ?? c.key}: ${c.count}` : text;
  };
}

/** The module or plugin a part of a merge belongs to: `merge.part.{key}`, which a host gives for its own modules. */
export function usePartLabel(): (key: string, plugin: boolean) => string {
  const t = useGuardNs('merge');
  return (key, plugin) => {
    if (plugin) return t('plugin', { key });
    const text = t(`part.${key}`);
    return text === `merge.part.${key}` ? key : text;
  };
}

/** What one part moved, as a short list. */
export function CountList({ counts }: { counts: MergeCountDto[] }) {
  const label = useCountLabel();
  const t = useGuardNs('merge');
  if (counts.length === 0) return <Text color="fg.muted">{t('nothing')}</Text>;
  return (
    <Stack gap="0.5" as="ul" listStyleType="none" ps="0" m="0">
      {counts.map((c) => (
        <Text as="li" key={c.key} textStyle="body.sm">
          {label(c)}
        </Text>
      ))}
    </Stack>
  );
}

export interface MergesPanelProps {
  accountId: string;
  merges: AccountMergeDto[];
  onChange: () => Promise<void>;
  routes?: GuardRoutes;
}

/**
 * The merges an account was in: into it, or of it into another; who did it, or why it was automatic; and what each
 * module and plugin moved. A merge a part didn't finish can be resumed.
 */
export function MergesPanel({ accountId, merges, onChange, routes = guardRoutes() }: MergesPanelProps) {
  const t = useGuardNs('merge');
  const fmt = useFormatters();
  const partLabel = usePartLabel();
  const request = useAreaRequest('guard');
  const action = useApiAction();

  async function resume(m: AccountMergeDto) {
    if (await action.run(() => request<AccountMergeDto>(`/merges/${m.id}/resume`, { method: 'POST' }))) await onChange();
  }

  const columns: DataTableColumn<AccountMergeDto>[] = [
    { id: 'when', header: t('when'), nowrap: true, sortValue: (m) => new Date(m.startedAt), cell: (m) => fmt.dateTime(m.startedAt) },
    {
      id: 'what',
      header: t('what'),
      cell: (m) =>
        m.sourceId === accountId ? (
          <Text as="span">
            {withParts(t('mergedInto'), {
              survivor: (
                <AppLink href={routes.account(m.survivorId)} fontWeight="medium">
                  {m.survivorUsername}
                </AppLink>
              ),
            })}
          </Text>
        ) : (
          <Text as="span">
            {withParts(t('mergedFrom', { name: m.sourceDisplayName ?? '' }), {
              source: (
                <AppLink href={routes.account(m.sourceId)} fontWeight="medium">
                  {m.sourceUsername}
                </AppLink>
              ),
            })}
          </Text>
        ),
    },
    {
      id: 'who',
      header: t('who'),
      cell: (m) => (m.automatic ? <StatusPill tone="accent">{t(`reason.${m.reason}`)}</StatusPill> : (m.actorUsername ?? t('someone'))),
    },
    {
      id: 'moved',
      header: t('moved'),
      cell: (m) => (
        <Stack gap="1">
          {m.steps
            .filter((s) => s.counts.length > 0 || s.state !== 'done')
            .map((s) => (
              <Stack key={s.key} gap="0">
                <Text textStyle="caption" color="fg.muted">
                  {partLabel(s.key, s.plugin)}
                  {s.state !== 'done' && ` · ${t(`step.${s.state}`)}`}
                </Text>
                {s.error && (
                  <Text textStyle="caption" color="fg.danger">
                    {s.error}
                  </Text>
                )}
                <CountList counts={s.counts} />
              </Stack>
            ))}
        </Stack>
      ),
    },
    {
      id: 'state',
      header: t('state'),
      cell: (m) =>
        m.state === 'done' ? (
          <StatusPill tone="success">{t('done')}</StatusPill>
        ) : (
          <HStack gap="2" wrap="wrap">
            <StatusPill tone="warning">{t('incomplete')}</StatusPill>
            <Button size="sm" onClick={() => resume(m)} loading={action.busy}>
              {t('resume')}
            </Button>
          </HStack>
        ),
    },
  ];

  return (
    <Panel title={t('title', { count: merges.length })} description={t('hint')} flush data-testid="merges">
      <InlineAlert tone="danger">{action.error}</InlineAlert>
      <DataTable
        aria-label={t('title', { count: merges.length })}
        columns={columns}
        rows={merges}
        getRowId={(m) => m.id}
        defaultSort={{ columnId: 'when', direction: 'desc' }}
        empty={t('none')}
      />
    </Panel>
  );
}
