import { useState } from 'react';
import { Grid, HStack, Input, Progress, Stack, Text, VisuallyHidden } from '@chakra-ui/react';
import { Languages as LanguagesIcon, Star, Trash2 } from 'lucide-react';
import {
  AppLink,
  Button,
  DataTable,
  errorText,
  Field,
  FormDialog,
  HostSlot,
  IconButton,
  notify,
  PageHeader,
  Panel,
  SelectField,
  StatusPill,
  SwitchField,
  useApiQuery,
  useAreaRequest,
  useConfirm,
  type DataTableColumn,
} from '@abpjs/ui';
import { useLanguagesTexts } from './texts';
import type { LanguageInfo, LanguageInput, LanguagesList } from './types';

/** The languages written right to left, to guess a new language's direction from its code (the server does the same). */
const RTL = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'ku', 'ckb', 'dv', 'yi', 'sd', 'ug']);

export interface LanguagesScreenProps {
  /** Where a language's translation editor opens. */
  translateHref: (code: string) => string;
  /** Told after every change, once the server has it: the host reads its languages and texts again. */
  onChanged?: () => void | Promise<void>;
}

/**
 * The site's languages (AbpLanguages): each with its direction, the language it falls back to and how far it's
 * translated; add one, edit one, turn one off, make one the default, remove one, or open its translation editor. The
 * host's own links go in the `languages.list.actions` slot, beside Add.
 */
export function LanguagesScreen({ translateHref, onChanged }: LanguagesScreenProps) {
  const t = useLanguagesTexts();
  const confirm = useConfirm();
  const request = useAreaRequest('languages');
  const data = useApiQuery<LanguagesList>('languages', '/languages?all=true');
  const [editing, setEditing] = useState<LanguageInfo | 'new' | null>(null);
  const languages = data.data?.languages ?? [];

  async function changed() {
    await data.reload();
    await onChanged?.();
  }

  async function change(language: LanguageInfo, body: LanguageInput) {
    try {
      await request(`/languages/${encodeURIComponent(language.code)}`, { method: 'PUT', body });
      await changed();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  async function remove(language: LanguageInfo) {
    const sure = await confirm({ title: t('deleteTitle', { name: language.englishName }), description: t('deleteDescription'), confirmLabel: t('delete'), danger: true });
    if (!sure) return;
    try {
      await request(`/languages/${encodeURIComponent(language.code)}`, { method: 'DELETE' });
      await changed();
    } catch (e) {
      notify.error(errorText(e));
    }
  }

  const columns: DataTableColumn<LanguageInfo>[] = [
    {
      id: 'language',
      header: t('language'),
      cell: (l) => (
        <Stack gap="0.5">
          <HStack gap="2">
            <Button variant="link" size="sm" onClick={() => setEditing(l)}>
              <span lang={l.code} dir={l.direction}>{l.nativeName}</span>
            </Button>
            {l.isDefault && <StatusPill tone="info">{t('default')}</StatusPill>}
          </HStack>
          <Text textStyle="caption" color="fg.muted">
            {l.englishName} · <span dir="ltr">{l.code}</span> · {t(`directions.${l.direction === 'rtl' ? 'rtl' : 'ltr'}`)}
          </Text>
        </Stack>
      ),
    },
    {
      id: 'fallback',
      header: t('fallback'),
      cell: (l) => (l.fallback ? languages.find((x) => x.code === l.fallback)?.englishName ?? l.fallback : <Text color="fg.muted">{t('defaultFallback')}</Text>),
    },
    {
      id: 'progress',
      header: t('translated'),
      cell: (l) => {
        const total = Number(l.total ?? 0);
        const done = Number(l.translated ?? 0);
        const percent = total ? Math.floor((done / total) * 100) : 0;
        return (
          <Stack gap="1" minW="40">
            <Progress.Root value={percent} size="xs" colorPalette={percent === 100 ? 'green' : 'blue'}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text textStyle="caption" color="fg.muted">{t('progress', { done, total, percent })}</Text>
          </Stack>
        );
      },
    },
    {
      id: 'enabled',
      header: t('enabled'),
      skeleton: 'none',
      cell: (l) => (
        <SwitchField
          label={<VisuallyHidden>{t('enabledLabel', { name: l.englishName })}</VisuallyHidden>}
          checked={l.enabled}
          disabled={l.isDefault}
          onCheckedChange={(v) => change(l, { enabled: v })}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'end',
      skeleton: 'none',
      cell: (l) => (
        <HStack gap="1" justify="flex-end">
          <AppLink href={translateHref(l.code)} fontWeight="medium" display="inline-flex" alignItems="center" gap="1">
            <LanguagesIcon size={14} />
            {t('translate')}
          </AppLink>
          {!l.isDefault && l.enabled && (
            <IconButton size="xs" variant="ghost" aria-label={t('makeDefault', { name: l.englishName })} onClick={() => change(l, { isDefault: true })}>
              <Star />
            </IconButton>
          )}
          {!l.isDefault && l.code !== 'en' && (
            <IconButton danger size="xs" variant="ghost" aria-label={t('deleteTitle', { name: l.englishName })} onClick={() => remove(l)}>
              <Trash2 />
            </IconButton>
          )}
        </HStack>
      ),
    },
  ];

  return (
    <Stack gap="section">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <HStack gap="2">
            <HostSlot name="languages.list.actions" />
            <Button onClick={() => setEditing('new')}>{t('add')}</Button>
          </HStack>
        }
      />
      <Panel>
        <DataTable
          aria-label={t('title')}
          columns={columns}
          rows={data.data?.languages}
          getRowId={(l) => l.code}
          loading={data.loading && !data.data}
          error={data.error}
          empty={t('none')}
        />
      </Panel>
      {editing && (
        <LanguageDialog
          language={editing === 'new' ? null : editing}
          languages={languages}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await changed();
          }}
        />
      )}
    </Stack>
  );
}

/** A new language, or one's names, direction and fallback. Its code is fixed once it's made. */
function LanguageDialog({ language, languages, onClose, onSaved }: {
  language: LanguageInfo | null;
  languages: LanguageInfo[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const t = useLanguagesTexts();
  const request = useAreaRequest('languages');
  const [code, setCode] = useState(language?.code ?? '');
  const [englishName, setEnglishName] = useState(language?.englishName ?? '');
  const [nativeName, setNativeName] = useState(language?.nativeName ?? '');
  const [direction, setDirection] = useState(language?.direction ?? '');
  const [fallback, setFallback] = useState(language?.fallback ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guessed = RTL.has(code.trim().toLowerCase().split('-')[0] ?? '') ? 'rtl' : 'ltr';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body: LanguageInput = {
        code: code.trim(),
        englishName: englishName.trim(),
        nativeName: nativeName.trim() || englishName.trim(),
        direction: direction || null,
        fallback: fallback || null,
      };
      // Changing a language, an empty fallback is sent as "" so the server clears it; a new one leaves it out.
      if (language) await request(`/languages/${encodeURIComponent(language.code)}`, { method: 'PUT', body: { ...body, fallback } });
      else await request('/languages', { method: 'POST', body });
      await onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={language ? t('edit', { name: language.englishName }) : t('add')}
      submitLabel={t('save')}
      onSubmit={submit}
      busy={busy}
      error={error}
    >
      <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap="field">
        <Field label={t('code')} required helperText={t('codeHelp')}>
          <Input dir="ltr" value={code} disabled={language != null} placeholder="fr, tr, fr-CA" onChange={(e) => setCode(e.target.value)} autoFocus={!language} />
        </Field>
        <Field label={t('englishName')} required>
          <Input value={englishName} placeholder="French" onChange={(e) => setEnglishName(e.target.value)} />
        </Field>
        <Field label={t('nativeName')} helperText={t('nativeNameHelp')}>
          <Input value={nativeName} lang={code || undefined} dir={(direction || guessed) as 'ltr' | 'rtl'} placeholder="Français" onChange={(e) => setNativeName(e.target.value)} />
        </Field>
        <Field label={t('direction')}>
          <SelectField
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            options={[
              { value: '', label: t('directionAuto', { direction: t(`directions.${guessed}`) }) },
              { value: 'ltr', label: t('directions.ltr') },
              { value: 'rtl', label: t('directions.rtl') },
            ]}
          />
        </Field>
      </Grid>
      <Field label={t('fallback')} helperText={t('fallbackHelp')}>
        <SelectField
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          options={[
            { value: '', label: t('defaultFallback') },
            ...languages.filter((l) => l.code !== (language?.code ?? code.trim())).map((l) => ({ value: l.code, label: `${l.englishName} · ${l.code}` })),
          ]}
        />
      </Field>
      {!language && <Text textStyle="caption" color="fg.muted">{t('afterAdding')}</Text>}
    </FormDialog>
  );
}
