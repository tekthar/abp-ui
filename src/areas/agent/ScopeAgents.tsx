import { useState, type ReactNode } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { Button, InlineAlert, notify, Panel, SelectField, useApiAction, useApiQuery, useAreaRequest } from '@abpjs/ui';
import { AgentEditor } from './AgentEditor';
import { AgentForm, AgentsTable } from './Agents';
import { ItemHrefProvider, type ItemHref } from './links';
import { useNameOf } from './names';
import { useAgentTexts } from './texts';
import type { AgentInfo, ScopeAgentInfo } from './types';

/**
 * A scope's agents (a project's), for its admins: its own, which they make and change, and the site's offered to it,
 * which they take on with a role for the runs the system starts there, or take off. The host gives the scope's roles
 * an agent may have (never its admins'), and its own header.
 */
export function ScopeAgentsScreen({ scope, roles, header, itemHref, subtitle }: {
  /** The scope's key, as the agents' API names it. */
  scope: string;
  roles: { value: string; label: string }[];
  header?: ReactNode;
  itemHref?: ItemHref;
  /** The words under the header; the default speaks of a project. */
  subtitle?: string;
}) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const request = useAreaRequest('agent');
  const base = `/scopes/${encodeURIComponent(scope)}/agents`;
  const agents = useApiQuery<ScopeAgentInfo[]>('agent', base);
  const [selected, setSelected] = useState<AgentInfo | null>(null);
  const [creating, setCreating] = useState(false);
  const [roleFor, setRoleFor] = useState<Record<string, string>>({});
  const action = useApiAction();
  const byId = new Map((agents.data ?? []).map((a) => [a.agent.id, a]));

  async function take(agent: AgentInfo, on: boolean) {
    const name = nameOf(agent.names, agent.key);
    const done = await action.run(async () => {
      if (on) await request(`${base}/${agent.id}/take`, { method: 'PUT', body: { roleKey: roleFor[agent.id] ?? roles[0]?.value ?? '' } });
      else await request(`${base}/${agent.id}/take`, { method: 'DELETE' });
      return true;
    });
    if (done) {
      notify.success(t(on ? 'takenToast' : 'takenOffToast', { name }));
      await agents.reload();
    }
  }

  function saved(agent: AgentInfo) {
    setSelected(agent);
    setCreating(false);
    void agents.reload();
  }

  return (
    <ItemHrefProvider value={itemHref}>
      <Stack gap="section">
        {header}
        <Text color="fg.muted">{subtitle ?? t('projectSubtitle')}</Text>
        <Panel title={t('list')} flush data-testid="scope-agents"
          actions={<Button size="sm" onClick={() => { setCreating(true); setSelected(null); }}>{t('newProject')}</Button>}>
          <InlineAlert tone="danger">{action.error ?? agents.error}</InlineAlert>
          <AgentsTable
            rows={agents.data?.map((a) => a.agent)}
            loading={agents.loading}
            selected={selected?.id}
            onOpen={(a) => { if (byId.get(a.id)?.own) { setSelected(a); setCreating(false); } }}
            extra={[
              {
                id: 'taken',
                header: t('role'),
                cell: (a) => {
                  const row = byId.get(a.id);
                  if (!row || row.own) return <Text textStyle="caption" color="fg.muted">{t('own')}</Text>;
                  return row.roleKey ? (
                    <HStack gap="2" onClick={(e) => e.stopPropagation()}>
                      <Text>{roles.find((r) => r.value === row.roleKey)?.label ?? row.roleKey}</Text>
                      <Button size="xs" variant="ghost" disabled={action.busy} onClick={() => void take(a, false)}>{t('takeOff')}</Button>
                    </HStack>
                  ) : (
                    <HStack gap="2" onClick={(e) => e.stopPropagation()}>
                      <SelectField size="xs" width="auto" aria-label={t('role')} value={roleFor[a.id] ?? roles[0]?.value ?? ''}
                        onChange={(e) => setRoleFor({ ...roleFor, [a.id]: e.target.value })} options={roles} />
                      <Button size="xs" disabled={action.busy || roles.length === 0} onClick={() => void take(a, true)}>{t('take')}</Button>
                    </HStack>
                  );
                },
              },
            ]}
          />
        </Panel>
        {creating && (
          <Panel title={t('newProject')} data-testid="scope-agent-new">
            <AgentForm scope={scope} roles={roles} onSaved={saved} />
          </Panel>
        )}
        {selected && <AgentEditor key={selected.id} agent={selected} onSaved={saved} permissions={selected.scopeKey != null} variant="scope" />}
      </Stack>
    </ItemHrefProvider>
  );
}
