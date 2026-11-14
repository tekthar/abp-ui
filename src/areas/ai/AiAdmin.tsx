import { useMemo } from 'react';
import { Stack, Tabs } from '@chakra-ui/react';
import { InlineAlert, notify, Panel, useApiAction, useApiQuery, useAreaRequest, useCan } from '@abpjs/ui';
import { AccessPanel } from './AccessPanel';
import { AliasesPanel } from './AliasesPanel';
import { ExportsPanel } from './ExportsPanel';
import { LimitsEditor, saveLimits, type LimitRow } from './LimitsEditor';
import { ModelsPanel } from './ModelsPanel';
import { modelRows } from './models';
import { TryPanel } from './TryPanel';
import { useAiTexts } from './texts';
import type { AiAlias, AiConnection, AiLimit, AiSite } from './types';
import { UsagePanel } from './UsagePanel';

/**
 * Whether the host keeps the connections itself (AbpAi's `IAiConnectionSource`), so the screens don't change them: the
 * server's word (`connectionsKeptByHost`, AbpAi.HttpApi 0.8.0, on the site's settings or a scope's view).
 */
export function useHostKeepsConnections(told: boolean | null | undefined, scopeId?: string): boolean {
  const can = useCan();
  // A server that doesn't say (before 0.8.0): the host's right instead. Goes at @abpjs/ui 0.2.0.
  return told ?? !can('ai.connections.edit', scopeId);
}

/**
 * The site's AI in tabs: the models each connection offers, the site's aliases, what each scope may use and its
 * limits, the site's limits, the usage ledger, a quick call to try an alias, and exports of calls.
 */
export function AiAdmin() {
  const t = useAiTexts();
  const request = useAreaRequest('ai');
  const site = useApiQuery<AiSite>('ai', '/site');
  const connections = useApiQuery<AiConnection[]>('ai', '/connections');
  const aliases = useApiQuery<AiAlias[]>('ai', '/aliases');
  const limits = useApiQuery<AiLimit[]>('ai', '/limits');
  const saving = useApiAction();
  const hostKeeps = useHostKeepsConnections(site.data?.connectionsKeptByHost);
  const models = useMemo(() => modelRows(connections.data ?? []), [connections.data]);

  async function saveSiteLimits(rows: LimitRow[]) {
    if (await saving.run(() => saveLimits(request, null, limits.data ?? [], rows).then(() => true)) !== undefined) {
      notify.success(t('saved'));
      await limits.reload();
    }
  }

  return (
    <Tabs.Root defaultValue="models" variant="line" lazyMount>
      <Tabs.List mb="section" overflowX="auto" overflowY="hidden">
        <Tabs.Trigger value="models">{t('tabs.models')}</Tabs.Trigger>
        <Tabs.Trigger value="aliases">{t('tabs.aliases')}</Tabs.Trigger>
        <Tabs.Trigger value="access">{t('tabs.access')}</Tabs.Trigger>
        <Tabs.Trigger value="limits">{t('tabs.limits')}</Tabs.Trigger>
        <Tabs.Trigger value="usage">{t('tabs.usage')}</Tabs.Trigger>
        <Tabs.Trigger value="try">{t('tabs.try')}</Tabs.Trigger>
        <Tabs.Trigger value="exports">{t('tabs.exports')}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="models">
        <Stack gap="section">
          <InlineAlert tone="danger">{connections.error}</InlineAlert>
          {connections.data && connections.data.length === 0 && <InlineAlert tone="info">{t('noProviders')}</InlineAlert>}
          <ModelsPanel connections={connections.data} loading={connections.loading} hostKeeps={hostKeeps}
            onChanged={() => Promise.all([connections.reload(), aliases.reload()]).then(() => undefined)} title={t('modelsTitle')} description={t('modelsHint')} />
        </Stack>
      </Tabs.Content>
      <Tabs.Content value="aliases">
        <AliasesPanel aliases={aliases.data} models={models} onSaved={aliases.reload} />
      </Tabs.Content>
      <Tabs.Content value="access">
        <AccessPanel models={models} />
      </Tabs.Content>
      <Tabs.Content value="limits">
        <Panel title={t('siteLimitsTitle')} description={t('siteLimitsHint')}>
          {limits.data && <LimitsEditor limits={limits.data} onSave={saveSiteLimits} busy={saving.busy} error={saving.error ?? limits.error} />}
        </Panel>
      </Tabs.Content>
      <Tabs.Content value="usage">
        <UsagePanel by={['project', 'model', 'purpose', 'account']} />
      </Tabs.Content>
      <Tabs.Content value="try">
        <TryPanel aliases={(aliases.data ?? []).map((a) => a.name)} />
      </Tabs.Content>
      <Tabs.Content value="exports">
        <ExportsPanel />
      </Tabs.Content>
    </Tabs.Root>
  );
}
