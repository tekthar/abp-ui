import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, HStack, Input, Portal, Stack, Text } from '@chakra-ui/react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { InlineAlert } from '../components/InlineAlert';
import { createAreaTexts } from '../texts/area';
import { AbpApiError } from './errors';
import { useHost } from './HostContext';
import { setStepUpHandler } from './step-up';
import ar from './step-up-texts/ar.json';
import en from './step-up-texts/en.json';

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

/** How the person can give a code: their authenticator app, and the ways the site sends one. */
type Ways = { hasApp: boolean; senders: Sender[] };

/** Whether what was typed can be a code yet: six digits (spaces between are fine), or a recovery code's ten characters. */
export function looksLikeCode(value: string, recovery: boolean): boolean {
  return recovery ? value.replace(/[^A-Za-z0-9]/g, '').length === 10 : value.replace(/\D/g, '').length === 6 && !/[^\d\s]/.test(value);
}

const SEND_ERRORS: Record<string, string> = { too_many_attempts: 'tooManySends', unreachable: 'unreachable', not_sent: 'notSent' };

/**
 * Asks for the password again before a sensitive action (ADR 0109 amendment, on AbpGuard's step-up): the server answers
 * 403 `step_up_required`, the host's request asks here, and the call is tried again once confirmed. A person with a
 * second factor gives a code too, from their app, a recovery code, or one the site sends. Too many wrong passwords end
 * the session (401), which the host's request hands to the host. `AbpProvider` draws it when the host gives
 * `paths.guard`; a host with its own dialog sets `stepUpDialog: false`.
 */
export function StepUpDialog() {
  const t = useStepUpTexts();
  const host = useHost();
  const base = (host.paths.guard ?? '').replace(/\/$/, '');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [ways, setWays] = useState<Ways | null>(null);
  const [method, setMethod] = useState('app');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settle = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    setStepUpHandler(
      () =>
        new Promise<boolean>((resolve) => {
          settle.current = resolve;
          setPassword('');
          setWays(null);
          setMethod('app');
          setCode('');
          setSent({});
          setError(null);
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
    const mine = await host.request<MySecondFactors>(`${base}/me/second-factors`).catch(() => null);
    const found: Ways = { hasApp: mine?.factors.some((f) => f.kind === 'app') ?? true, senders: mine?.senders ?? [] };
    setWays(found);
    setMethod(found.hasApp ? 'app' : found.senders[0]?.method ?? 'app');
  }

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const answer = await host.request<{ to: string }>(`${base}/me/second-factors/send`, { method: 'POST', body: { method } });
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

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await host.request(`${base}/session/step-up`, { method: 'POST', body: ways ? { password, method, code } : { password } });
      close(true);
    } catch (e) {
      if (e instanceof AbpApiError && e.status === 401) {
        close(false);
        return;
      }
      // The password was right; the code is asked for now, and the password kept for the second try.
      if (e instanceof AbpApiError && e.code === 'second_factor_required') {
        await askForCode();
        return;
      }
      setError(e instanceof AbpApiError && e.message ? e.message : t('failed'));
      if (ways && !(e instanceof AbpApiError && e.code === 'step_up_failed')) {
        setCode('');
        return;
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  const sender = ways?.senders.find((s) => s.method === method);
  const recovery = method === 'recovery';
  const sentTo = sent[method];
  const nameOf = (s: Sender) => (s.method === 'email' ? t('email') : s.name);

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && close(false)} placement="center" role="alertdialog">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="step-up">
            <form onSubmit={(e) => void confirm(e)}>
              <Dialog.Header>
                <Dialog.Title>{t('title')}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="field">
                  <Text color="fg.muted">{ways ? t('codeWhy') : t('why')}</Text>
                  <Field label={t('password')}>
                    <Input type="password" autoComplete="current-password" autoFocus={!ways} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
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
                        <Field label={recovery ? t('recoveryCode') : sender ? t('sentCode') : t('code')} helperText={sentTo ? t('sent', { to: sentTo }) : undefined} required>
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
              <Dialog.Footer>
                <HStack>
                  <Button variant="secondary" onClick={() => close(false)} disabled={busy}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" loading={busy} disabled={!password || (!!ways && !looksLikeCode(code, recovery))}>
                    {t('confirm')}
                  </Button>
                </HStack>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
