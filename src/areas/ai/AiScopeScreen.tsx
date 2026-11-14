import { useMemo } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { HostSlot, InlineAlert, Loading, Panel, StatusPill, TextBone, TextSlot, useApiQuery } from '@abpjs/ui';
import { useHostKeepsConnections } from './AiAdmin';
import { AliasesPanel } from './AliasesPanel';
import { useLimitText } from './LimitsEditor';
import { ModelsPanel } from './ModelsPanel';
import { modelKey, modelRows } from './models';
import { useAiTexts } from './texts';
import { scopeQuery, type AiAlias, type AiConnection, type AiLimit, type AiScopeAccess } from './types';
import { UsagePanel } from './UsagePanel';

/**
 * A scope's AI, for a host's own scope settings page (its header is the host's): what the site opens to it, its own
 * connections' models while it may have them, its aliases, its limits inside the site's, its usage, and a quick call
 * through an alias (the host's `ai.try`). The site's models and limits show where the person may read the site's.
 */
export function AiScopeScreen({ scopeId }: { scopeId: string }) {
  const t = useAiTexts();
  const limitText = useLimitText();
  const access = useApiQuery<AiScopeAccess>('ai', `/scopes/${encodeURIComponent(scopeId)}/access`);
  const own = useApiQuery<AiConnection[]>('ai', access.data?.mayConnect ? `/connections${scopeQuery(scopeId)}` : null);
  const site = useApiQuery<AiConnection[]>('ai', '/connections');
  const aliases = useApiQuery<AiAlias[]>('ai', `/aliases${scopeQuery(scopeId)}`);
  const limits = useApiQuery<AiLimit[]>('ai', `/limits${scopeQuery(scopeId)}`);
  const siteLimits = useApiQuery<AiLimit[]>('ai', '/limits');
  const hostKeeps = useHostKeepsConnections(undefined, scopeId);
  const a = access.data;

  // The site's models it may use (when the person may read the site's connections), then its own.
  const rows = useMemo(() => {
    const opened = new Set((a?.siteModels ?? []).map((m) => modelKey(m.connectionId, m.model)));
    const fromSite = modelRows(site.data ?? []).filter((m) => m.enabled && (a?.allSiteModels || opened.has(m.key)));
    return [...fromSite, ...modelRows(own.data ?? [])];
  }, [a, site.data, own.data]);

  if (access.error && !a) return <InlineAlert tone="danger">{access.error}</InlineAlert>;
  const opened = a && (a.allSiteModels ? t('allModels') : a.siteModels.length ? t('someModels', { count: a.siteModels.length }) : t('noModelsOpen'));
  const lines = (list: AiLimit[] | undefined) =>
    !list ? <Text textStyle="sm"><TextBone width={24} /></Text>
      : list.length ? list.map((l) => <Text key={l.id} textStyle="sm">{limitText(l)}</Text>) : <Text textStyle="sm" color="fg.muted">{t('noLimits')}</Text>;

  return (
    <Loading when={!a}>
      <Stack gap="section">
        <Panel title={t('projectAccessTitle')} description={t('projectAccessHint')} data-testid="ai-project-access">
          <Stack gap="2">
            <Text><StatusPill tone={a?.allSiteModels || a?.siteModels.length ? 'success' : 'neutral'}>{opened}</StatusPill></Text>
            <Text textStyle="sm"><TextSlot width={44}>{a && (a.mayConnect ? t('ownAllowed') : t('ownNotAllowed'))}</TextSlot></Text>
          </Stack>
        </Panel>
        {/* Its description says more once the scope may have connections of its own. */}
        <ModelsPanel scopeId={scopeId} connections={a?.mayConnect ? own.data ?? [] : []} rows={rows} loading={own.loading} hostKeeps={hostKeeps}
          onChanged={() => Promise.all([own.reload(), aliases.reload()]).then(() => undefined)}
          title={t('projectModelsTitle')} description={a?.mayConnect ? t('projectModelsOwnHint') : t('projectModelsHint')} />
        <AliasesPanel scopeId={scopeId} aliases={aliases.data} models={rows} onSaved={aliases.reload} />
        <Panel title={t('tabs.limits')} description={t('projectLimitsReadHint')} data-testid="ai-project-limits">
          <Stack gap="3">
            <Stack gap="1">
              <Text textStyle="sm" fontWeight="medium">{t('thisProject')}</Text>
              {lines(limits.data)}
            </Stack>
            {!siteLimits.error && (
              <Stack gap="1">
                <Text textStyle="sm" fontWeight="medium">{t('theSite')}</Text>
                {lines(siteLimits.data)}
              </Stack>
            )}
          </Stack>
        </Panel>
        <UsagePanel scopeId={scopeId} by={['model', 'purpose', 'account']} />
        <HostSlot name="ai.try" context={{ scopeId, aliases: (aliases.data ?? []).map((x) => x.name) }} />
      </Stack>
    </Loading>
  );
}
