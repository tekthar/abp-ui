import { Stack, Text } from '@chakra-ui/react';
import { Button, DataTable, errorText, InlineAlert, notify, Panel, useApiQuery, useAreaRequest, useConfirm, useFormatters } from '@abpjs/ui';
import { useAgentTexts } from './texts';
import type { AgentPermissionInfo } from './types';

/**
 * Standing permissions: "Always allow" given in a person's own runs, for one agent, one tool and one scope. On the
 * person's page, their own (no `agentId`); on an agent's page, the ones people gave it, for its admins. Each says when it
 * was given and last let a call run, and can be taken back: the tool asks again from its next call.
 */
export function AgentPermissionsPanel({ agentId }: { agentId?: string }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const confirm = useConfirm();
  const request = useAreaRequest('agent');
  const list = useApiQuery<AgentPermissionInfo[]>('agent', agentId ? `/agents/${agentId}/permissions` : '/me/permissions');

  async function takeBack(p: AgentPermissionInfo) {
    if (!(await confirm({ title: t('permissions.takeBackTitle', { tool: p.tool, agent: p.agent?.displayName ?? p.agentKey }), confirmLabel: t('permissions.takeBack'), danger: true }))) return;
    try {
      await request('/permissions/remove', { method: 'POST', body: { personId: p.personId, agentId: p.agentId, tool: p.tool, scopeId: p.scopeId } });
      await list.reload();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  return (
    <Panel title={t(agentId ? 'permissions.agentTitle' : 'permissions.title')} description={t(agentId ? 'permissions.agentHint' : 'permissions.hint')} flush data-testid="agent-permissions">
      <InlineAlert tone="danger">{list.error}</InlineAlert>
      <DataTable
        aria-label={t(agentId ? 'permissions.agentTitle' : 'permissions.title')}
        rows={list.data}
        loading={list.loading}
        getRowId={(p) => `${p.personId}/${p.agentId}/${p.tool}/${p.scopeId}`}
        empty={t('permissions.empty')}
        columns={[
          {
            id: 'what',
            header: t('permissions.what'),
            cell: (p) => (
              <Stack gap="0.5">
                <Text fontWeight="medium">
                  {agentId
                    ? t('permissions.byPerson', { name: p.person?.displayName ?? '', tool: p.tool })
                    : t('permissions.forAgent', { agent: p.agent?.displayName ?? p.agentKey, tool: p.tool })}
                </Text>
                <Text textStyle="caption" color="fg.muted">
                  <Text as="span" dir="ltr">{p.scopeKey ?? ''}</Text>
                  {' · '}{t('permissions.given', { at: fmt.dateTime(p.createdAt, { dateStyle: 'medium' }) })}
                  {' · '}{p.lastUsedAt ? t('permissions.used', { at: fmt.dateTime(p.lastUsedAt, { dateStyle: 'medium' }) }) : t('permissions.unused')}
                </Text>
              </Stack>
            ),
          },
          { id: 'actions', header: '', cell: (p) => <Button size="sm" variant="ghost" onClick={() => void takeBack(p)}>{t('permissions.takeBack')}</Button> },
        ]}
      />
    </Panel>
  );
}
