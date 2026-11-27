import { useMemo, useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { Globe, Pencil, Trash2 } from 'lucide-react';
import {
  AppLink,
  Button,
  DataTable,
  EmptyState,
  Field,
  FormDialog,
  IconTile,
  InlineAlert,
  notify,
  PageHeader,
  Panel,
  PreviewCard,
  RecordKey,
  RowMenu,
  SelectField,
  StatusPill,
  errorText,
  useAbpLocale,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useFormatters,
} from '@abpjs/ui';
import { placeKept, placesOffering, rolesOffered } from './anonymousRules';
import { useGuardNs } from './texts';
import type { AnonymousGrantDto, AnonymousPlaceDto, AnonymousRoleDto } from './types';

export interface AnonymousScreenProps {
  /** A role the host ships, named in the reader's language (`key`, the server's `name`); the server's name otherwise. */
  roleName?: (key: string, name: string) => string;
  /** What a role the host ships lets one do, in the reader's language (the dialog's "Can"); the server's otherwise. */
  roleDescription?: (key: string, description: string | null) => string | null | undefined;
}

/** The dialog: giving a role in a place, or changing the role of one grant (its place fixed). */
type Editing = { mode: 'give' } | { mode: 'change'; grant: AnonymousGrantDto; place: AnonymousPlaceDto };

/**
 * Anonymous access, for site admins: every role given to anonymous visitors, in one place, because anyone on the
 * internet gets it. "Give a role" picks a role and one of the places the host lists (AbpGuard's `GET /anonymous/places`):
 * a place offers only the roles that keep to it, and the server checks again. A row's menu changes its role in one step
 * or removes it. A grant made elsewhere (a place's members) shows here too, named as the host names its scope.
 */
export function AnonymousScreen({ roleName, roleDescription }: AnonymousScreenProps = {}) {
  const t = useGuardNs('anonymousAccess');
  const fmt = useFormatters();
  const { locale } = useAbpLocale();
  const confirm = useConfirm();
  const request = useAreaRequest('guard');
  const action = useApiAction();
  const grants = useApiQuery<AnonymousGrantDto[]>('guard', '/anonymous');
  const places = useApiQuery<AnonymousPlaceDto[]>('guard', '/anonymous/places');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [roleId, setRoleId] = useState('');
  const [scopeKey, setScopeKey] = useState('');

  const placeOf = useMemo(() => new Map((places.data ?? []).map((p) => [p.scopeKey, p])), [places.data]);
  const nameOf = (r: Pick<AnonymousRoleDto, 'key' | 'name'> & { names?: Record<string, string> }) =>
    r.names?.[locale] ?? roleName?.(r.key, r.name) ?? r.name;
  const grantRole = (g: AnonymousGrantDto) => roleName?.(g.roleKey, g.roleName) ?? g.roleName;
  // A place the host lists names itself (its name, its code); a scope it doesn't is named as its describer says.
  const whereOf = (g: AnonymousGrantDto) => {
    const place = g.scopeKey ? placeOf.get(g.scopeKey) : undefined;
    return { label: place?.label ?? g.scope ?? g.scopeKey ?? '', code: place?.code ?? g.code ?? null, href: place?.href ?? g.href };
  };

  // The roles offered: the place's when one is chosen, else every role some place offers (each once).
  const chosenPlace = editing?.mode === 'change' ? editing.place : placeOf.get(scopeKey);
  const roleOptions = useMemo(() => rolesOffered(places.data ?? [], chosenPlace), [chosenPlace, places.data]);
  const chosenRole = roleOptions.find((r) => r.id === roleId);
  // The places offered: those whose roles include the chosen one.
  const placeOptions = placesOffering(places.data ?? [], roleId);

  function open(next: Editing) {
    setEditing(next);
    setRoleId(next.mode === 'change' ? (next.grant.roleId ?? '') : '');
    setScopeKey(next.mode === 'change' ? next.place.scopeKey : '');
    action.setError(null);
  }

  async function save() {
    if (!editing) return;
    const done = await action.run(() =>
      editing.mode === 'give'
        ? request('/anonymous', { method: 'POST', body: { roleId, scopeKey } })
        : request(`/anonymous/${editing.grant.id}`, { method: 'PUT', body: { roleId } }),
    );
    if (done === undefined) return;
    notify.success(editing.mode === 'give' ? t('given') : t('changed'));
    setEditing(null);
    await grants.reload();
  }

  async function remove(g: AnonymousGrantDto) {
    const where = whereOf(g);
    if (!(await confirm({ title: t('revokeTitle', { role: grantRole(g), scope: where.label }), confirmLabel: t('revoke'), danger: true }))) return;
    try {
      await request(`/anonymous/${g.id}`, { method: 'DELETE' });
      notify.success(t('revoked'));
      await grants.reload();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  const canGive = (places.data?.length ?? 0) > 0;
  const giveButton = canGive && (
    <Button variant="primary" onClick={() => open({ mode: 'give' })}>{t('giveRole')}</Button>
  );
  const loaded = grants.data !== undefined && places.data !== undefined;
  const empty = loaded && grants.data!.length === 0;

  const whereLabel = (p: AnonymousPlaceDto) => (p.code ? `${p.label} · ${p.code}` : p.label);
  const previewWhere = chosenPlace ? whereLabel(chosenPlace) : undefined;

  return (
    <Stack gap="section">
      <PageHeader title={t('title')} description={t('subtitle')} actions={!empty ? giveButton : undefined} />
      <InlineAlert tone="danger">{grants.error ?? places.error}</InlineAlert>
      {empty ? (
        <EmptyState
          variant="page"
          size="md"
          kind="first-use"
          illustration="views"
          title={t('emptyTitle')}
          description={canGive ? t('emptyText') : `${t('emptyText')} ${t('noPlaces')}`}
          action={giveButton || undefined}
        />
      ) : (
        <Panel flush>
          <DataTable
            aria-label={t('tableLabel')}
            rows={grants.data}
            loading={!loaded}
            getRowId={(g) => g.id}
            columns={[
              {
                id: 'role',
                header: t('role'),
                cell: (g) => <StatusPill tone="info" dot={false}>{grantRole(g)}</StatusPill>,
              },
              {
                id: 'scope',
                header: t('scope'),
                cell: (g) => {
                  const where = whereOf(g);
                  return (
                    <HStack gap="2" minW="0">
                      <Text as="span" fontWeight="semibold" truncate>
                        {where.href ? <AppLink href={where.href}>{where.label}</AppLink> : where.label}
                      </Text>
                      {where.code && <RecordKey value={where.code} variant="muted" />}
                    </HStack>
                  );
                },
              },
              { id: 'since', header: t('since'), nowrap: true, cell: (g) => <Text as="span" color="fg.muted">{fmt.dateTime(g.createdAt, { dateStyle: 'medium' })}</Text> },
              {
                id: 'actions',
                header: <Text as="span" srOnly>{t('actions')}</Text>,
                align: 'end',
                cell: (g) => {
                  const place = g.scopeKey ? placeOf.get(g.scopeKey) : undefined;
                  return (
                    <RowMenu
                      label={t('menuLabel', { role: grantRole(g), scope: whereOf(g).label })}
                      items={[
                        { id: 'change', label: t('change'), icon: <Pencil />, disabled: !place, onSelect: () => place && open({ mode: 'change', grant: g, place }) },
                        ...(place ? [] : [{ note: t('notListed') }]),
                        { separator: true as const },
                        { id: 'remove', label: t('revoke'), icon: <Trash2 />, danger: true, onSelect: () => void remove(g) },
                      ]}
                    />
                  );
                },
              },
            ]}
          />
        </Panel>
      )}

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        title={editing?.mode === 'change' ? t('changeTitle', { scope: editing.place.label }) : t('dialogTitle')}
        submitLabel={editing?.mode === 'change' ? t('change') : t('give')}
        onSubmit={save}
        busy={action.busy}
        error={action.error}
        preview={
          <PreviewCard
            media={<IconTile size="md"><Globe /></IconTile>}
            title={t('who')}
            subtitle={chosenRole ? nameOf(chosenRole) : undefined}
            items={[
              { label: t('scope'), value: previewWhere },
              { label: t('can'), wrap: true, value: chosenRole ? (chosenRole.descriptions?.[locale] ?? roleDescription?.(chosenRole.key, chosenRole.description) ?? chosenRole.description ?? undefined) : undefined },
            ]}
          />
        }
      >
        <Field label={t('role')} required>
          <SelectField
            value={roleId}
            onChange={(e) => {
              const next = e.target.value;
              setRoleId(next);
              // A place that doesn't offer the new role is let go, so what's chosen always goes together.
              if (editing?.mode === 'give') setScopeKey(placeKept(places.data ?? [], scopeKey, next));
            }}
            options={[{ value: '', label: t('chooseRole') }, ...roleOptions.map((r) => ({ value: r.id, label: nameOf(r) }))]}
          />
        </Field>
        {editing?.mode === 'change' ? (
          <Field label={t('scope')}>
            <Text textStyle="body.sm" py="2">{whereLabel(editing.place)}</Text>
          </Field>
        ) : (
          <Field label={t('scope')} required>
            <SelectField
              value={scopeKey}
              onChange={(e) => setScopeKey(e.target.value)}
              options={[{ value: '', label: t('chooseWhere') }, ...placeOptions.map((p) => ({ value: p.scopeKey, label: whereLabel(p) }))]}
            />
          </Field>
        )}
        <InlineAlert tone="warning">{t('warning')}</InlineAlert>
      </FormDialog>
    </Stack>
  );
}
