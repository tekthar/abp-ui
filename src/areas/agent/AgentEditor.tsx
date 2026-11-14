import { useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { HostSlot, Panel, PropertyList } from '@abpjs/ui';
import { AgentForm, AgentPause } from './Agents';
import { AgentLimitsPanel } from './AgentLimits';
import { AgentMemoriesPanel } from './AgentMemories';
import { AgentPermissionsPanel } from './AgentPermissions';
import { AgentToolsPanel } from './AgentTools';
import { useNameOf } from './names';
import { useAgentTexts } from './texts';
import type { AgentInfo } from './types';

/**
 * One agent, for whoever administers it: who it is, what it does, its tools, limits and memory, and the standing
 * permissions people gave it. What's the host's goes in its slots: `agent.picture` (the agent's picture),
 * `agent.connections` (outside servers it may use; `onChanged` makes the tools ask again).
 */
export function AgentEditor({ agent, onSaved, permissions = true, variant = 'site' }: {
  agent: AgentInfo;
  onSaved: (agent: AgentInfo) => void;
  /** The standing permissions people gave it (its admins'); off where they're someone else's to see. */
  permissions?: boolean;
  /** `site`: with who it is (key, account, responsible, where it's taken on); `scope`: a scope's own agent, its settings alone. */
  variant?: 'site' | 'scope';
}) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  // Bumped when what the agent may use changes in the host's slot, so its tools ask again.
  const [toolsVersion, setToolsVersion] = useState(0);

  return (
    <Stack gap="section">
      <Panel title={t('editTitle', { name: nameOf(agent.names, agent.key) })} actions={<AgentPause agent={agent} onChanged={onSaved} />} data-testid="agent-edit">
        <Stack gap={variant === 'scope' ? 'section' : 'stack'}>
          {variant === 'site' && <PropertyList
            items={[
              { label: t('key'), value: <Text dir="ltr">{agent.key}</Text> },
              { label: t('account'), value: <Text dir="ltr">@{agent.account.username}</Text> },
              { label: t('responsible'), value: agent.responsible?.displayName ?? '' },
              {
                label: t('takenBy'),
                value: (
                  <HStack gap="2" wrap="wrap">
                    {agent.scopes.length === 0 ? t('notTaken') : agent.scopes.map((s) => <Text key={s.scopeKey} dir="ltr">{s.scopeKey} ({s.roleKey})</Text>)}
                  </HStack>
                ),
              },
            ]}
          />}
          <HostSlot name="agent.picture" context={{ agent, onSaved }} />
          <AgentForm key={`form-${agent.id}`} agent={agent} onSaved={onSaved} />
          <HostSlot name="agent.connections" context={{ agent, onChanged: () => setToolsVersion((v) => v + 1) }} />
          <AgentToolsPanel key={`tools-${agent.id}`} agent={agent} onSaved={onSaved} version={toolsVersion} />
          <AgentLimitsPanel key={`limits-${agent.id}`} agent={agent} onSaved={onSaved} />
          <AgentMemoriesPanel key={`memories-${agent.id}`} agent={agent} onSaved={onSaved} />
        </Stack>
      </Panel>
      {permissions && <AgentPermissionsPanel key={`permissions-${agent.id}`} agentId={agent.id} />}
    </Stack>
  );
}
