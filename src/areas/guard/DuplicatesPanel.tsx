import { HStack, Stack, Text } from '@chakra-ui/react';
import { AppLink, DataTable, Panel, RecordKey, useApiQuery, type DataTableColumn } from '@abpjs/ui';
import { guardRoutes, type GuardRoutes } from './routes';
import { AccountStatusPill } from './status';
import { useGuardNs } from './texts';
import type { DuplicateDto } from './types';

/**
 * Accounts that share an address: one person twice, most likely, such as a placeholder from an import that the address
 * didn't match by itself because more than one account has it. Each offers a merge into the account listed first (an
 * active one when there is one). Draws nothing when there are none.
 */
export function DuplicatesPanel({ routes = guardRoutes() }: { routes?: GuardRoutes }) {
  const t = useGuardNs('duplicates');
  const duplicates = useApiQuery<DuplicateDto[]>('guard', '/accounts/duplicates');
  const rows = duplicates.data ?? [];
  if (rows.length === 0) return null;

  const columns: DataTableColumn<DuplicateDto>[] = [
    {
      id: 'email',
      header: t('address'),
      sortValue: (d) => d.email,
      cell: (d) => (
        <Text as="span" dir="ltr" wordBreak="break-all">
          {d.email}
        </Text>
      ),
    },
    {
      id: 'accounts',
      header: t('accounts'),
      cell: (d) => (
        <Stack gap="1">
          {d.accounts.map((a) => (
            <HStack key={a.id} gap="2" wrap="wrap">
              <RecordKey value={a.username} href={routes.account(a.id)} />
              <Text as="span" textStyle="caption" color="fg.muted">
                {a.directoryName}
              </Text>
              <AccountStatusPill status={a.status} />
            </HStack>
          ))}
        </Stack>
      ),
    },
    {
      id: 'merge',
      header: t('merge'),
      cell: (d) => (
        <Stack gap="1">
          {d.accounts.slice(1).map((a) => (
            <AppLink key={a.id} href={`${routes.accountMerge(a.id)}?into=${d.accounts[0].id}`}>
              {t('mergeInto', { source: a.username, survivor: d.accounts[0].username })}
            </AppLink>
          ))}
        </Stack>
      ),
    },
  ];

  return (
    <Panel title={t('title', { count: rows.length })} description={t('hint')} flush data-testid="duplicates">
      <DataTable
        aria-label={t('title', { count: rows.length })}
        columns={columns}
        rows={rows}
        getRowId={(d) => d.email}
        defaultSort={{ columnId: 'email', direction: 'asc' }}
      />
    </Panel>
  );
}
