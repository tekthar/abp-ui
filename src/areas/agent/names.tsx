import { useCallback, useState } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Button, useAbpLocale, useHostLanguages } from '@abpjs/ui';
import { useAgentTexts } from './texts';

/** Names by language, as an agent's are kept: `{ en: 'Triage', ar: 'الفرز' }`. */
export type Names = Record<string, string>;

/**
 * The name to show from names by language: the reader's language, then its base (ar for ar-SA), then the site's first
 * language, then any, then the fallback (an agent's key).
 */
export function useNameOf(): (names: Names | null | undefined, fallback: string) => string {
  const { locale } = useAbpLocale();
  const languages = useHostLanguages();
  const first = languages[0]?.code;
  return useCallback(
    (names: Names | null | undefined, fallback: string) => {
      if (!names) return fallback;
      const base = locale.split('-')[0];
      return (names[locale] || names[base] || (first ? names[first] : '') || Object.values(names).find((v) => v) || fallback).trim();
    },
    [locale, first],
  );
}

/** Names by language with the empty ones left out, as they're saved. */
export const filledIn = (names: Names): Names =>
  Object.fromEntries(Object.entries(names).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));

/**
 * A name in every language the site offers: the reader's inline, the others behind "Other languages". A host that
 * names no languages gets one field, in the reader's.
 */
export function NamesField({ value, onChange, label, placeholder }: {
  value: Names;
  onChange: (value: Names) => void;
  label: string;
  placeholder?: string;
}) {
  const t = useAgentTexts();
  const { locale } = useAbpLocale();
  const languages = useHostLanguages();
  const base = locale.split('-')[0];
  const mine = languages.find((l) => l.code === locale || l.code === base)?.code ?? languages[0]?.code ?? base;
  const others = languages.filter((l) => l.code !== mine);
  const [open, setOpen] = useState(others.some((l) => value[l.code]));
  const set = (code: string, text: string) => onChange({ ...value, [code]: text });

  return (
    <Stack gap="1.5">
      <Input aria-label={label} value={value[mine] ?? ''} placeholder={placeholder} dir="auto" maxLength={120} onChange={(e) => set(mine, e.target.value)} />
      {others.length > 0 && (
        <Button size="xs" variant="link" px="0" alignSelf="flex-start" aria-expanded={open} onClick={() => setOpen(!open)}>
          {t('names.others')}
        </Button>
      )}
      {open && others.map((l) => (
        <HStack key={l.code} gap="2">
          <Text textStyle="caption" color="fg.muted" minW="5rem">{l.name}</Text>
          <Input size="sm" aria-label={`${label} (${l.name})`} value={value[l.code] ?? ''} dir={l.direction ?? 'auto'} maxLength={120}
            onChange={(e) => set(l.code, e.target.value)} />
        </HStack>
      ))}
    </Stack>
  );
}
