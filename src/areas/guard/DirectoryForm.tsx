import { useState, type FormEvent } from 'react';
import { Fieldset, HStack, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { Button, CheckboxField, errorText, Field, HostSlot, InlineAlert, SelectField, TranslatedInput } from '@abpjs/ui';
import { fromNamesValue, toNamesValue } from '@abpjs/ui/rules';
import { useGuardNs } from './texts';
import type { DirectoryInput, DirectorySettingDefinition, DirectoryTypeDto } from './types';

export interface DirectoryFormProps {
  mode: 'create' | 'edit';
  types: DirectoryTypeDto[];
  initial: DirectoryInput;
  /** Called with the input to save; throw to show the error inline. */
  onSubmit: (input: DirectoryInput) => Promise<void>;
  onCancel?: () => void;
  /** Fallback definitions when the directory's type is not registered (its connector's plugin turned off). */
  fallbackSettings?: DirectorySettingDefinition[];
}

function defaultsFor(type: DirectoryTypeDto | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of type?.settings ?? []) out[s.name] = s.defaultValue ?? '';
  return out;
}

/**
 * A directory's settings: its name by language, type, sync interval, whether it's active and signs people in, and its
 * connector's own settings (a secret is kept unless a new one is typed). A host may offer presets for a type's
 * settings through the `guard.directory.presets` slot (`apply(settings)` fills them).
 */
export function DirectoryForm({ mode, types, initial, onSubmit, onCancel, fallbackSettings }: DirectoryFormProps) {
  const t = useGuardNs('directoryForm');
  const tc = useGuardNs('common');
  const [input, setInput] = useState<DirectoryInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const type = types.find((x) => x.type === input.type);
  const definitions = type?.settings ?? fallbackSettings ?? [];

  function set<K extends keyof DirectoryInput>(key: K, value: DirectoryInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function setSetting(name: string, value: string) {
    setInput((prev) => ({ ...prev, settings: { ...prev.settings, [name]: value } }));
  }

  function changeType(next: string) {
    const nextType = types.find((x) => x.type === next);
    setInput((prev) => ({ ...prev, type: next, settings: defaultsFor(nextType) }));
  }

  function applyPreset(settings: Record<string, string>) {
    setInput((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Stack gap="field">
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="field">
          <Field label={t('name')} required>
            <TranslatedInput
              value={toNamesValue(input.name, input.names)}
              aria-label={t('name')}
              onChange={(v) => {
                const { name, names } = fromNamesValue(v);
                setInput({ ...input, name, names });
              }}
            />
          </Field>
          <Field label={t('type')} required>
            {mode === 'create' ? (
              <SelectField
                value={input.type}
                onChange={(e) => changeType(e.target.value)}
                options={[
                  { value: '', label: t('selectType'), disabled: true },
                  ...types.map((x) => ({
                    value: x.type,
                    label: x.pluginKey ? t('typeFromPlugin', { name: x.displayName, plugin: x.pluginKey }) : x.displayName,
                  })),
                ]}
              />
            ) : (
              <Input value={type?.displayName ?? input.type} readOnly />
            )}
          </Field>
          <Field label={t('syncInterval')} helperText={t('syncIntervalHint')}>
            <Input
              type="number"
              min={1}
              value={input.syncIntervalMinutes ?? ''}
              onChange={(e) => set('syncIntervalMinutes', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Stack gap="2" justify="flex-end" pb="1">
            <CheckboxField label={t('active')} checked={input.isActive} onCheckedChange={(v) => set('isActive', v)} />
            <CheckboxField label={t('signInEnabled')} checked={input.authenticationEnabled} onCheckedChange={(v) => set('authenticationEnabled', v)} />
          </Stack>
        </SimpleGrid>

        {type && type.capabilities.length > 0 && (
          <Text textStyle="caption" color="fg.muted">
            {t('capabilities', { list: type.capabilities.join(', ') })}
          </Text>
        )}

        {definitions.length > 0 && (
          <Fieldset.Root layerStyle="sunken" p="panel">
            <Fieldset.Legend textStyle="label" px="1">
              {t('connectionSettings')}
            </Fieldset.Legend>
            <Fieldset.Content gap="field">
              {input.type && <HostSlot name="guard.directory.presets" context={{ type: input.type, apply: applyPreset }} />}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="field">
                {definitions.map((d) => (
                  <Field key={d.name} label={d.label || d.name} helperText={d.help ?? undefined} required={d.required && !(d.secret && mode === 'edit')}>
                    <Input
                      type={d.secret ? 'password' : 'text'}
                      autoComplete={d.secret ? 'new-password' : 'off'}
                      value={input.settings?.[d.name] ?? ''}
                      placeholder={d.secret && mode === 'edit' ? t('keepSecret') : (d.defaultValue ?? '')}
                      dir="auto"
                      onChange={(e) => setSetting(d.name, e.target.value)}
                    />
                  </Field>
                ))}
              </SimpleGrid>
            </Fieldset.Content>
          </Fieldset.Root>
        )}

        <InlineAlert tone="danger">{error}</InlineAlert>
        <HStack gap="2">
          <Button type="submit" variant="primary" loading={busy} disabled={!input.type}>
            {mode === 'create' ? t('create') : t('save')}
          </Button>
          {onCancel && <Button onClick={onCancel}>{tc('cancel')}</Button>}
        </HStack>
      </Stack>
    </form>
  );
}

/**
 * What a directory's connector warns of in its settings: a read without TLS, a certificate check turned off. A
 * warning, not an error: the directory is saved and works; people's data travels in the clear.
 */
export function DirectoryWarnings({ title, warnings }: { title: string; warnings?: string[] | null }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <InlineAlert tone="warning" title={title} data-testid="directory-warnings">
      <Stack gap="0.5" as="ul" listStyle="none">
        {warnings.map((w) => (
          <li key={w}>
            <Text dir="auto">{w}</Text>
          </li>
        ))}
      </Stack>
    </InlineAlert>
  );
}
