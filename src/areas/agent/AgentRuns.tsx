import { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { Bot, ChevronDown, ChevronRight, Square } from 'lucide-react';
import { Button, DirectionalIcon, HostSlot, Panel, StatusPill, useApiAction, useApiQuery, useAreaRequest, useFormatters, useOptionalHost } from '@abpjs/ui';
import { useAgentTexts } from './texts';
import { GOING, itemPath, RUN_TONES, type AgentQuestionInfo, type AgentRunInfo } from './types';

/**
 * An agent's words (its reply, a chat's text as it's written), which are Markdown: drawn by the host's own renderer
 * (`agent.markdown`, `{ source }`), which keeps its own rules on links and remote images; as plain text otherwise.
 */
export function AgentText({ source, testId }: { source: string; testId?: string }) {
  const drawn = Boolean(useOptionalHost()?.slots?.['agent.markdown']);
  return (
    <Box textStyle="sm" dir="auto" data-testid={testId}>
      {drawn ? <HostSlot name="agent.markdown" context={{ source }} /> : <Text whiteSpace="pre-wrap">{source}</Text>}
    </Box>
  );
}

/**
 * What let a step that changes things run without asking (a step's "allowed"): its settings, the standing permission of
 * the person who started the run, an earlier "Allow for this run", or the question's answer.
 */
const allowedKey = (allowed: string) =>
  allowed === 'settings' ? 'settings' : allowed.startsWith('always:') ? 'always' : allowed === 'this-run' ? 'thisRun' : 'answer';

/**
 * What a waiting run asks: the tool, the item, why, and what it would be given. Whoever it asks answers: allow it once,
 * for the rest of the run, always (their own runs of this agent with this tool in this scope), or refuse it. Others see
 * that it waits, and for whom.
 */
export function AgentQuestionCard({ question, onAnswered }: { question: AgentQuestionInfo; onAnswered: () => Promise<void> | void }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const answers = ['allow', 'allow-run', ...(question.canAlways ? ['always'] : []), 'refuse'];

  async function answer(a: string) {
    if (await action.run(() => request<AgentRunInfo>(`/questions/${question.id}/answer`, { method: 'POST', body: { answer: a } }))) await onAnswered();
  }

  return (
    <Stack gap="1.5" ms="5" p="2.5" borderWidth="1px" borderColor="border.accent" borderRadius="l2" data-testid="agent-question">
      <Text textStyle="sm" fontWeight="medium">{t('runs.asks', { tool: question.tool, target: question.target ?? question.itemKey ?? '' })}</Text>
      {question.why && <Text textStyle="caption" color="fg.muted">{question.why}</Text>}
      {question.input && <Text textStyle="caption" color="fg.subtle" fontFamily="mono" whiteSpace="pre-wrap" lineClamp={6} dir="ltr">{question.input}</Text>}
      {question.canAnswer ? (
        <HStack gap="1.5" wrap="wrap">
          {answers.map((a) => (
            <Button key={a} size="xs" variant={a === 'refuse' ? 'ghost' : a === 'allow' ? 'primary' : 'secondary'} danger={a === 'refuse'}
              loading={action.busy} onClick={() => void answer(a)} data-testid={`agent-answer-${a}`}>
              {t(`runs.answers.${a}`)}
            </Button>
          ))}
          <Text as="span" textStyle="caption" color="fg.muted">{t('runs.expires', { at: fmt.dateTime(question.expiresAt) })}</Text>
        </HStack>
      ) : (
        <Text textStyle="caption" color="fg.muted">{t('runs.waitsFor', { person: question.askedOf?.displayName ?? '' })}</Text>
      )}
      {action.error && <Text textStyle="caption" color="fg.error">{action.error}</Text>}
    </Stack>
  );
}

/** One run: who, how it's going, its question, its answer, and its steps; Stop while it goes; the host's actions after. */
function RunRow({ run, onChanged }: { run: AgentRunInfo; onChanged: () => Promise<void> }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const [open, setOpen] = useState(false);
  const going = GOING.has(run.state);
  const tools = run.steps.filter((s) => s.kind === 'tool');

  async function stop() {
    if (await action.run(() => request<AgentRunInfo>(`/runs/${run.id}/stop`, { method: 'POST' }))) await onChanged();
  }

  return (
    <Stack gap="1">
      <HStack gap="2" align="start">
        <HStack gap="2" wrap="wrap" flex="1" minW="0">
          <Bot size={14} aria-hidden />
          <Text as="span" fontWeight="medium">{run.agent?.displayName ?? run.agentKey}</Text>
          <StatusPill tone={RUN_TONES[run.state] ?? 'neutral'}>{t(`runs.states.${run.state}`)}</StatusPill>
          {run.outside && <StatusPill tone="warning">{t('runs.outside')}</StatusPill>}
          {run.wide && <StatusPill tone="warning">{t('runs.wide')}</StatusPill>}
          <Text as="span" textStyle="caption" color="fg.muted">
            {fmt.dateTime(run.createdAt)} · {t(`runs.triggers.${run.trigger}`)}{run.startedBy ? ` · ${run.startedBy.displayName}` : ''}
          </Text>
        </HStack>
        <HStack gap="1" flexShrink={0}>
          {going && (
            <Button size="xs" variant="ghost" onClick={() => void stop()} loading={action.busy} data-testid="agent-run-stop">
              <Square />
              {t('runs.stop')}
            </Button>
          )}
          {!going && <HostSlot name="agent.run.actions" context={{ run, onChanged }} />}
        </HStack>
      </HStack>
      {run.question && <AgentQuestionCard question={run.question} onAnswered={onChanged} />}
      {run.answer && <Box ps="5"><AgentText source={run.answer} /></Box>}
      {run.error && <Text ps="5" textStyle="caption" color={run.state === 'failed' ? 'fg.error' : 'fg.muted'}>{run.error}</Text>}
      {tools.length > 0 && (
        <Box ps="5">
          <Button size="xs" variant="link" px="0" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <ChevronDown /> : <DirectionalIcon><ChevronRight /></DirectionalIcon>}
            {t('runs.steps', { count: tools.length })}
          </Button>
          {open && (
            <Stack gap="1" mt="1" as="ol" listStyleType="none">
              {tools.map((s) => (
                <Box as="li" key={String(s.number)}>
                  <Text textStyle="caption" color={s.outcome === 'failed' || s.outcome === 'refused' ? 'fg.error' : 'fg.muted'}>
                    {s.name}{s.target ? ` · ${s.target}` : ''}: {t(`runs.outcomes.${s.outcome}`)}
                    {s.allowed && ` · ${allowedKey(s.allowed) === 'always' ? t('runs.allowed.always', { name: run.startedBy?.displayName ?? '' }) : t(`runs.allowed.${allowedKey(s.allowed)}`)}`}
                  </Text>
                  {run.transcript && s.output && <Text textStyle="caption" color="fg.subtle" fontFamily="mono" whiteSpace="pre-wrap" lineClamp={4} dir="ltr">{s.output}</Text>}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Stack>
  );
}

/**
 * Agents' runs on an item (a record, an asset, a ticket), newest first: who asked, how it went, its answer, and each
 * step, with what it gave back for whoever may read the transcript. A run still going can be stopped; after it ends, the
 * host's actions (`agent.run.actions`: "Undo this run"). It keeps itself current while a run goes, and nothing shows
 * while there are none. `version` asks again when the host bumps it; `onChanged` tells it a run ended (the item may
 * have changed).
 */
export function ItemAgentRuns({ kind, itemKey, version = 0, onChanged, title, description }: {
  kind: string;
  itemKey: string;
  version?: number;
  onChanged?: () => void;
  title?: string;
  description?: string;
}) {
  const t = useAgentTexts();
  const runs = useApiQuery<AgentRunInfo[]>('agent', `${itemPath(kind, itemKey)}/runs`);
  const { reload } = runs;
  const going = runs.data?.some((r) => GOING.has(r.state)) ?? false;
  useEffect(() => {
    if (version > 0) void reload();
  }, [version, reload]);
  useEffect(() => {
    if (!going) return;
    const timer = setInterval(() => void reload(), 2000);
    return () => clearInterval(timer);
  }, [going, reload]);
  const [wasGoing, setWasGoing] = useState(false);
  useEffect(() => {
    if (wasGoing && !going) onChanged?.();
    setWasGoing(going);
    // Only when the last run ends: the item may have changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [going]);
  if (!runs.data?.length) return null;

  return (
    <Panel title={title ?? t('runs.title')} description={description ?? t('runs.hint')} flush data-testid="item-agent-runs">
      <Stack gap="0" as="ol" listStyleType="none" aria-label={title ?? t('runs.title')}>
        {runs.data.map((run, i) => (
          <Box as="li" key={run.id} px="panel" py="2.5" borderTopWidth={i === 0 ? '0' : '1px'} borderColor="border.muted">
            <RunRow run={run} onChanged={async () => { await reload(); onChanged?.(); }} />
          </Box>
        ))}
      </Stack>
    </Panel>
  );
}
