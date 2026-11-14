import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { chakra, Dialog, Grid, HStack, Input, Portal, Stack, Text } from '@chakra-ui/react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { InlineAlert } from '../components/InlineAlert';
import { createAreaTexts } from '../texts/area';
import { AbpApiError } from './errors';
import { useHost } from './HostContext';
import type { HostRequestInit } from './request';
import { setStepUpHandler, type StepUpNeed } from './step-up';
import ar from './step-up-texts/ar.json';
import en from './step-up-texts/en.json';
import { createPasskey, getPasskey, passkeysSupported } from './webauthn';

/** The dialog's words; a host overrides any through `AbpHost.texts.stepUp`. */
const useStepUpTexts = createAreaTexts('stepUp', { en, ar });

/** A way the site sends a code (AbpGuard's `SecondFactorSenderDto`): `email`, or a channel's key and name. */
interface Sender {
  method: string;
  name: string;
  to: string;
}

/** What AbpGuard answers for the person's own second factors, as far as the dialog reads it. */
interface MySecondFactors {
  factors: { kind: string }[];
  senders?: Sender[] | null;
}

/** Setting up the authenticator app (AbpGuard's `AppEnrolmentDto`): the key, its address, and its QR code as an image. */
interface AppEnrolment {
  secret: string;
  address: string;
  qr: string;
}

/** How the person can give a code: their authenticator app, and the ways the site sends one. */
type Ways = { hasApp: boolean; senders: Sender[] };

/**
 * Where the dialog is: confirming (the password, a code with it), a passkey offered first (a strong step-up), or setting
 * up a strong factor (a strong step-up asked of someone with none: the password, then a passkey or the app, then the
 * recovery codes when it's their first factor).
 */
type Stage = 'confirm' | 'passkey' | 'setup' | 'setupPasskey' | 'setupApp' | 'recovery';

/** Whether what was typed can be a code yet: six digits (spaces between are fine), or a recovery code's ten characters. */
export function looksLikeCode(value: string, recovery: boolean): boolean {
  return recovery ? value.replace(/[^A-Za-z0-9]/g, '').length === 10 : value.replace(/\D/g, '').length === 6 && !/[^\d\s]/.test(value);
}

const SEND_ERRORS: Record<string, string> = { too_many_attempts: 'tooManySends', unreachable: 'unreachable', not_sent: 'notSent' };

/**
 * Confirms the person before a sensitive action (ADR 0109 amendment, on AbpGuard's step-up): the server answers 403
 * `step_up_required`, the host's request asks here, and the call is tried again once confirmed.
 *
 * - At the password level: the password, and a code of their second factor when they have one (their app, a recovery
 *   code, or one the site sends).
 * - At the strong level (AbpGuard 0.7.0): a passkey first when they have one, or the password with an authenticator
 *   code.
 * - Asked for a strong step-up with no strong factor (`strong_factor_required`): the password, then setting up a passkey
 *   or the app here (with recovery codes, shown once, for a first factor); the call then asks again, and they confirm
 *   with what they set up.
 *
 * Too many wrong passwords end the session (401), which the host's request hands to the host. `AbpProvider` draws it
 * when the host gives `paths.guard`; a host with its own dialog sets `stepUpDialog: false`.
 */
export function StepUpDialog() {
  const t = useStepUpTexts();
  const host = useHost();
  const base = (host.paths.guard ?? '').replace(/\/$/, '');
  const [open, setOpen] = useState(false);
  const [need, setNeed] = useState<StepUpNeed | null>(null);
  const [stage, setStage] = useState<Stage>('confirm');
  const [password, setPassword] = useState('');
  const [ways, setWays] = useState<Ways | null>(null);
  const [method, setMethod] = useState('app');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [enrolment, setEnrolment] = useState<AppEnrolment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const settle = useRef<((confirmed: boolean) => void) | null>(null);
  const canPasskey = passkeysSupported();
  const strong = need?.level === 'strong';
  // Setting up starts with a password-level confirmation, the person's first factor's rule.
  const settingUp = need?.code === 'strong_factor_required';

  // The dialog's own calls: a refusal is shown here, never asked again through the dialog.
  const call = <T,>(path: string, init: HostRequestInit = {}) => host.request<T>(`${base}${path}`, { ...init, stepUp: false });

  useEffect(() => {
    setStepUpHandler(
      (asked) =>
        new Promise<boolean>((resolve) => {
          settle.current = resolve;
          setNeed(asked);
          setPassword('');
          setWays(null);
          setCode('');
          setSent({});
          setError(null);
          setEnrolment(null);
          setRecoveryCodes([]);
          setCopied(false);
          const passkeyFirst = asked.code !== 'strong_factor_required' && asked.level === 'strong' && asked.methods.includes('passkey') && passkeysSupported();
          setStage(passkeyFirst ? 'passkey' : 'confirm');
          // At the strong level the code is the app's, asked with the password.
          setMethod('app');
          setOpen(true);
        }),
    );
    return () => setStepUpHandler(null);
  }, []);

  function close(confirmed: boolean) {
    setOpen(false);
    setPassword('');
    setCode('');
    settle.current?.(confirmed);
    settle.current = null;
  }

  /** The password was right and a code is asked for: the person's ways, the app first. */
  async function askForCode() {
    const mine = await call<MySecondFactors>('/me/second-factors').catch(() => null);
    const found: Ways = { hasApp: mine?.factors.some((f) => f.kind === 'app') ?? true, senders: mine?.senders ?? [] };
    setWays(found);
    setMethod(found.hasApp ? 'app' : found.senders[0]?.method ?? 'app');
  }

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const answer = await call<{ to: string }>('/me/second-factors/send', { method: 'POST', body: { method } });
      setSent({ ...sent, [method]: answer.to });
      setCode('');
    } catch (e) {
      setError(t((e instanceof AbpApiError && e.code && SEND_ERRORS[e.code]) || 'notAllowed'));
    } finally {
      setSending(false);
    }
  }

  function switchTo(next: string) {
    setMethod(next);
    setCode('');
    setError(null);
  }

  /** A refusal of the session (too many wrong passwords): the dialog closes and the host's request has signed them out. */
  function ended(e: unknown) {
    if (e instanceof AbpApiError && e.status === 401) {
      close(false);
      return true;
    }
    return false;
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const withCode = strong && !settingUp ? { password, method: 'app', code } : ways ? { password, method, code } : { password };
      await call('/session/step-up', { method: 'POST', body: withCode });
      if (settingUp) {
        setStage('setup');
        return;
      }
      close(true);
    } catch (e) {
      if (ended(e)) return;
      // The password was right; the code is asked for now, and the password kept for the second try.
      if (e instanceof AbpApiError && e.code === 'second_factor_required' && !(strong && !settingUp)) {
        await askForCode();
        return;
      }
      setError(e instanceof AbpApiError && e.message ? e.message : t('failed'));
      if ((ways || (strong && !settingUp)) && !(e instanceof AbpApiError && e.code === 'step_up_failed')) {
        setCode('');
        return;
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  async function withPasskey() {
    setBusy(true);
    setError(null);
    try {
      const options = await call<Record<string, unknown>>('/session/step-up/options', { method: 'POST' });
      const credential = await getPasskey(options);
      if (!credential) {
        setError(t('passkeyCancelled'));
        return;
      }
      await call('/session/step-up', { method: 'POST', body: { method: 'passkey', credential } });
      close(true);
    } catch (e) {
      if (ended(e)) return;
      // No passkey this server knows: the password and the app instead.
      if (e instanceof AbpApiError && e.code === 'no_passkey') setStage('confirm');
      setError(e instanceof AbpApiError && e.message ? e.message : t('failed'));
    } finally {
      setBusy(false);
    }
  }

  /** A strong factor set up: its recovery codes when it's the first, else done, and the call asks again. */
  function setUp(codes: string[] | null | undefined) {
    if (codes && codes.length) {
      setRecoveryCodes(codes);
      setStage('recovery');
    } else close(true);
  }

  async function addPasskey(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const options = await call<Record<string, unknown>>('/me/passkeys/options', { method: 'POST' });
      const credential = await createPasskey(options);
      if (!credential) {
        setError(t('passkeyCancelled'));
        return;
      }
      const added = await call<{ recoveryCodes?: string[] | null }>('/me/passkeys', { method: 'POST', body: { name: passkeyName.trim() || t('passkeyNameDefault'), credential } });
      setUp(added.recoveryCodes);
    } catch (e) {
      if (ended(e)) return;
      setError(e instanceof AbpApiError && e.message ? e.message : t('failed'));
    } finally {
      setBusy(false);
    }
  }

  async function startApp() {
    setStage('setupApp');
    setCode('');
    setError(null);
    try {
      setEnrolment(await call<AppEnrolment>('/me/second-factors/app', { method: 'POST' }));
    } catch (e) {
      if (ended(e)) return;
      setError(e instanceof AbpApiError && e.message ? e.message : t('failed'));
    }
  }

  async function confirmApp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const enrolled = await call<{ recoveryCodes?: string[] | null }>('/me/second-factors/app/confirm', { method: 'POST', body: { code: code.replace(/\D/g, '') } });
      setUp(enrolled.recoveryCodes);
    } catch (e) {
      if (ended(e)) return;
      setError(e instanceof AbpApiError && e.code === 'second_factor_failed' ? t('appWrongCode') : e instanceof AbpApiError && e.message ? e.message : t('failed'));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const sender = ways?.senders.find((s) => s.method === method);
  const recovery = method === 'recovery';
  const sentTo = sent[method];
  const nameOf = (s: Sender) => (s.method === 'email' ? t('email') : s.name);
  const title = stage === 'recovery' ? t('recoveryTitle') : settingUp ? t('setupTitle') : t('title');
  // A first factor's recovery codes aren't lost by a click outside.
  const mayDismiss = stage !== 'recovery';

  const codeInput = (label: string, helper?: string) => (
    <Field label={label} helperText={helper} required>
      <Input
        key={method}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        autoComplete="one-time-code"
        inputMode={recovery ? 'text' : 'numeric'}
        maxLength={recovery ? 16 : 7}
        dir="ltr"
        textAlign="start"
        fontFamily="mono"
        letterSpacing={recovery ? undefined : '0.2em'}
        width={recovery ? '48' : '32'}
        data-testid="second-factor-code"
      />
    </Field>
  );

  const passwordField = (focus: boolean) => (
    <Field label={t('password')}>
      <Input type="password" autoComplete="current-password" autoFocus={focus} value={password} onChange={(e) => setPassword(e.target.value)} />
    </Field>
  );

  const footer = (submit: string | null, disabled = false, onBack?: () => void) => (
    <Dialog.Footer>
      <HStack>
        {onBack ? (
          <Button variant="secondary" onClick={onBack} disabled={busy}>
            {t('back')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => close(false)} disabled={busy}>
            {t('cancel')}
          </Button>
        )}
        {submit && (
          <Button type="submit" loading={busy} disabled={disabled}>
            {submit}
          </Button>
        )}
      </HStack>
    </Dialog.Footer>
  );

  let body: ReactNode;
  if (stage === 'passkey') {
    body = (
      <>
        <Dialog.Body>
          <Stack gap="field" align="start">
            <Text color="fg.muted">{t('strongWhy')}</Text>
            <Button variant="primary" onClick={() => void withPasskey()} loading={busy} data-testid="use-passkey">
              {t('usePasskey')}
            </Button>
            {busy && <Text textStyle="sm" color="fg.muted">{t('passkeyPrompt')}</Text>}
            <InlineAlert tone="danger">{error}</InlineAlert>
            {need?.methods.includes('app') && (
              <Button variant="link" size="sm" onClick={() => { setStage('confirm'); setError(null); }} data-testid="use-password-and-app">
                {t('usePasswordAndApp')}
              </Button>
            )}
          </Stack>
        </Dialog.Body>
        {footer(null)}
      </>
    );
  } else if (stage === 'confirm' && strong && !settingUp) {
    body = (
      <form onSubmit={(e) => void confirm(e)}>
        <Dialog.Body>
          <Stack gap="field">
            <Text color="fg.muted">{need?.methods.includes('passkey') ? t('strongWhy') : t('strongWhyApp')}</Text>
            {passwordField(true)}
            {codeInput(t('code'))}
            <InlineAlert tone="danger">{error}</InlineAlert>
            {need?.methods.includes('passkey') && canPasskey && (
              <Button variant="link" size="sm" alignSelf="start" onClick={() => { setStage('passkey'); setError(null); }}>
                {t('usePasskey')}
              </Button>
            )}
          </Stack>
        </Dialog.Body>
        {footer(t('confirm'), !password || !looksLikeCode(code, false))}
      </form>
    );
  } else if (stage === 'confirm') {
    body = (
      <form onSubmit={(e) => void confirm(e)}>
        <Dialog.Body>
          <Stack gap="field">
            {settingUp ? (
              <Stack gap="2">
                <Text color="fg.muted">{t('setupWhy')}</Text>
                <Text color="fg.muted">{t('setupPasswordWhy')}</Text>
              </Stack>
            ) : (
              <Text color="fg.muted">{ways ? t('codeWhy') : t('why')}</Text>
            )}
            {passwordField(!ways)}
            {ways && (
              <Stack gap="field">
                {sender && !sentTo ? (
                  <Stack gap="2" align="start">
                    <Text>{t('sendTo', { to: sender.to })}</Text>
                    <Button onClick={() => void sendCode()} loading={sending} loadingText={t('sending')} data-testid="send-code">
                      {t('send')}
                    </Button>
                  </Stack>
                ) : (
                  codeInput(recovery ? t('recoveryCode') : sender ? t('sentCode') : t('code'), sentTo ? t('sent', { to: sentTo }) : undefined)
                )}
                <Stack gap="0.5" align="start">
                  {sentTo && (
                    <Button variant="link" size="sm" onClick={() => void sendCode()} disabled={sending}>
                      {t('resend')}
                    </Button>
                  )}
                  {ways.hasApp && method !== 'app' && (
                    <Button variant="link" size="sm" onClick={() => switchTo('app')}>
                      {t('useApp')}
                    </Button>
                  )}
                  {ways.senders
                    .filter((s) => s.method !== method)
                    .map((s) => (
                      <Button key={s.method} variant="link" size="sm" onClick={() => switchTo(s.method)} data-testid={`use-${s.method}`}>
                        {t('byMethod', { name: nameOf(s) })}
                      </Button>
                    ))}
                  {ways.hasApp && !recovery && (
                    <Button variant="link" size="sm" onClick={() => switchTo('recovery')}>
                      {t('useRecovery')}
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
            <InlineAlert tone="danger">{error}</InlineAlert>
          </Stack>
        </Dialog.Body>
        {footer(settingUp ? t('continue') : t('confirm'), !password || (!!ways && !looksLikeCode(code, recovery)))}
      </form>
    );
  } else if (stage === 'setup') {
    body = (
      <>
        <Dialog.Body>
          <Stack gap="field" align="start">
            <Text color="fg.muted">{t('setupWhy')}</Text>
            {canPasskey ? (
              <Button variant="primary" onClick={() => { setPasskeyName(t('passkeyNameDefault')); setError(null); setStage('setupPasskey'); }} data-testid="setup-passkey">
                {t('setupPasskey')}
              </Button>
            ) : (
              <Text textStyle="sm" color="fg.muted">{t('passkeyUnsupported')}</Text>
            )}
            <Button variant={canPasskey ? 'secondary' : 'primary'} onClick={() => void startApp()} data-testid="setup-app">
              {t('setupApp')}
            </Button>
          </Stack>
        </Dialog.Body>
        {footer(null)}
      </>
    );
  } else if (stage === 'setupPasskey') {
    body = (
      <form onSubmit={(e) => void addPasskey(e)}>
        <Dialog.Body>
          <Stack gap="field">
            <Field label={t('passkeyName')}>
              <Input value={passkeyName} maxLength={64} autoFocus onChange={(e) => setPasskeyName(e.target.value)} data-testid="passkey-name" />
            </Field>
            {busy && <Text textStyle="sm" color="fg.muted">{t('passkeyPrompt')}</Text>}
            <InlineAlert tone="danger">{error}</InlineAlert>
          </Stack>
        </Dialog.Body>
        {footer(t('passkeyCreate'), false, () => { setStage('setup'); setError(null); })}
      </form>
    );
  } else if (stage === 'setupApp') {
    body = (
      <form onSubmit={(e) => void confirmApp(e)}>
        <Dialog.Body>
          <Stack gap="field">
            <Text color="fg.muted">{t('appScan')}</Text>
            <chakra.div bg="white" p="2" rounded="l2" borderWidth="1px" w="fit-content">
              {enrolment ? <chakra.img src={enrolment.qr} alt={t('appQrAlt')} width="44" height="44" data-testid="app-setup-qr" /> : <chakra.div width="44" height="44" />}
            </chakra.div>
            <Stack gap="1">
              <Text textStyle="sm" color="fg.muted">{t('appCantScan')}</Text>
              <chakra.code dir="ltr" textAlign="start" fontFamily="mono" fontSize="sm" bg="bg.muted" p="2" rounded="l2" wordBreak="break-all" data-testid="app-setup-secret">
                {enrolment ? enrolment.secret.replace(/(.{4})/g, '$1 ').trim() : ' '}
              </chakra.code>
            </Stack>
            {codeInput(t('appCode'))}
            <InlineAlert tone="danger">{error}</InlineAlert>
          </Stack>
        </Dialog.Body>
        {footer(t('appConfirm'), !enrolment || !looksLikeCode(code, false), () => { setStage('setup'); setError(null); })}
      </form>
    );
  } else {
    body = (
      <>
        <Dialog.Body>
          <Stack gap="field" data-testid="recovery-codes">
            <InlineAlert tone="warning">{t('recoveryHint')}</InlineAlert>
            <Grid templateColumns="repeat(2, max-content)" columnGap="6" rowGap="1.5" dir="ltr" bg="bg.muted" p="3" rounded="l2" w="fit-content">
              {recoveryCodes.map((c) => (
                <chakra.code key={c} fontFamily="mono" fontSize="sm">
                  {c}
                </chakra.code>
              ))}
            </Grid>
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <HStack>
            <Button variant="secondary" onClick={() => void copyCodes()}>
              {copied ? t('recoveryCopied') : t('recoveryCopy')}
            </Button>
            <Button onClick={() => close(true)} data-testid="recovery-codes-saved">
              {t('recoverySaved')}
            </Button>
          </HStack>
        </Dialog.Footer>
      </>
    );
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => !e.open && mayDismiss && close(false)}
      closeOnInteractOutside={mayDismiss}
      closeOnEscape={mayDismiss}
      placement="center"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="step-up" data-stage={stage}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            {body}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
