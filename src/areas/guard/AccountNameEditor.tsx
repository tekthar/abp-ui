import { useState, type FormEvent } from 'react';
import { HStack, Text } from '@chakra-ui/react';
import { Button, notify, TranslatedInput, useApiAction, useAreaRequest } from '@abpjs/ui';
import { useWrittenName } from './names';
import { useGuardNs } from './texts';

type NamesValue = Record<string, string>;

export interface AccountNameEditorProps {
  name: string;
  /** The person's name in other languages, by language code. */
  names?: Record<string, string> | null;
  /** `/me`, or `/accounts/{id}` for an admin. */
  base: string;
  /** Whether the name may be corrected here: an account of the internal directory, by someone who may change it. */
  correctable: boolean;
  onRenamed: (name: string) => void;
}

/**
 * An account's display name, corrected in place: only an account of the internal directory; a directory's account is
 * corrected in its directory. The person writes their name in each of the site's languages: the English one is the name
 * as written, which history and exports keep; each other language's shows to readers of that language. AbpGuard asks for
 * the password again.
 */
export function AccountNameEditor({ name, names, base, correctable, onRenamed }: AccountNameEditorProps) {
  const t = useGuardNs('accountName');
  const written = useWrittenName();
  const request = useAreaRequest('guard');
  const action = useApiAction();
  const [editing, setEditing] = useState(false);
  const start = (): NamesValue => ({ ...(names ?? {}), en: name });
  const [value, setValue] = useState<NamesValue>(start);
  const typed = (value.en ?? '').trim();
  const others = (v: NamesValue) =>
    Object.fromEntries(Object.entries(v).filter(([code, n]) => code !== 'en' && n && n.trim()).map(([code, n]) => [code, n.trim()]));
  const unchanged = typed === name && JSON.stringify(others(value)) === JSON.stringify(others(names ?? {}));

  async function save(e: FormEvent) {
    e.preventDefault();
    const saved = await action.run(() =>
      request<{ displayName: string; displayNames: Record<string, string> }>(`${base}/name`, {
        method: 'PUT',
        body: { displayName: typed, displayNames: others(value) },
      }),
    );
    if (saved) {
      setEditing(false);
      onRenamed(saved.displayName);
      notify.success(t('saved', { name: written(saved.displayName, saved.displayNames) }));
    }
  }

  if (!editing) {
    return (
      <HStack gap="2">
        <Text as="span">{written(name, names)}</Text>
        {correctable && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setValue(start());
              setEditing(true);
            }}
          >
            {t('change')}
          </Button>
        )}
      </HStack>
    );
  }

  return (
    <form onSubmit={save}>
      <HStack gap="2" wrap="wrap" align="start">
        <TranslatedInput size="sm" value={value} onChange={setValue} fallback={name} aria-label={t('label')} suggest={false} autoFocus />
        <Button size="sm" type="submit" loading={action.busy} disabled={!typed || unchanged}>
          {t('save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t('cancel')}
        </Button>
        {action.error && (
          <Text as="span" textStyle="caption" color="fg.error">
            {action.error}
          </Text>
        )}
      </HStack>
      <Text textStyle="caption" color="fg.muted" mt="1">
        {t('languagesHint')}
      </Text>
    </form>
  );
}
