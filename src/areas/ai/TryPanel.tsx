import { useId, useState } from 'react';
import { HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react';
import { Button, Field, InlineAlert, Panel, useApiAction, useAreaRequest, useFormatters } from '@abpjs/ui';
import { useAiTexts } from './texts';
import { num, type AiTryInput, type AiTryReply } from './types';

/**
 * A quick call through an alias, as the person: through the same access, limits and data rules as any call, and on
 * the ledger (AbpAi.HttpApi 0.8.0's `try`, for those who administer the site or the scope).
 */
export function TryPanel({ scopeId, aliases }: { scopeId?: string; aliases: string[] }) {
  const t = useAiTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('ai');
  const action = useApiAction();
  const [alias, setAlias] = useState(aliases[0] ?? '');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AiTryReply | null>(null);
  // Its own list's id: two panels on one page don't share one.
  const listId = useId();

  async function run() {
    setResult(null);
    const body: AiTryInput = { alias: alias.trim(), prompt, scopeId: scopeId ?? null };
    const answer = await action.run(() => request<AiTryReply>('/try', { method: 'POST', body }));
    if (answer) setResult(answer);
  }

  return (
    <Panel title={t('tryTitle')} description={t('tryHint')} data-testid="ai-try">
      <Stack gap="field">
        <Field label={t('alias')}>
          <Input value={alias} dir="ltr" list={listId} onChange={(e) => setAlias(e.target.value)} />
          <datalist id={listId}>{aliases.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label={t('prompt')}>
          <Textarea value={prompt} rows={3} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <HStack><Button onClick={() => void run()} loading={action.busy} disabled={!alias.trim() || !prompt.trim()}>{t('run')}</Button></HStack>
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {result && (
          <Stack gap="1" data-testid="ai-try-answer">
            <Text whiteSpace="pre-wrap" dir="auto">{result.text}</Text>
            <Text textStyle="caption" color="fg.muted">
              {t('answered', {
                model: result.model,
                input: fmt.number(num(result.usage.inputTokens)),
                output: fmt.number(num(result.usage.outputTokens)),
                cost: fmt.number(num(result.usage.cost), { maximumFractionDigits: 6 }),
              })}
            </Text>
          </Stack>
        )}
      </Stack>
    </Panel>
  );
}
