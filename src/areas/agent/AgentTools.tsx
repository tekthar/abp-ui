import { useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { Button, DataTable, HostSlot, InlineAlert, notify, SelectField, StatusPill, useApiAction, useApiQuery, useAreaRequest } from '@abpjs/ui';
import { useToolGroupOf } from './links';
import { useAgentTexts } from './texts';
import type { AgentInfo, AgentTool } from './types';

/** The sandbox's tools (AbpSandbox), by their names: offered while a sandbox is available. */
const isSandbox = (x: AgentTool) => x.name.startsWith('sandbox_');

/** The settings a tool may have, and what leaving it as it is means. An opt-in tool that only reads is simply on or off. */
function optionsOf(x: AgentTool, t: (key: string) => string): { value: string; label: string }[] {
  if (x.alwaysAsks) return [{ value: '', label: t(x.optIn ? 'tools.defaultOff' : 'tools.defaultAsks') }, { value: 'ask', label: t('tools.askEveryTime') }, ...(x.optIn ? [] : [{ value: 'off', label: t('tools.off') }])];
  if (x.optIn && x.readsOnly) return [{ value: '', label: t('tools.defaultOff') }, { value: 'run', label: t('tools.on') }];
  if (x.optIn) return [{ value: '', label: t('tools.defaultOff') }, { value: 'run', label: t('tools.run') }, { value: 'ask', label: t('tools.ask') }];
  return [
    { value: '', label: t(x.readsOnly ? 'tools.defaultReads' : 'tools.defaultAsks') },
    { value: 'run', label: t('tools.run') },
    { value: 'ask', label: t('tools.ask') },
    { value: 'off', label: t('tools.off') },
  ];
}

/**
 * What an agent may do with each tool the host offers it (`agents/{id}/tools`): the host's own, its plugins', and the
 * sandbox's while one is available. A tool that only reads runs; one that changes things asks unless it's set to run;
 * one that always asks (a change in another system) asks every time; an opt-in tool is off until it's turned on.
 * Whatever is set here, a run that has read outside content or beyond its scope asks before every change. The host adds
 * its own groups below (`agent.tools.extra`): its skills, its outside servers' tools.
 */
export function AgentToolsPanel({ agent, onSaved, version = 0 }: {
  agent: AgentInfo;
  onSaved: (agent: AgentInfo) => void;
  /** Bumped by the host when what the agent may use changed (its connections), so the list asks again. */
  version?: number;
}) {
  const t = useAgentTexts();
  const request = useAreaRequest('agent');
  const tools = useApiQuery<AgentTool[]>('agent', `/agents/${agent.id}/tools?v=${version}`);
  const action = useApiAction();
  const [settings, setSettings] = useState<Record<string, string>>(agent.tools ?? {});
  const changed = JSON.stringify(settings) !== JSON.stringify(agent.tools ?? {});
  const groupOf = useToolGroupOf();
  const rows = tools.data ?? [];
  // The host's own groups (its skills, an outside server's tools), in the order their first tools come.
  const hostGroups = new Map<string, { id: string; title: string; rows: AgentTool[] }>();
  const own: AgentTool[] = [];
  for (const x of rows) {
    const g = groupOf?.(x);
    if (!g) own.push(x);
    else (hostGroups.get(g.id) ?? hostGroups.set(g.id, { ...g, rows: [] }).get(g.id)!).rows.push(x);
  }
  const groups: { id: string; title: string; rows: AgentTool[] }[] = [
    { id: 'host', title: t('tools.groups.host'), rows: own.filter((x) => !x.fromPlugin && !isSandbox(x)) },
    { id: 'plugins', title: t('tools.groups.plugins'), rows: own.filter((x) => x.fromPlugin && !isSandbox(x)) },
    ...[...hostGroups.values()],
    { id: 'sandbox', title: t('tools.groups.sandbox'), rows: own.filter(isSandbox) },
  ].filter((g) => g.rows.length > 0 || (g.id === 'host' && tools.loading));

  async function save() {
    const saved = await action.run(() => request<AgentInfo>(`/agents/${agent.id}`, { method: 'PUT', body: { tools: settings } }));
    if (saved) {
      notify.success(t('tools.saved'));
      onSaved(saved);
    }
  }

  function set(name: string, value: string) {
    const next = { ...settings };
    if (value) next[name] = value;
    else delete next[name];
    setSettings(next);
  }

  return (
    <Stack gap="field" data-testid="agent-tools">
      <Stack gap="1">
        <Text fontWeight="medium">{t('tools.title')}</Text>
        <Text textStyle="caption" color="fg.muted">{t('tools.hint')}</Text>
      </Stack>
      {groups.map((g) => (
        <Stack key={g.id} gap="2">
          <Text textStyle="label" color="fg.muted">{g.title}</Text>
          <DataTable<AgentTool>
            rows={g.rows}
            loading={tools.loading}
            getRowId={(x) => x.name}
            size="sm"
            aria-label={g.title}
            columns={[
              { id: 'name', header: t('tools.tool'), cell: (x) => <Stack gap="0"><Text dir="ltr">{x.name}</Text><Text textStyle="caption" color="fg.muted">{x.title}</Text></Stack> },
              {
                id: 'kind',
                header: t('tools.kind'),
                cell: (x) => <StatusPill tone={x.readsOnly ? 'neutral' : 'warning'}>{t(x.alwaysAsks ? 'tools.asksEveryTime' : x.readsOnly ? 'tools.reads' : 'tools.changes')}</StatusPill>,
              },
              {
                id: 'setting',
                header: t('tools.setting'),
                cell: (x) => (
                  <SelectField size="sm" value={settings[x.name] ?? ''} aria-label={t('tools.setting')} onChange={(e) => set(x.name, e.target.value)} options={optionsOf(x, t)} />
                ),
              },
            ]}
          />
        </Stack>
      ))}
      <HostSlot name="agent.tools.extra" context={{ agent, settings, set, listed: rows.map((x) => x.name), loading: tools.loading }} />
      <InlineAlert tone="danger">{action.error ?? tools.error}</InlineAlert>
      <Button variant="primary" alignSelf="flex-start" onClick={() => void save()} loading={action.busy} disabled={!changed}>{t('tools.save')}</Button>
    </Stack>
  );
}
