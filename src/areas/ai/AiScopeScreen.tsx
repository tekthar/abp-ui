import { useMemo } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { InlineAlert, Loading, Panel, StatusPill, TextBone, TextSlot, useApiQuery, useNames } from '@abpjs/ui';
import { useHostKeepsConnections } from './AiAdmin';
import { AliasesPanel } from './AliasesPanel';
import { useLimitText } from './LimitsEditor';
import { ModelsPanel } from './ModelsPanel';
import { scopeModelRows } from './models';
import { useAiTexts } from './texts';
import { TryPanel } from './TryPanel';
import { scopeQuery, type AiAlias, type AiConnection, type AiLimit, type AiScopeAccess, type AiScopeView } from './types';
import { UsagePanel } from './UsagePanel';

/**
 * A scope's AI, for a host's own scope settings page (its header is the host's), from the scope's view (AbpAi.HttpApi
 * 0.8.0, for whoever administers the scope): what the site and the scopes above open to it, its own connections'
 * models while it may have them, its aliases over the ones from above, its limits inside theirs, its usage, and a
 * quick call through an alias.
 */
export function AiScopeScreen({ scopeId }: { scopeId: string }) {
  const t = useAiTexts();
  const limitText = useLimitText();
  const id = encodeURIComponent(scopeId);
  const view = useApiQuery<AiScopeView>('ai', `/scopes/${id}/view`);
  const access = useApiQuery<AiScopeAccess>('ai', `/scopes/${id}/access`);
  const v = view.data;
  // Its own connections, changed here unless the host keeps them.
  const own = useApiQuery<AiConnection[]>('ai', v?.mayConnect ? `/connections${scopeQuery(scopeId)}` : null);
  const aliases = useApiQuery<AiAlias[]>('ai', `/aliases${scopeQuery(scopeId)}`);
  const limits = useApiQuery<AiLimit[]>('ai', `/limits${scopeQuery(scopeId)}`);
  const hostKeeps = useHostKeepsConnections(v?.connectionsKeptByHost, scopeId);
  const rows = useMemo(() => (v ? scopeModelRows(v) : undefined), [v]);
  const a = access.data;
  // The limits from above, the site's then each scope's above it, in the view's order, under their own names.
  const above = useMemo(() => {
    const groups: { scopeId: string | null; limits: AiLimit[] }[] = [];
    for (const l of v?.limitsFromAbove ?? []) {
      const at = l.scopeId ?? null;
      const group = groups.find((g) => g.scopeId === at);
      if (group) group.limits.push(l);
      else groups.push({ scopeId: at, limits: [l] });
    }
    return groups;
  }, [v]);
  const scopeNames = useNames('scopes', useMemo(() => above.flatMap((g) => (g.scopeId ? [g.scopeId] : [])), [above]));
  // Its own aliases first, then the ones from above it doesn't replace.
  const aliasNames = useMemo(() => [...new Set([...(aliases.data ?? []), ...(v?.aliasesFromAbove ?? [])].map((x) => x.name))], [aliases.data, v]);

  if ((view.error && !v) || (access.error && !a)) return <InlineAlert tone="danger">{view.error ?? access.error}</InlineAlert>;
  const opened = a && (a.allSiteModels ? t('allModels') : a.siteModels.length ? t('someModels', { count: a.siteModels.length }) : t('noModelsOpen'));
  const lines = (list: AiLimit[] | undefined) =>
    !list ? <Text textStyle="sm"><TextBone width={24} /></Text>
      : list.length ? list.map((l) => <Text key={l.id} textStyle="sm">{limitText(l)}</Text>) : <Text textStyle="sm" color="fg.muted">{t('noLimits')}</Text>;

  return (
    <Loading when={!v || !a}>
      <Stack gap="section">
        <Panel title={t('projectAccessTitle')} description={t('projectAccessHint')} data-testid="ai-project-access">
          <Stack gap="2">
            <Text><StatusPill tone={a?.allSiteModels || a?.siteModels.length ? 'success' : 'neutral'}>{opened}</StatusPill></Text>
            <Text textStyle="sm"><TextSlot width={44}>{v && (v.mayConnect ? t('ownAllowed') : t('ownNotAllowed'))}</TextSlot></Text>
          </Stack>
        </Panel>
        {/* Its description says more once the scope may have connections of its own. */}
        <ModelsPanel scopeId={scopeId} connections={v?.mayConnect ? own.data ?? [] : []} rows={rows} loading={view.loading} hostKeeps={hostKeeps}
          onChanged={() => Promise.all([view.reload(), own.reload(), aliases.reload()]).then(() => undefined)}
          title={t('projectModelsTitle')} description={v?.mayConnect ? t('projectModelsOwnHint') : t('projectModelsHint')} />
        <AliasesPanel scopeId={scopeId} aliases={aliases.data} inherited={v?.aliasesFromAbove} models={rows ?? []} onSaved={aliases.reload} />
        <Panel title={t('tabs.limits')} description={t('projectLimitsReadHint')} data-testid="ai-project-limits">
          <Stack gap="3">
            <Stack gap="1">
              <Text textStyle="sm" fontWeight="medium">{t('thisProject')}</Text>
              {lines(limits.data)}
            </Stack>
            {!v || !above.some((g) => g.scopeId === null) ? (
              <Stack gap="1">
                <Text textStyle="sm" fontWeight="medium">{t('theSite')}</Text>
                {lines(v ? [] : undefined)}
              </Stack>
            ) : null}
            {above.map((g) => (
              <Stack key={g.scopeId ?? 'site'} gap="1">
                <Text textStyle="sm" fontWeight="medium">{g.scopeId ? scopeNames[g.scopeId] ?? g.scopeId : t('theSite')}</Text>
                {lines(g.limits)}
              </Stack>
            ))}
          </Stack>
        </Panel>
        <UsagePanel scopeId={scopeId} by={['model', 'purpose', 'account']} />
        {/* It starts from the first alias, so it starts again once they're in. */}
        <TryPanel key={aliases.data && v ? 'loaded' : 'loading'} scopeId={scopeId} aliases={aliasNames} />
      </Stack>
    </Loading>
  );
}
