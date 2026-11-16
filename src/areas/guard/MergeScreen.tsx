import { useEffect, useState } from 'react';
import { HStack, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import {
  boneWidth,
  Button,
  EMPTY_VALUE,
  Field,
  InlineAlert,
  Loading,
  notify,
  PageHeader,
  Panel,
  PropertyList,
  RecordKey,
  SearchPicker,
  StatusPill,
  TextBone,
  TextSlot,
  useApiAction,
  useApiQuery,
  useAreaRequest,
  useFormatters,
  useNavigate,
} from '@abpjs/ui';
import { CountList, usePartLabel } from './MergeParts';
import { guardRoutes, type GuardRoutes } from './routes';
import { AccountStatusPill } from './status';
import { useGuardNs } from './texts';
import type { AccountDetailDto, AccountDto, AccountMergeDto, AccountSummaryDto, MergePreviewDto } from './types';

export interface MergeScreenProps {
  /** The account to merge into another. */
  id: string;
  /** The account to merge it into, when the link names one (the duplicates list's): picked already. */
  into?: string | null;
  routes?: GuardRoutes;
}

/**
 * Merges an account into another: everything it did, owns or is named in moves there, in every module and plugin, and
 * it stays as an inactive account that can't sign in. The page shows what would move first; an account that can sign
 * in is merged only once its username is typed to confirm.
 */
export function MergeScreen({ id, into, routes = guardRoutes() }: MergeScreenProps) {
  const t = useGuardNs('merge');
  const tn = useGuardNs('nav');
  const tc = useGuardNs('common');
  const navigate = useNavigate();
  const request = useAreaRequest('guard');
  const source = useApiQuery<AccountDetailDto>('guard', `/accounts/${id}`);
  const [survivor, setSurvivor] = useState<AccountDto | null>(null);
  const [preview, setPreview] = useState<MergePreviewDto | null>(null);
  const [confirm, setConfirm] = useState('');
  const loading = useApiAction();
  const merging = useApiAction();

  // A survivor named in the link is picked already.
  useEffect(() => {
    if (!into) return;
    request<AccountDetailDto>(`/accounts/${into}`).then(
      (d) => setSurvivor(d.account),
      () => undefined,
    );
  }, [into, request]);

  useEffect(() => {
    setPreview(null);
    setConfirm('');
    if (!survivor) return;
    void loading.run(() =>
      request<MergePreviewDto>(`/accounts/${id}/merge/preview`, { method: 'POST', body: { survivorId: survivor.id } }).then(setPreview),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, survivor]);

  if (source.error && !source.data) return <InlineAlert tone="danger">{source.error}</InlineAlert>;
  // While the account loads, the page is drawn as it will be, its data coming.
  const account = source.data?.account;
  const confirmed = !preview?.needsConfirmation || confirm.trim().toLowerCase() === account?.username.toLowerCase();

  async function merge() {
    if (!survivor) return;
    const done = await merging.run(() =>
      request<AccountMergeDto>(`/accounts/${id}/merge`, {
        method: 'POST',
        body: { survivorId: survivor.id, confirm: preview?.needsConfirmation ? confirm.trim() : null },
      }),
    );
    if (done) {
      if (done.state === 'done') notify.success(t('merged', { source: done.sourceUsername, survivor: done.survivorUsername }));
      else notify.warning(t('mergedIncomplete', { source: done.sourceUsername, survivor: done.survivorUsername }));
      navigate(routes.account(done.survivorId));
    }
  }

  const search = async (text: string) =>
    (await request<AccountDto[]>(`/accounts?${new URLSearchParams({ search: text })}`)).filter((a) => a.id !== account?.id && !a.mergedIntoId);

  return (
    <Loading when={!source.data}>
      <PageHeader
        breadcrumbs={[
          { label: tn('accounts'), href: routes.accounts },
          { label: account?.username, href: routes.account(account?.id ?? id) },
          { label: t('pageTitle') },
        ]}
        title={t('pageTitle')}
        description={
          <TextSlot width={t('pageHint', { username: '' }).length + 16}>{t('pageHint', { username: account?.username ?? '' })}</TextSlot>
        }
      />
      <Stack gap="section">
        {account?.mergedIntoId ? (
          <InlineAlert tone="warning">{t('alreadyMerged', { survivor: source.data?.mergedIntoUsername ?? '' })}</InlineAlert>
        ) : (
          <Panel title={t('chooseTitle')} description={t('chooseHint')}>
            <Field label={t('survivor')}>
              <SearchPicker<AccountDto>
                aria-label={t('survivor')}
                value={survivor}
                onChange={setSurvivor}
                search={search}
                known={[]}
                getId={(a) => a.id}
                label={(a) => `${a.displayName} (@${a.username})`}
                renderOption={(a) => (
                  <>
                    <Text as="span" textStyle="body.sm" fontWeight="medium">
                      {a.displayName}
                    </Text>{' '}
                    <Text as="span" textStyle="caption" color="fg.muted" dir="ltr">
                      @{a.username} · {a.directoryName} · {a.status}
                    </Text>
                  </>
                )}
                messages={{ placeholder: t('searchPlaceholder'), searching: t('searching'), noMatches: t('noMatches'), noKnown: t('noMatches') }}
              />
            </Field>
          </Panel>
        )}

        <InlineAlert tone="danger">{loading.error}</InlineAlert>

        {/* While the preview loads, it's drawn as it will be: both accounts, what moves, and the button. */}
        {survivor && (preview || loading.busy) && (
          <Loading when={!preview}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="section">
              <Side title={t('sourceTitle')} hint={t('sourceHint')} account={preview?.source} routes={routes} />
              <Side title={t('survivorTitle')} hint={t('survivorHint')} account={preview?.survivor} routes={routes} />
            </SimpleGrid>
            <Panel title={t('previewTitle')} description={t('previewHint')} data-testid="merge-preview">
              {preview ? <Parts preview={preview} /> : <PartsComing />}
            </Panel>
            <Panel title={t('confirmTitle')}>
              <Stack gap="field" maxW="xl">
                {preview?.needsConfirmation && (
                  <>
                    <InlineAlert tone="warning">
                      {preview.sameDirectory
                        ? t('activeWarning', { username: account?.username ?? '' })
                        : t('activeOtherDirectory', { username: account?.username ?? '' })}
                    </InlineAlert>
                    <Field label={t('typeUsername', { username: account?.username ?? '' })}>
                      <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" dir="ltr" />
                    </Field>
                  </>
                )}
                <Text textStyle="body.sm" color="fg.muted">
                  {t('noUndo')}
                </Text>
                <InlineAlert tone="danger">{merging.error}</InlineAlert>
                <HStack gap="2">
                  <Button variant="primary" danger onClick={merge} loading={merging.busy} disabled={!confirmed}>
                    {t('mergeButton', {
                      source: preview?.source.username ?? account?.username ?? '',
                      survivor: preview?.survivor.username ?? survivor.username,
                    })}
                  </Button>
                  <Button onClick={() => navigate(routes.account(account?.id ?? id))}>{tc('cancel')}</Button>
                </HStack>
              </Stack>
            </Panel>
          </Loading>
        )}
      </Stack>
    </Loading>
  );
}

/** One side of the merge; while the preview loads, its values are coming. */
function Side({ title, hint, account, routes }: { title: string; hint: string; account?: AccountSummaryDto; routes: GuardRoutes }) {
  const tc = useGuardNs('common');
  const fmt = useFormatters();
  return (
    <Panel title={title} description={hint}>
      <PropertyList
        items={[
          { label: tc('username'), value: <RecordKey value={account?.username} href={account && routes.account(account.id)} /> },
          { label: tc('displayName'), value: account?.displayName },
          { label: tc('email'), value: account && (account.email ?? EMPTY_VALUE) },
          { label: tc('directory'), value: account?.directoryName },
          { label: tc('status'), value: account ? <AccountStatusPill status={account.status} /> : <StatusPill /> },
          { label: tc('lastSignIn'), value: account && fmt.dateTime(account.lastLoginAt) },
        ]}
      />
    </Panel>
  );
}

/** What moves, while the preview loads: a row of parts, their names and counts coming. */
function PartsComing() {
  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap="field">
      {[0, 1, 2].map((i) => (
        <Stack key={i} gap="1">
          <Text fontWeight="medium">
            <TextBone width={boneWidth(i, 8, 14)} />
          </Text>
          <Text textStyle="body.sm">
            <TextBone width={boneWidth(i + 3, 12, 22)} />
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}

function Parts({ preview }: { preview: MergePreviewDto }) {
  const t = useGuardNs('merge');
  const partLabel = usePartLabel();
  const moving = preview.parts.filter((p) => p.counts.length > 0 || p.error);
  if (moving.length === 0) return <Text color="fg.muted">{t('nothing')}</Text>;
  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap="field">
      {moving.map((p) => (
        <Stack key={p.key} gap="1">
          <Text fontWeight="medium">{partLabel(p.key, p.plugin)}</Text>
          {p.error ? <InlineAlert tone="warning">{t('pluginError', { error: p.error })}</InlineAlert> : <CountList counts={p.counts} />}
        </Stack>
      ))}
    </SimpleGrid>
  );
}
