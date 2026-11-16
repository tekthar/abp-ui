import { useEffect, useState } from 'react';
import { HStack, Input, Stack } from '@chakra-ui/react';
import { Button, Field, InlineAlert, notify, PageHeader, Panel, SelectField, SwitchField, useApiAction, useApiQuery, useAreaRequest } from '@abpjs/ui';
import { splitList } from '@abpjs/ui/rules';
import { useGuardNs } from './texts';
import type { DirectoryDto, SignUpSettingsDto } from './types';

/**
 * Sign-up, for site admins: off by default. On, people create their own accounts in the internal directory chosen
 * here, optionally only with an email in some domains; an account is active once its email is confirmed. Which places
 * they may use is a grant like any other, to that directory's "everyone" group.
 */
export function SignUpScreen() {
  const t = useGuardNs('signUpSettings');
  const request = useAreaRequest('guard');
  const settings = useApiQuery<SignUpSettingsDto>('guard', '/signup/settings');
  const directories = useApiQuery<DirectoryDto[]>('guard', '/directories');
  const action = useApiAction();
  const [form, setForm] = useState({ enabled: false, directoryId: '', domains: '' });

  useEffect(() => {
    const s = settings.data;
    if (s) setForm({ enabled: s.enabled, directoryId: s.directoryId ?? '', domains: s.emailDomains.join(', ') });
  }, [settings.data]);

  if (settings.error) return <InlineAlert tone="danger">{settings.error}</InlineAlert>;
  const internal = (directories.data ?? []).filter((d) => d.type === 'internal');
  const chosen = internal.find((d) => d.id === form.directoryId);

  async function save() {
    const saved = await action.run(() =>
      request<SignUpSettingsDto>('/signup/settings', {
        method: 'PUT',
        body: { enabled: form.enabled, directoryId: form.directoryId || null, emailDomains: splitList(form.domains) },
      }),
    );
    if (saved) {
      settings.setData(saved);
      notify.success(t('saved'));
    }
  }

  return (
    <Stack gap="section">
      <PageHeader title={t('title')} description={t('subtitle')} />
      {/* While the settings load, the form is drawn as it will be, its fields as their ghosts. */}
      <Panel data-testid="signup-settings" loading={!settings.data}>
        <Stack gap="field" maxW="2xl">
          <SwitchField label={t('enabled')} checked={form.enabled} onCheckedChange={(c) => setForm({ ...form, enabled: c })} />
          <Field label={t('directory')} helperText={t('directoryHint')}>
            <SelectField
              value={form.directoryId}
              onChange={(e) => setForm({ ...form, directoryId: e.target.value })}
              options={[{ value: '', label: t('chooseDirectory') }, ...internal.map((d) => ({ value: d.id, label: d.name }))]}
            />
          </Field>
          <Field label={t('domains')} helperText={t('domainsHint')}>
            <Input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} dir="ltr" placeholder="acme.com, example.org" />
          </Field>
          {chosen && <InlineAlert tone="info">{t('grantHint', { group: `${chosen.name} (everyone)` })}</InlineAlert>}
          <InlineAlert tone="danger">{action.error}</InlineAlert>
          <HStack>
            <Button onClick={() => void save()} loading={action.busy}>
              {t('save')}
            </Button>
          </HStack>
        </Stack>
      </Panel>
    </Stack>
  );
}
