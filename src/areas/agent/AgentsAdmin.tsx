import { useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { Button, HostSlot, InlineAlert, Panel, SwitchField, useApiAction, useApiQuery, useAreaRequest, useSlotSaves } from '@abpjs/ui';
import { AgentEditor } from './AgentEditor';
import { AgentForm, AgentsTable } from './Agents';
import { ItemHrefProvider, type ItemHref } from './links';
import { useAgentTexts } from './texts';
import type { AgentInfo, AgentSwitch } from './types';

/**
 * The site's agents, for its admins: the switch (held by the operator's setting and by safe mode), every agent on the
 * site, a new site agent offered to every scope or to named ones, and the chosen agent to change, limit or pause. The
 * host adds to the switch (`agent.switch.extra`: a cost limit it needs first, a sandbox's state); a save it registers
 * runs before agents go on.
 */
export function AgentsAdmin({ itemHref }: { itemHref?: ItemHref }) {
  const t = useAgentTexts();
  const request = useAreaRequest('agent');
  const settings = useApiQuery<AgentSwitch>('agent', '/settings');
  const agents = useApiQuery<AgentInfo[]>('agent', '/agents');
  const [selected, setSelected] = useState<AgentInfo | null>(null);
  const [creating, setCreating] = useState(false);
  const toggle = useApiAction();
  const slots = useSlotSaves();

  async function turn(enabled: boolean) {
    const s = await toggle.run(async () => {
      if (enabled) await slots.run();
      return request<AgentSwitch>('/settings', { method: 'PUT', body: { enabled } });
    });
    if (s) settings.setData(s);
  }

  function saved(agent: AgentInfo) {
    setSelected(agent);
    setCreating(false);
    void agents.reload();
  }

  const s = settings.data;
  return (
    <ItemHrefProvider value={itemHref}>
      <Stack gap="section">
        <Panel title={t('switchTitle')} data-testid="agents-switch">
          <Stack gap="2">
            <InlineAlert tone="danger">{toggle.error ?? settings.error}</InlineAlert>
            {s?.safeMode && <InlineAlert tone="warning">{t('safeMode')}</InlineAlert>}
            <SwitchField label={t(s?.enabled ? 'switchOn' : 'switchOff')} checked={s?.enabled ?? false} disabled={!s || toggle.busy || (!s.adminsMayEnable && !s.enabled)}
              onCheckedChange={(c) => void turn(c)} />
            <Text textStyle="caption" color="fg.muted">{t(s && !s.adminsMayEnable ? 'operatorOff' : 'switchHint')}</Text>
            {s && <HostSlot name="agent.switch.extra" context={{ settings: s, register: slots.register }} />}
          </Stack>
        </Panel>
        <Panel title={t('list')} flush data-testid="agents-list"
          actions={<Button size="sm" disabled={!s?.enabled} onClick={() => { setCreating(true); setSelected(null); }}>{t('newSite')}</Button>}>
          <InlineAlert tone="danger">{agents.error}</InlineAlert>
          <AgentsTable rows={agents.data} loading={agents.loading} selected={selected?.id} onOpen={(a) => { setSelected(a); setCreating(false); }} />
        </Panel>
        {creating && (
          <Panel title={t('newSite')} data-testid="agent-new">
            <AgentForm onSaved={saved} />
          </Panel>
        )}
        {selected && <AgentEditor key={selected.id} agent={selected} onSaved={saved} />}
      </Stack>
    </ItemHrefProvider>
  );
}
