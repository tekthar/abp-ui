import { useState } from 'react';
import { chakra, Stack, Text } from '@chakra-ui/react';
import { Button, DataTable, InlineAlert, notify, SegmentedControl, StatusPill, SwitchField, useApiAction, useApiQuery, useAreaRequest, useFormatters } from '@abpjs/ui';
import { AgentGraph } from './AgentGraph';
import { ItemLink } from './links';
import { useAgentTexts } from './texts';
import { num, type AgentInfo, type AgentMemoryInfo } from './types';

/**
 * What an agent learned, for its admins: whether it keeps memories, and each it kept, newest first, with the item it's
 * about, whose run kept it, when, how often it's been used since, and whether it was kept after outside content. Only
 * memories about items the reader may read are listed. Forgetting one lets it go for good. The graph shows the same
 * notes read into things and the facts between them, per scope.
 */
export function AgentMemoriesPanel({ agent, onSaved }: { agent: AgentInfo; onSaved: (agent: AgentInfo) => void }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('agent');
  const memories = useApiQuery<AgentMemoryInfo[]>('agent', `/agents/${agent.id}/memories`);
  const action = useApiAction();
  const [view, setView] = useState<'notes' | 'graph'>('notes');
  const scopes = [...new Set((memories.data ?? []).map((m) => m.scopeKey).filter((p): p is string => !!p))];

  async function turn(on: boolean) {
    const saved = await action.run(() => request<AgentInfo>(`/agents/${agent.id}`, { method: 'PUT', body: { memory: on } }));
    if (saved) onSaved(saved);
  }

  async function forget(memory: AgentMemoryInfo) {
    const done = await action.run(async () => {
      await request(`/agents/${agent.id}/memories/${memory.id}`, { method: 'DELETE' });
      return true;
    });
    if (done) {
      notify.success(t('memory.forgotten'));
      await memories.reload();
    }
  }

  return (
    <Stack gap="field" data-testid="agent-memories">
      <Stack gap="1">
        <Text fontWeight="medium">{t('memory.title')}</Text>
        <Text textStyle="caption" color="fg.muted">{t('memory.hint')}</Text>
      </Stack>
      <SwitchField label={t(agent.memory ?? true ? 'memory.on' : 'memory.off')} checked={agent.memory ?? true} disabled={action.busy} onCheckedChange={(c) => void turn(c)} />
      <chakra.div alignSelf="flex-start">
        <SegmentedControl size="sm" aria-label={t('memory.view')} value={view} onValueChange={setView} data-testid="agent-memory-view"
          items={[{ value: 'notes', label: t('memory.notes'), count: memories.data?.length ?? null }, { value: 'graph', label: t('memory.graph') }]} />
      </chakra.div>
      {view === 'graph' && !memories.loading && <AgentGraph key={scopes.join(',')} agentId={agent.id} scopes={scopes} />}
      {view === 'notes' && (
        <DataTable<AgentMemoryInfo>
          rows={memories.data}
          loading={memories.loading}
          getRowId={(m) => m.id}
          size="sm"
          aria-label={t('memory.title')}
          empty={t('memory.none')}
          columns={[
            { id: 'about', header: t('memory.about'), cell: (m) => (m.itemKey ? <ItemLink kind={m.itemKind} itemKey={m.itemKey} /> : '') },
            {
              id: 'text',
              header: t('memory.text'),
              cell: (m) => (
                <Stack gap="0.5">
                  <Text dir="auto" whiteSpace="pre-wrap">{m.text}</Text>
                  {m.outside && <StatusPill tone="warning" dot={false}>{t('memory.outside')}</StatusPill>}
                </Stack>
              ),
            },
            {
              id: 'kept',
              header: t('memory.kept'),
              cell: (m) => (
                <Stack gap="0">
                  <Text textStyle="caption">{fmt.dateTime(m.createdAt, { dateStyle: 'medium' })}</Text>
                  {m.rememberedBy && <Text textStyle="caption" color="fg.muted">{m.rememberedBy.displayName}</Text>}
                </Stack>
              ),
            },
            { id: 'uses', header: t('memory.uses'), cell: (m) => <Text textStyle="caption">{num(m.uses)}</Text> },
            {
              id: 'forget',
              header: '',
              cell: (m) => <Button size="xs" variant="ghost" danger onClick={() => void forget(m)} loading={action.busy} data-testid="agent-memory-forget">{t('memory.forget')}</Button>,
            },
          ]}
        />
      )}
      <InlineAlert tone="danger">{action.error ?? memories.error}</InlineAlert>
    </Stack>
  );
}
