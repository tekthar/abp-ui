import { Box, Input, Stack, Text } from '@chakra-ui/react';
import { EmptyState, Panel, SelectField, StatusPill, useApiQuery } from '@abpjs/ui';
import { AgentQuestionCard } from './AgentRuns';
import { ItemHrefProvider, ItemLink, type ItemHref } from './links';
import { useNameOf } from './names';
import { useAgentTexts } from './texts';
import type { AgentQuestionInfo, ScopeAgentInfo } from './types';

/**
 * Picks an agent by its key, for a workflow step or a rule that asks one: the agents a scope has taken on. A key kept
 * from before that isn't there any more stays shown, so nothing changes until someone picks again. Where the list can't
 * be read (the reader doesn't manage the scope), the key is typed.
 */
export function AgentSelect({ scope, value, onChange, disabled, anyLabel }: {
  scope: string;
  value: string;
  onChange: (key: string | undefined) => void;
  disabled?: boolean;
  /** The empty choice's label when empty means any agent (a trigger); otherwise empty is "choose one". */
  anyLabel?: string;
}) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const agents = useApiQuery<ScopeAgentInfo[]>('agent', `/scopes/${encodeURIComponent(scope)}/agents`);

  if (agents.error)
    return <Input size="sm" dir="ltr" disabled={disabled} defaultValue={value} placeholder={t('select.key')} onBlur={(e) => onChange(e.target.value.trim() || undefined)} />;

  const taken = (agents.data ?? []).filter((a) => a.own || a.roleKey).map((a) => a.agent);
  const options = taken.map((a) => {
    const name = nameOf(a.names, a.key);
    return { value: a.key, label: `${name === a.key ? a.key : `${name} (${a.key})`}${a.state === 'paused' ? ` · ${t('select.paused')}` : ''}` };
  });
  if (value && !taken.some((a) => a.key === value)) options.push({ value, label: t('select.notHere', { key: value }) });

  return (
    <Stack gap="1">
      <SelectField size="sm" disabled={disabled} loading={agents.loading && !agents.data} value={value} onChange={(e) => onChange(e.target.value || undefined)}
        options={[{ value: '', label: anyLabel ?? t('select.choose') }, ...options]} data-testid="agent-select" />
      {agents.data && taken.length === 0 && <Text textStyle="caption" color="fg.muted">{t('select.none')}</Text>}
    </Stack>
  );
}

/**
 * Says an account is an agent's, wherever a person's name is shown (pickers, history), so nobody mistakes an agent for
 * a colleague. Nothing for a person or a service account. The label is the host's (`label`), "Agent" by default.
 */
export function AgentBadge({ person, label }: { person: { kind?: string | null } | null | undefined; label?: string }) {
  const t = useAgentTexts();
  if (person?.kind !== 'agent') return null;
  return <StatusPill tone="info" dot={false} data-testid="agent-badge">{label ?? t('agentLabel')}</StatusPill>;
}

/** The questions agents' runs wait for the person to answer, oldest first, each with its item and its answers. */
export function AgentQuestionsPanel({ itemHref }: { itemHref?: ItemHref }) {
  const t = useAgentTexts();
  const questions = useApiQuery<AgentQuestionInfo[]>('agent', '/questions');
  return (
    <ItemHrefProvider value={itemHref}>
      <Panel title={t('mine.title')} description={t('mine.hint')} data-testid="agent-questions">
        {questions.data?.length === 0 ? (
          <EmptyState size="sm" title={t('mine.none')} />
        ) : (
          <Stack gap="4" as="ul" listStyleType="none">
            {(questions.data ?? []).map((q) => (
              <Box as="li" key={q.id}>
                <Stack gap="1.5">
                  <Text textStyle="sm" fontWeight="medium">
                    {q.agent?.displayName ?? q.agentKey}
                    {q.itemKey && <> · <ItemLink kind={q.itemKind} itemKey={q.itemKey} /></>}
                  </Text>
                  <AgentQuestionCard question={q} onAnswered={questions.reload} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Panel>
    </ItemHrefProvider>
  );
}
