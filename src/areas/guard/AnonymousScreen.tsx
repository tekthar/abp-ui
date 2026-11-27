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
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useFormatters,
} from '@abpjs/ui';
import { placeKept, placesOffering, rolesOffered, takenBy } from './anonymousRules';
import { useWrittenName } from './names';
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
  const written = useWrittenName();
  const confirm = useConfirm();
  const request = useAreaRequest('guard');
  const action = useApiAction();
  const grants = useApiQuery<AnonymousGrantDto[]>('guard', '/anonymous');
  const places = useApiQuery<AnonymousPlaceDto[]>('guard', '/anonymous/places');
  const [editing, setEditing] = useState<Editing | null>(null);
  // What the dialog last showed: kept while it closes, so its words don't switch to Give's mid-animation.
  const [shown, setShown] = useState<Editing>({ mode: 'give' });
  const [roleId, setRoleId] = useState('');
  const [scopeKey, setScopeKey] = useState('');

  const placeOf = useMemo(() => new Map((places.data ?? []).map((p) => [p.scopeKey, p])), [places.data]);
  const roleOf = useMemo(() => new Map((places.data ?? []).flatMap((p) => p.roles).map((r) => [r.id, r])), [places.data]);
  // One name for a role wherever it shows: the host's for its own roles, then the role's names by language.
  const nameOf = (r: Pick<AnonymousRoleDto, 'key' | 'name' | 'names'>) => written(roleName?.(r.key, r.name) ?? r.name, r.names);
  const describe = (r: AnonymousRoleDto) =>
    written(roleDescription?.(r.key, r.description) ?? r.description ?? '', r.descriptions) || undefined;
  const grantRole = (g: AnonymousGrantDto) => {
    const known = g.roleId ? roleOf.get(g.roleId) : undefined;
    return known ? nameOf(known) : written(roleName?.(g.roleKey, g.roleName) ?? g.roleName);
  };
  // A place the host lists names itself (its name, its code); a scope it doesn't is named as its describer says.
  const whereOf = (g: AnonymousGrantDto) => {
    const place = g.scopeKey ? placeOf.get(g.scopeKey) : undefined;
    return { label: place?.label ?? g.scope ?? g.scopeKey ?? '', code: place?.code ?? g.code ?? null, href: place?.href ?? g.href };
  };

  // Pairs given already aren't offered again (the server would answer with the same grant); a change keeps its own.
  const taken = useMemo(() => takenBy(grants.data ?? [], shown.mode === 'change' ? shown.grant.id : undefined), [grants.data, shown]);
  // The roles offered: the place's when one is chosen, else every role some place offers (each once).
  const chosenPlace = shown.mode === 'change' ? shown.place : placeOf.get(scopeKey);
  const roleOptions = useMemo(() => rolesOffered(places.data ?? [], chosenPlace, taken), [chosenPlace, places.data, taken]);
  const chosenRole = roleOptions.find((r) => r.id === roleId);
  // The places offered: those that still offer the chosen role; a place with nothing left to give isn't one.
  const placeOptions = placesOffering(places.data ?? [], roleId, taken);
  // A change is saved only when it changes the role.
  const unchanged = shown.mode === 'change' && roleId === (shown.grant.roleId ?? '');

  function open(next: Editing) {
    setEditing(next);
    setShown(next);
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

  const canGive = placesOffering(places.data ?? [], '', takenBy(grants.data ?? [])).length > 0;
  const giveButton = canGive && (
    <Button variant="primary" onClick={() => open({ mode: 'give' })}>{t('giveRole')}</Button>
  );
  // The grants decide what the page is; the places only what can be given (a failure there shows, the grants stay).
  const empty = grants.data !== undefined && grants.data.length === 0;

  const whereLabel = (p: AnonymousPlaceDto) => (p.code ? t('placeWithCode', { place: p.label, code: p.code }) : p.label);
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
          description={canGive || places.data === undefined ? t('emptyText') : t('emptyTextNoPlaces')}
          action={giveButton || undefined}
        />
      ) : (
        <Panel flush>
          <DataTable
            aria-label={t('tableLabel')}
            rows={grants.data}
            loading={grants.loading}
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
        title={shown.mode === 'change' ? t('changeTitle', { scope: shown.place.label }) : t('dialogTitle')}
        submitLabel={shown.mode === 'change' ? t('change') : t('give')}
        submitDisabled={unchanged}
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
              { label: t('can'), wrap: true, value: chosenRole ? describe(chosenRole) : undefined },
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
              if (shown.mode === 'give') setScopeKey(placeKept(places.data ?? [], scopeKey, next, taken));
            }}
            options={[{ value: '', label: t('chooseRole') }, ...roleOptions.map((r) => ({ value: r.id, label: nameOf(r) }))]}
          />
        </Field>
        {shown.mode === 'change' ? (
          // The place a change keeps: a label and its value, not a field (there's nothing to fill in).
          <Stack gap="1.5">
            <Text id="anonymous-change-where" textStyle="label">{t('scope')}</Text>
            <Text textStyle="body.sm" aria-labelledby="anonymous-change-where">{whereLabel(shown.place)}</Text>
          </Stack>
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
