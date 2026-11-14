import { useState, type FormEvent, type ReactNode } from 'react';
import { HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react';
import { Button, DataTable, Field, InlineAlert, notify, PersonChip, SelectField, StatusPill, SwitchField, useApiAction, useAreaRequest } from '@abpjs/ui';
import { filledIn, NamesField, useNameOf, type Names } from './names';
import { useAgentTexts } from './texts';
import { num, type AgentChange, type AgentInfo } from './types';

/** An agent's state, as a pill: on, or paused. */
export function AgentState({ agent }: { agent: AgentInfo }) {
  const t = useAgentTexts();
  return <StatusPill tone={agent.state === 'paused' ? 'warning' : 'success'}>{t(agent.state === 'paused' ? 'paused' : 'on')}</StatusPill>;
}

/**
 * Agents in a table: name and what it does, where it belongs (the site, or a scope's own), who answers for it, its
 * state. A row opens the agent; `extra` adds columns (a scope's take-on actions).
 */
export function AgentsTable({ rows, loading, onOpen, selected, extra = [] }: {
  rows: AgentInfo[] | undefined;
  loading: boolean;
  onOpen: (agent: AgentInfo) => void;
  selected?: string | null;
  extra?: { id: string; header: string; cell: (agent: AgentInfo) => ReactNode }[];
}) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  return (
    <DataTable
      aria-label={t('list')}
      rows={rows}
      loading={loading}
      getRowId={(a) => a.id}
      empty={t('empty')}
      interactive
      rowProps={(a) => ({ onClick: () => onOpen(a), cursor: 'pointer', 'aria-selected': a.id === selected || undefined })}
      columns={[
        {
          id: 'name',
          header: t('name'),
          cell: (a) => (
            <HStack gap="3">
              <PersonChip id={a.account.id} name={nameOf(a.names, a.key)} picture={a.account.picture ?? undefined} size="md" compact />
              <Stack gap="0.5">
                <Text fontWeight="medium">{nameOf(a.names, a.key)}</Text>
                <Text textStyle="caption" color="fg.muted">{nameOf(a.titles, '')}</Text>
              </Stack>
            </HStack>
          ),
        },
        { id: 'where', header: t('where'), cell: (a) => (a.scopeKey ? <Text dir="ltr">{a.scopeKey}</Text> : t('site')) },
        { id: 'responsible', header: t('responsible'), cell: (a) => a.responsible?.displayName ?? '' },
        { id: 'state', header: t('state'), cell: (a) => <AgentState agent={a} /> },
        ...extra,
      ]}
    />
  );
}

/**
 * Makes an agent or changes one. A site agent says which scopes it's offered to; a scope's own says its role there
 * (`roles`). Its name and what it does are given in every language the site offers: the reader's inline, the others
 * behind "Other languages".
 */
export function AgentForm({ agent, scope, roles, onSaved }: {
  /** The agent to change; none to make one. */
  agent?: AgentInfo;
  /** The scope a new one is made in (its key); none for a site agent. */
  scope?: string;
  /** The scope's roles to pick from, for a new agent of its own. */
  roles?: { value: string; label: string }[];
  onSaved: (agent: AgentInfo) => void;
}) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const site = agent ? agent.scopeKey == null : !scope;
  const [form, setForm] = useState({
    key: agent?.key ?? '',
    names: { ...(agent?.names ?? {}) } as Names,
    titles: { ...(agent?.titles ?? {}) } as Names,
    instructions: agent?.instructions ?? '',
    offerAll: agent?.offerAll ?? false,
    offeredTo: (agent?.offeredTo ?? []).join(', '),
    roleKey: roles?.[0]?.value ?? '',
    modelAlias: agent?.modelAlias ?? 'smart',
    transcriptDays: agent?.transcriptDays ? String(num(agent.transcriptDays)) : '',
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    const names = filledIn(form.names);
    const titles = filledIn(form.titles);
    const offers = site ? { offerAll: form.offerAll, offeredTo: form.offeredTo.split(',').map((k) => k.trim()).filter(Boolean) } : {};
    const saved = await action.run(() =>
      agent
        ? request<AgentInfo>(`/agents/${agent.id}`, {
          method: 'PUT',
          body: { names, titles, instructions: form.instructions, modelAlias: form.modelAlias.trim(), transcriptDays: Number(form.transcriptDays) || 0, ...offers } satisfies Partial<AgentChange>,
        })
        : request<AgentInfo>(scope ? `/scopes/${encodeURIComponent(scope)}/agents` : '/agents', {
          method: 'POST',
          body: { key: form.key.trim(), names, titles, instructions: form.instructions, ...offers, ...(site ? {} : { roleKey: form.roleKey }) } satisfies Partial<AgentChange>,
        }),
    );
    if (saved) {
      notify.success(agent ? t('saved') : t('created', { name: nameOf(saved.names, saved.key) }));
      onSaved(saved);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate>
      <Stack gap="field" maxW="2xl">
        {!agent && (
          <Field label={t('key')} required helperText={t('keyHint')}>
            <Input value={form.key} maxLength={40} dir="ltr" placeholder="triage" onChange={(e) => setForm({ ...form, key: e.target.value })} />
          </Field>
        )}
        <HStack gap="3" align="start" wrap="wrap">
          <Field label={t('name')} flex="1">
            <NamesField label={t('name')} value={form.names} placeholder={form.key} onChange={(names) => setForm({ ...form, names })} />
          </Field>
          <Field label={t('whatItDoes')} flex="1">
            <NamesField label={t('whatItDoes')} value={form.titles} placeholder={t('whatItDoesPlaceholder')} onChange={(titles) => setForm({ ...form, titles })} />
          </Field>
        </HStack>
        <Field label={t('instructions')} helperText={t('instructionsHint')}>
          <Textarea value={form.instructions} rows={6} maxLength={20000} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
        </Field>
        {agent && (
          <HStack gap="3" align="start" wrap="wrap">
            <Field label={t('modelAlias')} helperText={t('modelAliasHint')} flex="1">
              <Input value={form.modelAlias} maxLength={40} dir="ltr" onChange={(e) => setForm({ ...form, modelAlias: e.target.value })} />
            </Field>
            <Field label={t('transcriptDays')} helperText={t('transcriptDaysHint')} flex="1">
              <Input value={form.transcriptDays} inputMode="numeric" maxLength={3} dir="ltr" placeholder="30"
                onChange={(e) => setForm({ ...form, transcriptDays: e.target.value.replace(/\D/g, '') })} />
            </Field>
          </HStack>
        )}
        {site && (
          <>
            <SwitchField label={t('offerAll')} checked={form.offerAll} onCheckedChange={(c) => setForm({ ...form, offerAll: c })} />
            {!form.offerAll && (
              <Field label={t('offeredTo')} helperText={t('offeredToHint')}>
                <Input value={form.offeredTo} dir="ltr" placeholder="PAY, OPS" onChange={(e) => setForm({ ...form, offeredTo: e.target.value })} />
              </Field>
            )}
          </>
        )}
        {!agent && !site && roles && (
          <Field label={t('role')} helperText={t('roleHint')}>
            <SelectField value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value })} options={roles} />
          </Field>
        )}
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        <Button type="submit" variant="primary" alignSelf="flex-start" loading={action.busy} disabled={!agent && !form.key.trim()}>
          {agent ? t('save') : t('create')}
        </Button>
      </Stack>
    </form>
  );
}

/** Pause, or put back on: an agent's admins, and its responsible person may pause it. */
export function AgentPause({ agent, onChanged }: { agent: AgentInfo; onChanged: (agent: AgentInfo) => void }) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const paused = agent.state === 'paused';

  async function toggle() {
    const changed = await action.run(() => request<AgentInfo>(`/agents/${agent.id}/${paused ? 'resume' : 'pause'}`, { method: 'POST' }));
    if (changed) {
      notify.success(t(paused ? 'resumedToast' : 'pausedToast', { name: nameOf(changed.names, changed.key) }));
      onChanged(changed);
    }
  }

  return (
    <Stack gap="1">
      <Button size="sm" variant={paused ? 'primary' : 'secondary'} loading={action.busy} onClick={() => void toggle()} data-testid="agent-pause">
        {t(paused ? 'resume' : 'pause')}
      </Button>
      <InlineAlert tone="danger">{action.error}</InlineAlert>
    </Stack>
  );
}
