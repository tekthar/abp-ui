import { useEffect, useState } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import {
  AbpApiError,
  Button,
  createPasskey,
  DataTable,
  errorText,
  Field,
  FormDialog,
  InlineAlert,
  notify,
  Panel,
  passkeysSupported,
  StatusPill,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  useFormatters,
} from '@abpjs/ui';
import { AppSetup, RecoveryCodes, useSenderName } from './SecondFactorParts';
import { useGuardNs } from './texts';
import { num, type AppEnrolmentDto, type MySecondFactorsDto, type SecondFactorDto } from './types';

export interface MySecondFactorsPanelProps {
  /** Start setting up an authenticator app at once (signing in sent the person here because a group offers one). */
  setUpNow?: boolean;
  /** The person opened or closed the setup: a host that asked through its address forgets it, so a reload doesn't start again. */
  onSetUpChosen?: (settingUp: boolean) => void;
  /** Their factors changed: a host refreshes what it knows of the person (whether they have a strong factor). */
  onChange?: () => void;
}

/**
 * The person's own two-factor sign-in: what their groups ask, their passkeys (named, so they know which device) and
 * authenticator apps, and the recovery codes left. Adding one, removing one and new recovery codes each are a step-up,
 * a strong one once they have a strong factor, asked by the foundation's step-up dialog.
 */
export function MySecondFactorsPanel({ setUpNow = false, onSetUpChosen, onChange }: MySecondFactorsPanelProps) {
  const t = useGuardNs('secondFactor');
  const fmt = useFormatters();
  const confirm = useConfirm();
  const request = useAreaRequest('guard');
  const mine = useApiQuery<MySecondFactorsDto>('guard', '/me/second-factors');
  const nameOf = useSenderName();
  // What the person chose; until then, what the host asked for.
  const [choice, setChoice] = useState<boolean | null>(null);
  const settingUp = choice ?? setUpNow;
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canPasskey = passkeysSupported();
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<SecondFactorDto | null>(null);
  const [newName, setNewName] = useState('');
  const data = mine.data;
  const factors = data?.factors ?? [];

  useEffect(() => {
    if (setUpNow) document.getElementById('second-factor')?.scrollIntoView({ block: 'start' });
  }, [setUpNow]);

  function setSettingUp(next: boolean) {
    onSetUpChosen?.(next);
    setChoice(next);
  }

  async function remove(factor: SecondFactorDto) {
    const passkey = factor.kind === 'passkey';
    const yes = await confirm({
      title: passkey ? t('removePasskeyTitle') : t('removeTitle'),
      description: passkey ? t('removePasskeyHint') : t('removeHint'),
      confirmLabel: t('remove'),
      danger: true,
    });
    if (!yes) return;
    setError(null);
    try {
      await request(`/me/second-factors/${factor.id}`, { method: 'DELETE' });
      notify.success(passkey ? t('passkeyRemoved') : t('removed'));
      await mine.reload();
      onChange?.();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function renew() {
    if (!(await confirm({ title: t('renewTitle'), description: t('renewHint'), confirmLabel: t('renew') }))) return;
    setError(null);
    try {
      setCodes((await request<{ recoveryCodes: string[] }>('/me/second-factors/recovery-codes', { method: 'POST' })).recoveryCodes);
      await mine.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  /** A passkey on this device: the server's options, the device's prompt, then its recovery codes when it's the first factor. */
  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const options = await request<Record<string, unknown>>('/me/passkeys/options', { method: 'POST' });
      const credential = await createPasskey(options);
      if (!credential) {
        setError(t('passkeyCancelled'));
        return;
      }
      const added = await request<{ recoveryCodes?: string[] | null }>('/me/passkeys', {
        method: 'POST',
        body: { name: passkeyName.trim() || t('passkeyNameDefault'), credential },
      });
      setAddingPasskey(false);
      notify.success(t('passkeyAdded'));
      if (added.recoveryCodes?.length) setCodes(added.recoveryCodes);
      await mine.reload();
      onChange?.();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    if (!renaming) return;
    await request(`/me/passkeys/${renaming.id}`, { method: 'PUT', body: { name: newName.trim() } });
    setRenaming(null);
    await mine.reload();
  }

  async function confirmCode(code: string): Promise<string[] | null | false> {
    try {
      return (await request<{ recoveryCodes: string[] | null }>('/me/second-factors/app/confirm', { method: 'POST', body: { code } })).recoveryCodes;
    } catch (e) {
      if (e instanceof AbpApiError && e.code === 'second_factor_failed') return false;
      throw e;
    }
  }

  const hasApp = factors.some((f) => f.kind === 'app');
  const actions = !settingUp && !addingPasskey && !codes && data && !data.disabled && (
    <HStack gap="2" wrap="wrap">
      {canPasskey && (
        <Button
          size="sm"
          variant={factors.length ? 'secondary' : 'primary'}
          onClick={() => {
            setPasskeyName(t('passkeyNameDefault'));
            setError(null);
            setAddingPasskey(true);
          }}
          data-testid="passkey-add"
        >
          {t('addPasskey')}
        </Button>
      )}
      <Button size="sm" variant={factors.length || canPasskey ? 'secondary' : 'primary'} onClick={() => setSettingUp(true)} data-testid="second-factor-set-up">
        {hasApp ? t('addAnother') : t('setUp')}
      </Button>
    </HStack>
  );

  return (
    <Panel id="second-factor" title={t('title')} description={t('panelHint')} actions={actions} data-testid="second-factor">
      <Stack gap="field">
        <InlineAlert tone="danger">{mine.error ?? error}</InlineAlert>
        {data?.disabled && <InlineAlert tone="neutral">{t('disabled')}</InlineAlert>}
        {data && (
          <HStack gap="2" wrap="wrap">
            {factors.length > 0 && !data.disabled ? <StatusPill tone="success">{t('on')}</StatusPill> : <StatusPill>{t('off')}</StatusPill>}
            <Text color="fg.muted" textStyle="body.sm" data-testid="second-factor-mode">
              {t(`modeHint.${data.mode}`)}
            </Text>
          </HStack>
        )}
        {data?.senders && data.senders.length > 0 && (
          <Text color="fg.muted" textStyle="body.sm" data-testid="second-factor-senders">
            {t('alsoBy', { list: data.senders.map((s) => `${nameOf(s)} (${s.to})`).join(', ') })}
          </Text>
        )}

        {settingUp && (
          <AppSetup
            start={() => request<AppEnrolmentDto>('/me/second-factors/app', { method: 'POST' })}
            confirm={confirmCode}
            onCancel={() => setSettingUp(false)}
            onDone={(made) => {
              setSettingUp(false);
              notify.success(t('setup.done'));
              setCodes(made);
              void mine.reload();
              onChange?.();
            }}
          />
        )}

        {addingPasskey && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addPasskey();
            }}
            data-testid="passkey-add-form"
          >
            <Stack gap="field" maxW="md">
              <Text color="fg.muted" textStyle="body.sm">
                {t('passkeyHint')}
              </Text>
              <Field label={t('passkeyName')}>
                <Input value={passkeyName} maxLength={64} autoFocus onChange={(e) => setPasskeyName(e.target.value)} data-testid="passkey-name" />
              </Field>
              <HStack>
                <Button type="submit" loading={busy} data-testid="passkey-create">
                  {t('passkeyCreate')}
                </Button>
                <Button variant="secondary" onClick={() => setAddingPasskey(false)} disabled={busy}>
                  {t('cancel')}
                </Button>
              </HStack>
            </Stack>
          </form>
        )}

        {codes && <RecoveryCodes codes={codes} onSaved={() => setCodes(null)} />}

        {!settingUp && !addingPasskey && !codes && (
          <>
            <DataTable
              aria-label={t('title')}
              size="sm"
              rows={data?.factors}
              loading={mine.loading}
              skeletonRows={1}
              getRowId={(f) => f.id}
              empty={t('none')}
              columns={[
                {
                  id: 'kind',
                  header: t('title'),
                  cell: (f) =>
                    f.kind === 'passkey' ? (
                      <Stack gap="0">
                        <Text fontWeight="medium">{f.name || t('kinds.passkey')}</Text>
                        <Text textStyle="caption" color="fg.muted">
                          {f.provider ? `${t('kinds.passkey')} · ${f.provider}` : t('kinds.passkey')}
                        </Text>
                      </Stack>
                    ) : (
                      <Text fontWeight="medium">{t(`kinds.${f.kind}`)}</Text>
                    ),
                },
                { id: 'added', header: t('added'), nowrap: true, cell: (f) => fmt.dateTime(f.createdAt) },
                { id: 'used', header: t('lastUsed'), nowrap: true, cell: (f) => (f.lastUsedAt ? fmt.dateTime(f.lastUsedAt) : t('never')) },
                {
                  id: 'remove',
                  header: '',
                  cell: (f) => (
                    <HStack gap="2" justify="flex-end">
                      {f.kind === 'passkey' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewName(f.name ?? '');
                            setRenaming(f);
                          }}
                        >
                          {t('rename')}
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => void remove(f)}>
                        {t('remove')}
                      </Button>
                    </HStack>
                  ),
                },
              ]}
            />
            {factors.length > 0 && (
              <HStack justify="space-between" wrap="wrap" gap="2">
                <Text textStyle="body.sm" color="fg.muted" data-testid="recovery-left">
                  {t('recoveryLeft', { count: num(data?.recoveryCodesLeft ?? 0) })}
                </Text>
                <Button size="sm" variant="secondary" onClick={() => void renew()}>
                  {t('renew')}
                </Button>
              </HStack>
            )}
          </>
        )}
      </Stack>
      <FormDialog
        open={renaming != null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={t('renameTitle')}
        submitLabel={t('save')}
        onSubmit={rename}
        submitDisabled={!newName.trim()}
      >
        <Field label={t('passkeyName')} required>
          <Input value={newName} maxLength={64} required onChange={(e) => setNewName(e.target.value)} data-testid="passkey-rename" />
        </Field>
      </FormDialog>
    </Panel>
  );
}
