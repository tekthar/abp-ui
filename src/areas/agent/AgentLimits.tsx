import { useState } from 'react';
import { chakra, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Button, Field, HostSlot, InlineAlert, notify, useApiAction, useApiQuery, useAreaRequest, useFormatters, useSlotSaves } from '@abpjs/ui';
import { useAgentTexts } from './texts';
import { num, numOrNull, type AgentInfo, type AgentRunLimits, type AgentUsage, type AgentUsagePeriod } from './types';

/** A number field's text as a number, or null when it's empty. */
const numberOrNull = (text: string) => (text.trim() === '' ? null : Number(text));

/**
 * What an agent may do and what it spent, for its admins: its runs and their cost today and this month, and each run's
 * most turns, tool calls, working minutes and cost (the site's where a field is left empty). What it may spend on AI
 * (a gateway's limits) is the host's: `agent.limits.extra`, which joins this Save.
 */
export function AgentLimitsPanel({ agent, onSaved }: { agent: AgentInfo; onSaved: (agent: AgentInfo) => void }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('agent');
  const usage = useApiQuery<AgentUsage>('agent', `/agents/${agent.id}/usage`);
  const action = useApiAction();
  const slots = useSlotSaves();
  const site = agent.siteLimits;
  const own = agent.limits;
  const text = (v: number | string | null | undefined) => (numOrNull(v) == null ? '' : String(numOrNull(v)));
  const [run, setRun] = useState({ maxTurns: text(own?.maxTurns), maxToolCalls: text(own?.maxToolCalls), maxMinutes: text(own?.maxMinutes), maxRunCost: text(own?.maxRunCost) });
  const money = (n: number) => fmt.number(n, { maximumFractionDigits: 2 });

  async function save() {
    const saved = await action.run(async () => {
      const limits: AgentRunLimits = {
        maxTurns: numberOrNull(run.maxTurns),
        maxToolCalls: numberOrNull(run.maxToolCalls),
        maxMinutes: numberOrNull(run.maxMinutes),
        maxRunCost: numberOrNull(run.maxRunCost),
      };
      const changed = await request<AgentInfo>(`/agents/${agent.id}`, { method: 'PUT', body: { limits } });
      await slots.run();
      return changed;
    });
    if (saved) {
      notify.success(t('limits.saved'));
      await usage.reload();
      onSaved(saved);
    }
  }

  const fields: { key: keyof typeof run; label: string; site: number | null; step: string }[] = [
    { key: 'maxTurns', label: t('limits.turns'), site: numOrNull(site?.maxTurns), step: '1' },
    { key: 'maxToolCalls', label: t('limits.toolCalls'), site: numOrNull(site?.maxToolCalls), step: '1' },
    { key: 'maxMinutes', label: t('limits.minutes'), site: numOrNull(site?.maxMinutes), step: '1' },
    { key: 'maxRunCost', label: t('limits.runCost'), site: numOrNull(site?.maxRunCost), step: '0.01' },
  ];
  const period = (p: AgentUsagePeriod | undefined) =>
    p ? t('limits.spent', { runs: num(p.runs), failed: num(p.failed), cost: money(num(p.cost)) }) : '';

  return (
    <Stack gap="field" data-testid="agent-limits">
      <Stack gap="1">
        <Text fontWeight="medium">{t('limits.title')}</Text>
        <Text textStyle="caption" color="fg.muted">{t('limits.hint')}</Text>
      </Stack>
      <HStack gap="6" wrap="wrap" textStyle="sm">
        <Stack gap="0"><Text textStyle="caption" color="fg.muted">{t('limits.today')}</Text><Text>{period(usage.data?.today)}</Text></Stack>
        <Stack gap="0"><Text textStyle="caption" color="fg.muted">{t('limits.month')}</Text><Text>{period(usage.data?.month)}</Text></Stack>
      </HStack>
      <HostSlot name="agent.limits.extra" context={{ agent, register: slots.register }} />
      <chakra.div display="grid" gridTemplateColumns="repeat(auto-fill, minmax(11rem, 1fr))" gap="3" maxW="48rem">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input type="number" min="0" step={f.step} value={run[f.key]} placeholder={f.site == null ? t('limits.none') : t('limits.site', { value: f.site })}
              onChange={(e) => setRun({ ...run, [f.key]: e.target.value })} data-testid={`agent-limit-${f.key}`} />
          </Field>
        ))}
      </chakra.div>
      <InlineAlert tone="danger">{action.error ?? usage.error}</InlineAlert>
      <Button variant="primary" alignSelf="flex-start" onClick={() => void save()} loading={action.busy} data-testid="agent-limits-save">{t('limits.save')}</Button>
    </Stack>
  );
}
