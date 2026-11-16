import { Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { AppLink, DataTable, IconButton, InlineAlert, notify, PageHeader, Panel, errorText, useApiQuery, useAreaRequest, useConfirm, useFormatters } from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { AnonymousGrantDto } from './types';

/**
 * Anonymous access, for site admins: every role given to anonymous visitors, in one place, because anyone on the
 * internet gets it. Grants are made where the role is given (a place's members); any can be revoked here.
 * `roleName` names a role the host ships in the reader's language; the server's name otherwise.
 */
export function AnonymousScreen({ roleName }: { roleName?: (key: string, name: string) => string }) {
  const t = useGuardNs('anonymousAccess');
  const fmt = useFormatters();
  const confirm = useConfirm();
  const request = useAreaRequest('guard');
  const grants = useApiQuery<AnonymousGrantDto[]>('guard', '/anonymous');
  const role = (g: AnonymousGrantDto) => roleName?.(g.roleKey, g.roleName) ?? g.roleName;

  async function revoke(g: AnonymousGrantDto) {
    if (!(await confirm({ title: t('revokeTitle', { role: role(g), scope: g.scope ?? '' }), confirmLabel: t('revoke'), danger: true }))) return;
    try {
      await request(`/anonymous/${g.id}`, { method: 'DELETE' });
      notify.success(t('revoked'));
      await grants.reload();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <InlineAlert tone="danger">{grants.error}</InlineAlert>
      <Panel flush>
        <DataTable
          aria-label={t('title')}
          rows={grants.data}
          loading={grants.loading}
          getRowId={(g) => g.id}
          empty={<Text color="fg.muted">{t('empty')}</Text>}
          columns={[
            { id: 'role', header: t('role'), cell: (g) => role(g) },
            { id: 'scope', header: t('scope'), cell: (g) => (g.href ? <AppLink href={g.href}>{g.scope}</AppLink> : g.scope) },
            { id: 'since', header: t('since'), nowrap: true, cell: (g) => fmt.dateTime(g.createdAt) },
            {
              id: 'actions',
              header: <Text as="span" srOnly>{t('revoke')}</Text>,
              align: 'end',
              cell: (g) => (
                <IconButton size="sm" variant="ghost" aria-label={t('revoke')} onClick={() => void revoke(g)}>
                  <Trash2 />
                </IconButton>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
