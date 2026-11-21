import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Grid, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import {
  AddButton,
  Button,
  EmptyState,
  Field,
  IconButton,
  InlineAlert,
  notify,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  SwitchField,
  useApiAction,
  useApiQuery,
  useAreaRequest,
} from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { SignUpSettingsDto } from './types';

export interface SignUpScreenProps {
  /**
   * Whether the host shows AbpGuard's Directories page (its Directories feature on), so the hint may point to it for
   * adding an internal directory; true by default.
   */
  directoriesPage?: boolean;
}

interface SignUpForm {
  enabled: boolean;
  directoryId: string;
  domains: string[];
}

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

function fromSettings(s: SignUpSettingsDto): SignUpForm {
  return { enabled: s.enabled, directoryId: s.directoryId ?? '', domains: [...s.emailDomains] };
}

/** How many changes the form holds over what's saved: the switch, the directory, and each domain added or taken out. */
export function signUpChanges(saved: SignUpForm, form: SignUpForm): number {
  const was = new Set(saved.domains);
  const now = new Set(form.domains);
  return (
    Number(saved.enabled !== form.enabled) +
    Number(saved.directoryId !== form.directoryId) +
    form.domains.filter((d) => !was.has(d)).length +
    saved.domains.filter((d) => !now.has(d)).length
  );
}

/** A domain as typed ("@Acme.com ") as it's kept ("acme.com"), or null when it isn't one. */
export function normalDomain(typed: string): string | null {
  const d = typed.trim().replace(/^@/, '').replace(/\.$/, '').toLowerCase();
  return DOMAIN.test(d) ? d : null;
}

/**
 * Sign-up, for site admins: off by default. On, people create their own accounts in the internal directory chosen
 * here, optionally only with an email in some domains; an account is active once its email is confirmed. Which places
 * they may use is a grant like any other, to that directory's "everyone" group. The directories to choose from come
 * with the settings, so the page works with the Directories feature off. Edited in place: a change brings the save bar,
 * and Discard puts back what's saved. Never set up, the page is its empty state, whose button turns sign-up on.
 */
export function SignUpScreen({ directoriesPage = true }: SignUpScreenProps = {}) {
  const t = useGuardNs('signUpSettings');
  const request = useAreaRequest('guard');
  const settings = useApiQuery<SignUpSettingsDto>('guard', '/signup/settings');
  const action = useApiAction();
  const [form, setForm] = useState<SignUpForm>({ enabled: false, directoryId: '', domains: [] });
  const [started, setStarted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const [directoryError, setDirectoryError] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const draftInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.data) setForm(fromSettings(settings.data));
  }, [settings.data]);

  const saved = useMemo(() => (settings.data ? fromSettings(settings.data) : form), [settings.data, form]);
  const changes = settings.data ? signUpChanges(saved, form) : 0;

  if (settings.error) return <InlineAlert tone="danger">{settings.error}</InlineAlert>;
  const listed: { id: string; name: string }[] = settings.data?.directories ?? [];
  // The directory chosen before may since have been switched off: still named, so the choice shows as it is.
  const current = settings.data?.directoryId;
  const internal = current && !listed.some((d) => d.id === current) && settings.data?.directoryName
    ? [...listed, { id: current, name: settings.data.directoryName }]
    : listed;
  const chosen = internal.find((d) => d.id === form.directoryId);
  const neverSetUp = !!settings.data && !settings.data.enabled && !settings.data.directoryId && settings.data.emailDomains.length === 0;

  function change(next: Partial<SignUpForm>) {
    setForm((f) => ({ ...f, ...next }));
    action.setError(null);
  }

  function addDraft() {
    const domain = normalDomain(draft);
    if (!domain) {
      setDraftError(t('domainInvalid'));
      return;
    }
    if (form.domains.includes(domain)) {
      setDraftError(t('domainTwice', { domain }));
      return;
    }
    change({ domains: [...form.domains, domain] });
    setDraft('');
    setDraftError('');
    draftInput.current?.focus();
  }

  function closeDraft() {
    setAdding(false);
    setDraft('');
    setDraftError('');
    requestAnimationFrame(() => addButton.current?.focus());
  }

  function onDraftKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDraft();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDraft();
    }
  }

  function discard() {
    if (settings.data) setForm(fromSettings(settings.data));
    setStarted(false);
    setDirectoryError('');
    closeDraft();
    action.setError(null);
  }

  async function save() {
    if (form.enabled && !form.directoryId) {
      setDirectoryError(t('directoryRequired'));
      return;
    }
    const result = await action.run(() =>
      request<SignUpSettingsDto>('/signup/settings', {
        method: 'PUT',
        body: { enabled: form.enabled, directoryId: form.directoryId || null, emailDomains: form.domains },
      }),
    );
    if (result) {
      settings.setData(result);
      setStarted(false);
      closeDraft();
      notify.success(t('saved'));
    }
  }

  const saveBar = <SaveBar open={changes > 0} count={changes} onSave={() => void save()} onDiscard={discard} busy={action.busy} />;

  if (neverSetUp && !started && changes === 0) {
    return (
      <Stack gap="section">
        <PageHeader title={t('title')} description={t('subtitle')} />
        <EmptyState
          variant="page"
          size="md"
          kind="first-use"
          illustration="records"
          title={t('emptyTitle')}
          description={t('emptyText')}
          action={
            <Button variant="primary" onClick={() => { setStarted(true); change({ enabled: true }); }}>
              {t('turnOn')}
            </Button>
          }
        />
      </Stack>
    );
  }

  return (
    <Stack gap="section">
      <PageHeader title={t('title')} description={t('subtitle')} />
      {/* While the settings load, the form is drawn as it will be, its fields as their ghosts. */}
      <Panel data-testid="signup-settings" loading={!settings.data}>
        <Stack gap="5">
          <SwitchField label={t('enabled')} checked={form.enabled} onCheckedChange={(c) => { change({ enabled: c }); if (!c) setDirectoryError(''); }} />
          {form.enabled ? (
            <Grid templateColumns={{ base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }} gap={{ base: '5', md: '4 8' }} alignItems="start">
              <Field
                label={t('directory')}
                required
                invalid={!!directoryError}
                errorText={directoryError}
                helperText={chosen ? t('grantHint', { group: `${chosen.name} (everyone)` }) : directoriesPage ? t('directoryHint') : t('directoryHintPlain')}
              >
                <SelectField
                  value={form.directoryId}
                  onChange={(e) => { change({ directoryId: e.target.value }); setDirectoryError(''); }}
                  options={[{ value: '', label: t('chooseDirectory') }, ...internal.map((d) => ({ value: d.id, label: d.name }))]}
                />
              </Field>
              <Stack gap="2" minW="0" role="group" aria-labelledby="signup-domains">
                <Text id="signup-domains" textStyle="label">{t('domains')}</Text>
                <Stack gap="1">
                  {form.domains.length === 0 && !adding && (
                    <Text textStyle="body.sm" color="fg.muted" py="1.5">{t('anyDomain')}</Text>
                  )}
                  {form.domains.map((d) => (
                    <HStack key={d} gap="2" minH="11" ps="3" pe="1" borderRadius="l2" bg="bg.subtle" textStyle="body.sm">
                      <Text flex="1" minW="0" fontWeight="bold" dir="ltr" textAlign="start" truncate>{d}</Text>
                      <IconButton remove size="sm" aria-label={t('removeDomain', { domain: d })}
                        onClick={() => change({ domains: form.domains.filter((x) => x !== d) })}>
                        <Trash2 />
                      </IconButton>
                    </HStack>
                  ))}
                </Stack>
                {adding ? (
                  <Field invalid={!!draftError} errorText={draftError}>
                    <HStack gap="3" align="center" w="full">
                      <Input ref={draftInput} autoFocus aria-label={t('addDomain')} value={draft} dir="ltr" placeholder="acme.com" maxW={{ md: '20rem' }} flex="1"
                        onChange={(e) => { setDraft(e.target.value); setDraftError(''); }} onKeyDown={onDraftKey}
                        onBlur={() => { if (!draft.trim()) closeDraft(); }} />
                      <AddButton onMouseDown={(e) => e.preventDefault()} onClick={addDraft}>{t('add')}</AddButton>
                    </HStack>
                  </Field>
                ) : (
                  <AddButton ref={addButton} alignSelf="flex-start" onClick={() => setAdding(true)}>{t('addDomain')}</AddButton>
                )}
              </Stack>
            </Grid>
          ) : (
            <Text textStyle="body.sm" color="fg.muted">{t('off')}</Text>
          )}
          <InlineAlert tone="danger">{action.error}</InlineAlert>
        </Stack>
      </Panel>
      {saveBar}
    </Stack>
  );
}
