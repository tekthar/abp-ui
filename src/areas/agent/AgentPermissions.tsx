import { Fragment, useMemo, useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import {
  Button, CheckboxField, DataTable, errorText, FormDialog, FormField, InlineAlert, notify, Panel, SelectField, useAbpLocale, useApiAction, useApiQuery,
  useAreaRequest, useConfirm, useFormatters,
} from '@abpjs/ui';
import { useNameOf } from './names';
import { useAgentTexts } from './texts';
import type { AgentAllowablePlace, AgentPermissionInfo, AgentPerson } from './types';

/** One row: a person's standing permissions for one agent in one scope, its tools together. */
interface PermissionRow {
  id: string;
  personId: string;
  person: AgentPerson | null | undefined;
  agentId: string;
  agentKey: string;
  agent: AgentPerson | null | undefined;
  agentNames: Record<string, string> | null | undefined;
  madeBy: AgentPerson | null | undefined;
  scopeId: string;
  scopeKey: string | null | undefined;
  tools: { name: string; title: string }[];
  since: string;
  lastUsedAt: string | null;
}

/** Standing permissions by person, agent and scope: the earliest given, the latest used, the tools by title. */
function rowsOf(list: AgentPermissionInfo[] | undefined, locale: string): PermissionRow[] {
  const rows = new Map<string, PermissionRow>();
  for (const p of list ?? []) {
    const id = `${p.personId}/${p.agentId}/${p.scopeId}`;
    const row = rows.get(id) ?? {
      id, personId: p.personId, person: p.person, agentId: p.agentId, agentKey: p.agentKey, agent: p.agent, agentNames: p.agentNames, madeBy: p.madeBy, scopeId: p.scopeId,
      scopeKey: p.scopeKey, tools: [], since: p.createdAt, lastUsedAt: null,
    };
    row.tools.push({ name: p.tool, title: p.toolTitle || p.tool });
    if (p.createdAt < row.since) row.since = p.createdAt;
    if (p.lastUsedAt && (!row.lastUsedAt || p.lastUsedAt > row.lastUsedAt)) row.lastUsedAt = p.lastUsedAt;
    rows.set(id, row);
  }
  for (const row of rows.values()) row.tools.sort((a, b) => a.title.localeCompare(b.title, locale));
  return [...rows.values()];
}

/**
 * Standing permissions: the tools a person lets an agent use without asking, in the runs they start in one scope,
 * given by "Always allow" in a run or ahead of time. On the person's page, their own (no `agentId`), one row per agent
 * and scope, with "Allow an agent"; on an agent's page, the ones people gave it, for its admins, one row per person and
 * scope. Removing a row takes back all its tools: they ask again from their next call.
 */
export function AgentPermissionsPanel({ agentId }: { agentId?: string }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const { locale } = useAbpLocale();
  const confirm = useConfirm();
  const request = useAreaRequest('agent');
  const list = useApiQuery<AgentPermissionInfo[]>('agent', agentId ? `/agents/${agentId}/permissions` : '/me/permissions');
  const rows = useMemo(() => rowsOf(list.data, locale), [list.data, locale]);
  const nameOf = useNameOf();
  const [allowing, setAllowing] = useState(false);
  const title = t(agentId ? 'permissions.agentTitle' : 'permissions.title');
  const whoOf = (r: PermissionRow) => (agentId ? r.person?.displayName || '' : nameOf(r.agentNames, r.agent?.displayName || r.agentKey));

  async function remove(r: PermissionRow) {
    const ok = await confirm({
      title: t(agentId ? 'permissions.removePersonTitle' : 'permissions.removeTitle', { name: whoOf(r), scope: r.scopeKey ?? '' }),
      description: t(agentId ? 'permissions.removePersonHint' : 'permissions.removeHint'),
      confirmLabel: t('permissions.remove'),
      danger: true,
    });
    if (!ok) return;
    try {
      await request('/permissions/remove', { method: 'POST', body: { personId: r.personId, agentId: r.agentId, scopeId: r.scopeId } });
      await list.reload();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  return (
    <Panel
      title={title}
      description={t(agentId ? 'permissions.agentHint' : 'permissions.hint')}
      actions={agentId ? undefined : <Button size="sm" onClick={() => setAllowing(true)}>{t('permissions.allowAgent')}</Button>}
      flush
      data-testid="agent-permissions"
    >
      <InlineAlert tone="danger">{list.error}</InlineAlert>
      <DataTable
        aria-label={title}
        rows={rows}
        loading={list.loading}
        getRowId={(r) => r.id}
        empty={t('permissions.empty')}
        columns={[
          {
            id: 'who',
            header: t(agentId ? 'permissions.person' : 'permissions.agent'),
            cell: (r) => (
              <Stack gap="0.5">
                <Text fontWeight="medium">{whoOf(r)}</Text>
                {!agentId && r.madeBy && <Text textStyle="caption" color="fg.muted">{t('permissions.madeBy', { name: r.madeBy.displayName })}</Text>}
              </Stack>
            ),
          },
          {
            id: 'tools',
            header: t('permissions.tools'),
            // Each title kept apart from the text around it: a host's titles may be in another script than the page's.
            cell: (r) => (
              <Text>
                {r.tools.map((x, i) => (
                  <Fragment key={x.name}>
                    {i > 0 && t('permissions.toolSeparator')}
                    <Text as="span" unicodeBidi="isolate">{x.title}</Text>
                  </Fragment>
                ))}
              </Text>
            ),
          },
          { id: 'scope', header: t('permissions.project'), cell: (r) => <Text dir="ltr">{r.scopeKey ?? ''}</Text> },
          {
            id: 'since',
            header: t('permissions.since'),
            cell: (r) => (
              <Stack gap="0.5">
                <Text>{fmt.dateTime(r.since, { dateStyle: 'medium' })}</Text>
                <Text textStyle="caption" color="fg.muted">
                  {r.lastUsedAt ? t('permissions.used', { at: fmt.dateTime(r.lastUsedAt, { dateStyle: 'medium' }) }) : t('permissions.unused')}
                </Text>
              </Stack>
            ),
          },
          {
            id: 'actions',
            header: '',
            cell: (r) => (
              <Button size="sm" variant="ghost" aria-label={t('permissions.removeLabel', { name: whoOf(r), scope: r.scopeKey ?? '' })} onClick={() => void remove(r)}>
                {t('permissions.remove')}
              </Button>
            ),
          },
        ]}
      />
      {allowing && <AllowAgentDialog onClose={() => setAllowing(false)} onSaved={list.reload} />}
    </Panel>
  );
}

/**
 * "Allow an agent": an agent, a scope where it may be allowed, and the tools it may use there without asking, as
 * AbpAgent offers them (`me/permissions/allowable`): only those "Always" could answer for. Those already given show
 * checked and can't be unchecked here: removing is the row's.
 */
function AllowAgentDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<unknown> | void }) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const places = useApiQuery<AgentAllowablePlace[]>('agent', '/me/permissions/allowable');
  const agents = useMemo(() => {
    const seen = new Map<string, { id: string; label: string }>();
    for (const p of places.data ?? []) {
      for (const a of p.agents) {
        if (!seen.has(a.agent.id)) seen.set(a.agent.id, { id: a.agent.id, label: nameOf(a.agent.names, a.agent.account?.displayName || a.agent.key) });
      }
    }
    return [...seen.values()];
  }, [places.data, nameOf]);
  const [agentPick, setAgentPick] = useState<string | null>(null);
  const [scopePick, setScopePick] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const agentId = agentPick ?? agents[0]?.id ?? null;
  const scopes = (places.data ?? []).filter((p) => p.agents.some((a) => a.agent.id === agentId));
  const scopeId = scopePick && scopes.some((p) => p.scope.id === scopePick) ? scopePick : scopes[0]?.scope.id ?? null;
  const tools = scopes.find((p) => p.scope.id === scopeId)?.agents.find((a) => a.agent.id === agentId)?.tools ?? [];
  const chosen = picked.filter((name) => tools.some((x) => x.name === name && !x.given));
  const label = agents.find((a) => a.id === agentId)?.label ?? '';

  async function save() {
    if (!agentId || !scopeId || chosen.length === 0) return;
    const done = await action.run(async () => {
      await request('/me/permissions', { method: 'POST', body: { agentId, scopeId, tools: chosen } });
      return true;
    });
    if (done) {
      notify.success(t('permissions.allowed', { name: label }));
      await onSaved();
      onClose();
    }
  }

  const none = !places.loading && !places.error && agents.length === 0;
  return (
    <FormDialog open onOpenChange={(open) => !open && onClose()} title={t('permissions.allowTitle')} description={t('permissions.allowDescription')}
      submitLabel={t('permissions.allow')} onSubmit={save} busy={action.busy} error={action.error ?? places.error} submitDisabled={chosen.length === 0}>
      {none ? (
        <Text textStyle="sm" color="fg.muted">{t('permissions.nothingToAllow')}</Text>
      ) : (
        <>
          <FormField label={t('permissions.agent')} loading={places.loading}>
            <SelectField value={agentId ?? ''} options={agents.map((a) => ({ value: a.id, label: a.label }))} loading={places.loading}
              onChange={(e) => { setAgentPick(e.target.value); setScopePick(null); setPicked([]); }} />
          </FormField>
          <FormField label={t('permissions.project')} loading={places.loading}>
            <SelectField value={scopeId ?? ''} options={scopes.map((p) => ({ value: p.scope.id, label: p.scope.key }))} loading={places.loading}
              onChange={(e) => { setScopePick(e.target.value); setPicked([]); }} />
          </FormField>
          <Stack gap="1.5" role="group" aria-labelledby="agent-allow-tools">
            <Text id="agent-allow-tools" textStyle="sm" fontWeight="medium">{t('permissions.toolsWithoutAsking')}</Text>
            {tools.map((x) => (
              <CheckboxField key={x.name} label={x.given ? t('permissions.alreadyAllowed', { tool: x.title }) : x.title} checked={x.given || picked.includes(x.name)}
                disabled={x.given} onCheckedChange={(c) => setPicked(c ? [...picked, x.name] : picked.filter((n) => n !== x.name))} />
            ))}
            <Text textStyle="caption" color="fg.muted">{t('permissions.allowHint')}</Text>
          </Stack>
        </>
      )}
    </FormDialog>
  );
}
