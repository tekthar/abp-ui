import { useEffect, useState, type FormEvent } from 'react';
import { Box, chakra, Grid, HStack, Image, Input, Stack, Text } from '@chakra-ui/react';
import { AppLink, Button, errorText, Field, InlineAlert, looksLikeCode, notify } from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { AppEnrolmentDto, SecondFactorSenderDto } from './types';

/** The authenticator app's base32 key in groups of four, easier to type into an app. */
export function groupedKey(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * A way a code is sent, in the person's language: `secondFactor.sender.{method}` when the host gives it (its non-word
 * characters as underscores: `acme.messaging:sms` is `secondFactor.sender.acme_messaging_sms`), email by name, else the
 * name the sender gives itself.
 */
export function useSenderName(): (sender: SecondFactorSenderDto) => string {
  const t = useGuardNs('secondFactor');
  return (sender) => {
    const key = `sender.${sender.method.replace(/\W/g, '_')}`;
    const own = t(key);
    if (own !== `secondFactor.${key}`) return own;
    return sender.method === 'email' ? t('kinds.email') : sender.name;
  };
}

/** A code field for six digits, or a recovery code: what a phone's keyboard and a password manager should offer. */
export function CodeInput({
  recovery,
  value,
  onChange,
  autoFocus = true,
}: {
  recovery?: boolean;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
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
  );
}

export interface AppSetupProps {
  /** Makes the secret: the key, its `otpauth:` address and its QR code. */
  start: () => Promise<AppEnrolmentDto>;
  /** Checks the first code: the recovery codes (null when the person has some already), or false for a wrong code. */
  confirm: (code: string) => Promise<string[] | null | false>;
  onDone: (recoveryCodes: string[] | null) => void;
  onCancel?: () => void;
}

/**
 * Setting up an authenticator app: the QR code to scan, the key to type in, a link that opens an app on this device,
 * and the first code.
 */
export function AppSetup({ start, confirm, onDone, onCancel }: AppSetupProps) {
  const t = useGuardNs('secondFactor.setup');
  const [enrolment, setEnrolment] = useState<AppEnrolmentDto | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    start().then(
      (e) => live && setEnrolment(e),
      (e: unknown) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
    // Once: a new secret each time would leave the app with the old one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await confirm(code.replace(/\D/g, ''));
      if (result === false) {
        setError(t('wrongCode'));
        setCode('');
        return;
      }
      onDone(result);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void verify(e)} data-testid="app-setup">
      <Stack gap="field">
        <Text color="fg.muted">{t('scan')}</Text>
        <Grid templateColumns={{ base: '1fr', sm: 'auto minmax(0, 1fr)' }} gap="5" alignItems="center">
          <Box bg="white" p="2" rounded="l2" borderWidth="1px" w="fit-content">
            {enrolment ? <Image src={enrolment.qr} alt={t('qrAlt')} width="44" height="44" data-testid="app-setup-qr" /> : <Box width="44" height="44" />}
          </Box>
          <Stack gap="2" minW="0">
            <Text textStyle="body.sm" color="fg.muted">
              {t('cantScan')}
            </Text>
            <Box
              as="code"
              dir="ltr"
              textAlign="start"
              fontFamily="mono"
              fontSize="sm"
              bg="bg.muted"
              p="2"
              rounded="l2"
              wordBreak="break-all"
              data-testid="app-setup-secret"
            >
              {enrolment ? groupedKey(enrolment.secret) : ' '}
            </Box>
            {enrolment && (
              <AppLink href={enrolment.address} textStyle="body.sm">
                {t('onThisDevice')}
              </AppLink>
            )}
          </Stack>
        </Grid>
        <Field label={t('code')} helperText={t('codeHint')}>
          <CodeInput value={code} onChange={setCode} autoFocus={false} />
        </Field>
        <InlineAlert tone="danger">{error}</InlineAlert>
        <HStack>
          <Button type="submit" loading={busy} disabled={!enrolment || !looksLikeCode(code, false)}>
            {t('verify')}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={busy}>
              {t('cancel')}
            </Button>
          )}
        </HStack>
      </Stack>
    </form>
  );
}

/** Recovery codes, shown once: to copy or download, and a button for when they're saved. */
export function RecoveryCodes({ codes, onSaved, savedLabel }: { codes: string[]; onSaved: () => void; savedLabel?: string }) {
  const t = useGuardNs('secondFactor.recovery');

  function text() {
    const site = typeof window === 'undefined' ? '' : window.location.host;
    return `${t('fileHeader', { site })}\n\n${codes.join('\n')}\n`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      notify.success(t('copied'));
    } catch {
      notify.error(t('copyFailed'));
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text()], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${window.location.hostname}-recovery-codes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack gap="field" data-testid="recovery-codes">
      <InlineAlert tone="warning">{t('hint')}</InlineAlert>
      <Grid templateColumns="repeat(2, max-content)" columnGap="6" rowGap="1.5" dir="ltr" bg="bg.muted" p="3" rounded="l2" w="fit-content">
        {codes.map((c) => (
          <chakra.code key={c} fontFamily="mono" fontSize="sm">
            {c}
          </chakra.code>
        ))}
      </Grid>
      <HStack wrap="wrap">
        <Button variant="secondary" onClick={() => void copy()}>
          {t('copy')}
        </Button>
        <Button variant="secondary" onClick={download}>
          {t('download')}
        </Button>
        <Button onClick={onSaved} data-testid="recovery-codes-saved">
          {savedLabel ?? t('saved')}
        </Button>
      </HStack>
    </Stack>
  );
}
