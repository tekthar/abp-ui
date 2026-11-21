import { useMemo, useState } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { AddButton, Button, Field, IconButton, InlineAlert, notify, Panel, SelectField, useApiAction, useAreaRequest } from '@abpjs/ui';
import { modelKey, type AiModelRow } from './models';
import { useAiTexts } from './texts';
import { scopeQuery, type AiAlias, type AiAliasTarget } from './types';

type AliasRow = { name: string; key: string; rest: AiAliasTarget[] };

const target = (key: string): AiAliasTarget => {
  const at = key.indexOf(':');
  const model = key.slice(at + 1);
  return { connectionId: key.slice(0, at), model: model || null };
};

/**
 * Aliases ("fast", "smart"): what skills and steps name. The site's or a scope's own are edited here, each to its first
 * model (the ones after it, if any, stay as they are); a scope also sees the aliases it gets from above that it doesn't
 * replace (`inherited`).
 */
export function AliasesPanel({ scopeId, aliases, inherited, models, onSaved }: {
  scopeId?: string;
  aliases: AiAlias[] | undefined;
  inherited?: AiAlias[];
  models: AiModelRow[];
  onSaved: () => Promise<void> | void;
}) {
  const t = useAiTexts();
  const request = useAreaRequest('ai');
  const action = useApiAction();
  const own = useMemo<AliasRow[]>(
    () => (aliases ?? []).map((a) => ({ name: a.name, key: a.targets[0] ? modelKey(a.targets[0].connectionId, a.targets[0].model) : '', rest: a.targets.slice(1) })),
    [aliases],
  );
  const [draft, setDraft] = useState<AliasRow[] | null>(null);
  const rows = draft ?? own;
  const usable = models.filter((m) => m.enabled);
  const label = (key: string) => usable.find((m) => m.key === key) ?? models.find((m) => m.key === key);
  const options = [{ value: '', label: t('pickModel') }, ...usable.map((m) => ({ value: m.key, label: `${m.name} · ${m.connection}` }))];
  const shownInherited = (inherited ?? []).filter((a) => !rows.some((r) => r.name.trim().toLowerCase() === a.name));

  async function save() {
    const next = rows.map((r) => ({ ...r, name: r.name.trim().toLowerCase() }));
    const done = await action.run(async () => {
      for (const a of own) {
        if (!next.some((r) => r.name === a.name)) await request(`/aliases/${encodeURIComponent(a.name)}${scopeQuery(scopeId)}`, { method: 'DELETE' });
      }
      for (const r of next) {
        const before = own.find((a) => a.name === r.name);
        if (before && before.key === r.key) continue;
        await request(`/aliases/${encodeURIComponent(r.name)}${scopeQuery(scopeId)}`, { method: 'PUT', body: [target(r.key), ...r.rest] });
      }
      return true;
    });
    if (done) {
      notify.success(t('saved'));
      setDraft(null);
      await onSaved();
    }
  }

  return (
    <Panel title={t('aliasesTitle')} description={scopeId ? t('aliasesProjectHint') : t('aliasesHint')} data-testid="ai-aliases"
      actions={<Button size="sm" onClick={() => void save()} loading={action.busy} disabled={draft === null}>{t('save')}</Button>}>
      <Stack gap="3">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {rows.map((r, i) => (
          <HStack key={i} gap="2" alignItems="end">
            <Field label={i === 0 ? t('alias') : undefined} flex="1">
              <Input value={r.name} dir="ltr" maxLength={40} placeholder="fast" aria-label={t('alias')}
                onChange={(e) => setDraft(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            </Field>
            <Field label={i === 0 ? t('model') : undefined} flex="2">
              <SelectField value={r.key} options={options} aria-label={t('model')}
                onChange={(e) => setDraft(rows.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            </Field>
            <IconButton remove aria-label={t('removeAlias', { name: r.name || '…' })} size="sm" onClick={() => setDraft(rows.filter((_, j) => j !== i))}>
              <Trash2 />
            </IconButton>
          </HStack>
        ))}
        {rows.length === 0 && <Text textStyle="sm" color="fg.muted">{t('noAliases')}</Text>}
        <HStack>
          <AddButton onClick={() => setDraft([...rows, { name: '', key: usable[0]?.key ?? '', rest: [] }])} disabled={usable.length === 0}>{t('addAlias')}</AddButton>
          {usable.length === 0 && <Text textStyle="sm" color="fg.muted">{t('noUsable')}</Text>}
        </HStack>
        {shownInherited.length > 0 && (
          <Stack gap="1">
            <Text textStyle="sm" fontWeight="medium">{t('fromSite')}</Text>
            {shownInherited.map((a) => {
              const first = a.targets[0] ? modelKey(a.targets[0].connectionId, a.targets[0].model) : '';
              const m = label(first);
              return (
                <Text key={a.name} textStyle="sm">
                  <Text as="span" fontFamily="mono" dir="ltr">{a.name}</Text> → {m?.name ?? a.targets[0]?.model ?? ''}
                  {!usable.some((u) => u.key === first) && <Text as="span" color="fg.muted"> ({t('notOpenHere')})</Text>}
                </Text>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Panel>
  );
}
