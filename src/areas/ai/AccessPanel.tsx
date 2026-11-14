import { useEffect, useMemo, useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { Button, CheckboxField, DataTable, FormDialog, HostSlot, InlineAlert, notify, Panel, SearchInput, StatusPill, SwitchField, useApiAction, useApiQuery, useAreaRequest, useFormatters, useHost, useNames, useOptionalHost, useSlotSaves, type HostScope } from '@abpjs/ui';
import { LimitsEditor, saveLimits, type LimitRow } from './LimitsEditor';
import { modelKey, type AiModelRow } from './models';
import { useAiTexts } from './texts';
import { scopeQuery, type AiLimit, type AiScopeAccess, type AiScopeAccessInput } from './types';

type AccessRow = { scopeId: string; name: string; code?: string; access?: AiScopeAccess };

/** Every scope the host lists, as `scopes.search('')` gives them; none when it gives no scopes. */
function useAllScopes(): { scopes: HostScope[] | undefined; error: string | null } {
  const host = useHost();
  const [scopes, setScopes] = useState<HostScope[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!host.scopes) {
      setScopes([]);
      return;
    }
    host.scopes.search('').then((found) => alive && setScopes(found), (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [host]);
  return { scopes, error };
}

/**
 * What each scope may use: none by default; every model of the site's that's on, or some; its own connections; its
 * limits. Every scope the host lists, with the ones AbpAi has settings for that it didn't list named through
 * `scopes.name`. A host adds a column through the `ai.access.cell` slot and fields to the dialog through
 * `ai.access.editor`.
 */
export function AccessPanel({ models }: { models: AiModelRow[] }) {
  const t = useAiTexts();
  const list = useApiQuery<AiScopeAccess[]>('ai', '/scopes/access');
  const { scopes, error: scopesError } = useAllScopes();
  const extraCell = Boolean(useOptionalHost()?.slots?.['ai.access.cell']);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AccessRow | null>(null);
  const unnamed = useMemo(() => (list.data ?? []).map((a) => a.scopeId).filter((id) => !(scopes ?? []).some((s) => s.id === id)), [list.data, scopes]);
  const names = useNames('scopes', unnamed);
  const rows = useMemo<AccessRow[] | undefined>(() => {
    if (!list.data || !scopes) return undefined;
    const access = new Map(list.data.map((a) => [a.scopeId, a]));
    const listed: AccessRow[] = scopes.map((s) => ({ scopeId: s.id, name: s.name, code: s.code, access: access.get(s.id) }));
    const more: AccessRow[] = unnamed.map((id) => ({ scopeId: id, name: names[id] ?? id, access: access.get(id) }));
    return [...listed, ...more];
  }, [list.data, scopes, unnamed, names]);
  const needle = search.trim().toLowerCase();
  const shown = rows?.filter((p) => !needle || `${p.name} ${p.code ?? ''}`.toLowerCase().includes(needle));

  const opened = (a?: AiScopeAccess) =>
    a?.allSiteModels ? t('allModels') : a?.siteModels.length ? t('someModels', { count: a.siteModels.length }) : t('noModelsOpen');

  return (
    <Panel title={t('accessTitle')} description={t('accessHint')} flush data-testid="ai-access"
      actions={<SearchInput size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('findProject')} aria-label={t('findProject')} />}>
      <InlineAlert tone="danger">{list.error ?? scopesError}</InlineAlert>
      <DataTable
        aria-label={t('accessTitle')}
        rows={shown}
        loading={list.loading || scopes === undefined}
        getRowId={(p) => p.scopeId}
        empty={t('noProjects')}
        columns={[
          {
            id: 'project',
            header: t('project'),
            cell: (p) => <Stack gap="0"><Text fontWeight="medium">{p.name}</Text>{p.code && <Text textStyle="caption" color="fg.muted" dir="ltr">{p.code}</Text>}</Stack>,
          },
          {
            id: 'models',
            header: t('opened'),
            cell: (p) => <StatusPill tone={p.access?.allSiteModels || p.access?.siteModels.length ? 'success' : 'neutral'}>{opened(p.access)}</StatusPill>,
          },
          { id: 'own', header: t('ownConnections'), cell: (p) => (p.access?.mayConnect ? t('allowed') : t('notAllowed')) },
          ...(extraCell ? [{ id: 'host', header: t('ownSkills'), cell: (p: AccessRow) => <HostSlot name="ai.access.cell" context={{ scopeId: p.scopeId }} /> }] : []),
          { id: 'limits', header: t('tabs.limits'), numeric: true, cell: (p) => <LimitCount scopeId={p.scopeId} /> },
          { id: 'edit', header: <Text srOnly>{t('edit')}</Text>, align: 'end', cell: (p) => <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>{t('edit')}</Button> },
        ]}
      />
      {editing && <AccessEditor scope={editing} models={models} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await list.reload(); }} />}
    </Panel>
  );
}

/** How many limits a scope has. */
function LimitCount({ scopeId }: { scopeId: string }) {
  const fmt = useFormatters();
  const limits = useApiQuery<AiLimit[]>('ai', `/limits${scopeQuery(scopeId)}`);
  return <>{limits.data ? fmt.number(limits.data.length) : ''}</>;
}

function AccessEditor({ scope, models, onClose, onSaved }: { scope: AccessRow; models: AiModelRow[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const t = useAiTexts();
  const request = useAreaRequest('ai');
  const action = useApiAction();
  const slots = useSlotSaves();
  const limits = useApiQuery<AiLimit[]>('ai', `/limits${scopeQuery(scope.scopeId)}`);
  const usable = models.filter((m) => m.enabled);
  const [all, setAll] = useState(scope.access?.allSiteModels ?? false);
  const [picked, setPicked] = useState<string[]>((scope.access?.siteModels ?? []).map((m) => modelKey(m.connectionId, m.model)));
  const [own, setOwn] = useState(scope.access?.mayConnect ?? false);
  const [nextLimits, setNextLimits] = useState<LimitRow[] | null>(null);

  async function save() {
    const done = await action.run(async () => {
      const body: AiScopeAccessInput = {
        allSiteModels: all,
        siteModels: all ? [] : usable.filter((m) => picked.includes(m.key)).map((m) => ({ connectionId: m.connectionId, model: m.modelId })),
        mayConnect: own,
      };
      await request(`/scopes/${encodeURIComponent(scope.scopeId)}/access`, { method: 'PUT', body });
      if (nextLimits && limits.data) await saveLimits(request, scope.scopeId, limits.data, nextLimits);
      await slots.run();
      return true;
    });
    if (done) {
      notify.success(t('saved'));
      await onSaved();
    }
  }

  return (
    <FormDialog open onOpenChange={(open) => !open && onClose()} title={t('accessFor', { name: scope.name })} description={t('accessDialogHint')}
      submitLabel={t('save')} onSubmit={save} busy={action.busy} error={action.error} size="lg">
      <SwitchField label={t('openAll')} checked={all} onCheckedChange={setAll} />
      {!all && (
        <Stack gap="1.5" role="group" aria-labelledby="ai-access-models">
          <Text id="ai-access-models" textStyle="sm" fontWeight="medium">{t('openSome')}</Text>
          {usable.map((m) => (
            <CheckboxField key={m.key} label={`${m.name} · ${m.connection}`} checked={picked.includes(m.key)}
              onCheckedChange={(c) => setPicked(c ? [...picked, m.key] : picked.filter((x) => x !== m.key))} />
          ))}
          {usable.length === 0 && <Text textStyle="sm" color="fg.muted">{t('noModelsOn')}</Text>}
        </Stack>
      )}
      <SwitchField label={t('allowOwn')} checked={own} onCheckedChange={setOwn} />
      <HostSlot name="ai.access.editor" context={{ scopeId: scope.scopeId, register: slots.register }} />
      <Stack gap="2">
        <Text textStyle="sm" fontWeight="medium">{t('projectLimits')}</Text>
        <Text textStyle="sm" color="fg.muted">{t('projectLimitsHint')}</Text>
        {limits.data && <LimitsEditor limits={limits.data} onChange={setNextLimits} error={limits.error} />}
      </Stack>
    </FormDialog>
  );
}
