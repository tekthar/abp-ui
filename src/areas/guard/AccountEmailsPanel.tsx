import { useState, type FormEvent } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Button, DataTable, InlineAlert, notify, Panel, StatusPill, useApiAction, useAreaRequest, useFormatters, type DataTableColumn } from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { AccountEmailsDto } from './types';

interface Row {
  id: string;
  email: string;
  /** "directory" for the directory's own address. */
  source: string;
  verified: boolean;
  mailGoesHere: boolean;
  addedAt: string | null;
}

export interface AccountEmailsPanelProps {
  addresses: AccountEmailsDto;
  /**
   * Whose they are, as a path of AbpGuard.HttpApi: `/accounts/{id}` for an admin (an address is confirmed at once), `/me`
   * for the person (a link is mailed to it).
   */
  base: string;
  /** Whether the person looking may change them. */
  canEdit: boolean;
  onChange: (addresses: AccountEmailsDto) => void;
}

/**
 * An account's addresses: its directory's, and its own. Every confirmed address matches the account; mail goes to the
 * one chosen. An admin's are confirmed at once; a person's once they follow the link mailed to the address.
 */
export function AccountEmailsPanel({ addresses, base, canEdit, onChange }: AccountEmailsPanelProps) {
  const t = useGuardNs('addresses');
  const fmt = useFormatters();
  const request = useAreaRequest('guard');
  const action = useApiAction();
  const [email, setEmail] = useState('');
  const self = base === '/me';

  const rows: Row[] = [
    ...(addresses.directoryEmail
      ? [{ id: 'directory', email: addresses.directoryEmail, source: 'directory', verified: true, mailGoesHere: addresses.directoryMailGoesHere, addedAt: null }]
      : []),
    ...(addresses.addresses ?? []).map((a) => ({
      id: a.id,
      email: a.email,
      source: a.source,
      verified: a.verifiedAt != null,
      mailGoesHere: a.mailGoesHere,
      addedAt: a.addedAt ?? null,
    })),
  ];

  async function add(e: FormEvent) {
    e.preventDefault();
    const added = email.trim();
    const updated = await action.run(() => request<AccountEmailsDto>(`${base}/emails`, { method: 'POST', body: { email: added } }));
    if (updated) {
      setEmail('');
      onChange(updated);
      notify.success(self ? t('linkSent', { email: added }) : t('addedToast', { email: added }));
    }
  }

  async function mailTo(row: Row) {
    const updated = await action.run(() =>
      request<AccountEmailsDto>(`${base}/mail-to`, { method: 'PUT', body: { email: row.source === 'directory' ? null : row.email } }),
    );
    if (updated) onChange(updated);
  }

  // One of the confirmed addresses becomes the primary; the one before stays, and is told.
  async function primary(row: Row) {
    const updated = await action.run(() => request<AccountEmailsDto>(`${base}/emails/${row.id}/primary`, { method: 'POST' }));
    if (updated) {
      onChange(updated);
      notify.success(t('primaryChanged', { email: row.email }));
    }
  }

  async function remove(row: Row) {
    const updated = await action.run(() => request<AccountEmailsDto>(`${base}/emails/${row.id}`, { method: 'DELETE' }));
    if (updated) onChange(updated);
  }

  const columns: DataTableColumn<Row>[] = [
    {
      id: 'email',
      header: t('address'),
      sortValue: (r) => r.email,
      cell: (r) => (
        <Text as="span" fontWeight={r.mailGoesHere ? 'medium' : undefined} dir="ltr" wordBreak="break-all">
          {r.email}
        </Text>
      ),
    },
    { id: 'source', header: t('from'), sortValue: (r) => r.source, cell: (r) => t(`source.${r.source}`) },
    {
      id: 'state',
      header: t('state'),
      sortValue: (r) => (r.verified ? 0 : 1),
      cell: (r) => (r.verified ? <StatusPill tone="success">{t('confirmed')}</StatusPill> : <StatusPill tone="warning">{t('waiting')}</StatusPill>),
    },
    { id: 'added', header: t('addedAt'), nowrap: true, sortValue: (r) => (r.addedAt ? new Date(r.addedAt) : null), cell: (r) => fmt.dateTime(r.addedAt) },
    {
      id: 'mail',
      header: t('mail'),
      cell: (r) =>
        r.mailGoesHere ? (
          <StatusPill tone="info">{t('mailGoesHere')}</StatusPill>
        ) : canEdit && r.verified ? (
          <Button size="sm" onClick={() => mailTo(r)} disabled={action.busy}>
            {t('sendHere')}
          </Button>
        ) : null,
    },
    {
      id: 'actions',
      header: '',
      cell: (r) =>
        r.source === 'directory' ? (
          addresses.correctable ? <StatusPill tone="accent">{t('primary')}</StatusPill> : null
        ) : canEdit ? (
          <HStack gap="2" justify="flex-end">
            {addresses.correctable && r.verified && (
              <Button size="sm" onClick={() => primary(r)} disabled={action.busy} aria-label={t('makePrimaryLabel', { email: r.email })}>
                {t('makePrimary')}
              </Button>
            )}
            <Button size="sm" danger onClick={() => remove(r)} disabled={action.busy} aria-label={t('removeLabel', { email: r.email })}>
              {t('remove')}
            </Button>
          </HStack>
        ) : null,
    },
  ];

  return (
    <Panel title={t('title', { count: rows.length })} description={self ? t('selfHint') : t('adminHint')} data-testid="addresses">
      <Stack gap="field">
        <InlineAlert tone="danger">{action.error}</InlineAlert>
        {!addresses.correctable && addresses.directory && (
          <Text textStyle="caption" color="fg.muted">
            {t('fromDirectory', { directory: addresses.directory })}
          </Text>
        )}
        <DataTable aria-label={t('title', { count: rows.length })} size="sm" columns={columns} rows={rows} getRowId={(r) => r.id} empty={t('none')} />
        {canEdit && (
          <form onSubmit={add}>
            <HStack gap="2" align="flex-end" wrap="wrap">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                aria-label={t('newAddress')}
                maxW="sm"
                dir="ltr"
              />
              <Button type="submit" loading={action.busy} disabled={!email.trim()}>
                {self ? t('addAndSend') : t('add')}
              </Button>
            </HStack>
          </form>
        )}
      </Stack>
    </Panel>
  );
}
