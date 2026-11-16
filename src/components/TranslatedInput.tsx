import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Box, chakra, Group, HStack, Input, Popover, Portal, Stack, Text } from '@chakra-ui/react';
import { Languages } from 'lucide-react';
import { useHostLanguages, useOptionalHost, type HostLanguage, type NameSuggestion } from '../host/HostContext';
import { useAbpLabels } from '../provider/labels';
import { directionOf, useAbpLocale } from '../provider/locale';
import { languageChain, pickName } from '../rules/names';
import { formatMessage } from '../texts/format';
import { EMPTY_VALUE } from '../utils/format';
import { Button } from './Button';

export type NamesValue = Record<string, string>;

export interface TranslatedInputProps {
  /** Names by language code. */
  value: NamesValue;
  onChange: (value: NamesValue) => void;
  /** Shown when nothing is given in a language, and the last resort for what shows (usually the object's key). */
  fallback?: string;
  'aria-label'?: string;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  /** Offer names already translated while typing (the host's `suggestNames`; default on where the host has it). */
  suggest?: boolean;
}

const MIN_QUERY = 2;
const LIST_MAX_HEIGHT = 288;

/**
 * A name in every language the site offers (the host's `languages`): the reader's language inline, the others behind a
 * button that shows how many are filled in. Each language is typed in its own direction, and one left empty says which
 * name shows instead. Where the host offers names already translated (`suggestNames`), typing lists them, and picking
 * one fills in every language at once, so a name is translated the same way everywhere. A host with no languages gets
 * one field.
 */
export function TranslatedInput({
  value,
  onChange,
  fallback = '',
  'aria-label': ariaLabel,
  placeholder,
  size = 'md',
  disabled,
  autoFocus,
  onBlur,
  suggest = true,
}: TranslatedInputProps) {
  const labels = useAbpLabels().translations;
  const { locale } = useAbpLocale();
  const host = useOptionalHost();
  const suggestNames = suggest ? host?.suggestNames : undefined;
  const hostLanguages = useHostLanguages();
  const base = locale.split('-')[0];
  const current: HostLanguage = hostLanguages.find((l) => l.code === locale) ??
    hostLanguages.find((l) => l.code === base) ?? { code: locale, name: locale, direction: directionOf(locale) };
  const dirOf = (l: HostLanguage) => l.direction ?? directionOf(l.code);
  const chain = languageChain(current.code, hostLanguages[0]?.code);
  const others = hostLanguages.filter((l) => l.code !== current.code);
  const filled = others.filter((l) => value[l.code]?.trim()).length;
  const say = (text: string, values: Record<string, string | number>) => formatMessage(locale, text, values);

  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  // Suggestions follow typing only, never the initial value; a short pause between keys, and only the last answer counts.
  useEffect(() => {
    if (!suggestNames || !focused || query.trim().length < MIN_QUERY) {
      setSuggestions([]);
      return;
    }
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSuggestions(await suggestNames(query.trim(), abort.signal));
        setActive(0);
      } catch {
        /* no suggestions: the field still works */
      }
    }, 150);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [query, focused, suggestNames]);

  // The list sits under the field (above it when there's no room below), in a portal so dialogs and tables don't clip it.
  const open = focused && suggestions.length > 0;
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = input.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom;
      const up = below < LIST_MAX_HEIGHT + 8 && rect.top > below;
      setPlace({
        left: rect.left,
        width: Math.max(rect.width, 320),
        ...(up ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
      });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  function set(code: string, text: string) {
    const next = { ...value };
    if (text.trim()) next[code] = text;
    else delete next[code];
    onChange(next);
  }

  function pick(s: NameSuggestion) {
    onChange({ ...s.names });
    setQuery('');
    setSuggestions([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      // Closes the list, not the dialog around the field.
      e.preventDefault();
      e.stopPropagation();
      setQuery('');
      setSuggestions([]);
    }
  }

  const shown = pickName(chain, value, fallback);
  return (
    <Group attached w="full">
      <Input
        ref={input}
        size={size}
        lang={current.code}
        dir={dirOf(current)}
        value={value[current.code] ?? ''}
        placeholder={value[current.code] ? placeholder : shown || placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        role={suggestNames ? 'combobox' : undefined}
        aria-autocomplete={suggestNames ? 'list' : undefined}
        aria-expanded={suggestNames ? open : undefined}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setQuery('');
          onBlur?.();
        }}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          set(current.code, e.target.value);
          setQuery(e.target.value);
        }}
      />
      {open && place && (
        <Portal>
          <Box
            as="ul"
            id={listId}
            role="listbox"
            aria-label={labels.suggestions}
            data-testid="translation-suggestions"
            position="fixed"
            zIndex="popover"
            maxW="calc(100vw - 16px)"
            maxH={`${LIST_MAX_HEIGHT}px`}
            overflowY="auto"
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border"
            rounded="l2"
            shadow="lg"
            py="1"
            style={place}
          >
            {suggestions.map((s, i) => (
              <Box
                as="li"
                key={`${s.source ?? ''}:${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                px="3"
                py="1.5"
                cursor="pointer"
                bg={i === active ? 'bg.muted' : undefined}
                onMouseEnter={() => setActive(i)}
                // mousedown, not click: the pick must land before the field's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
              >
                <HStack justify="space-between" gap="3" align="baseline">
                  <Text textStyle="body.sm" fontWeight="medium" lang={current.code} dir={dirOf(current)}>
                    {s.names[current.code] ?? <chakra.span color="fg.muted">{pickName(chain, s.names, '')}</chakra.span>}
                  </Text>
                  {s.source && (
                    <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                      {s.source}
                    </Text>
                  )}
                </HStack>
                {others.length > 0 && (
                  <Text fontSize="xs" color="fg.muted">
                    {others.map((l, j) => (
                      <chakra.span key={l.code}>
                        {j > 0 && ' · '}
                        <chakra.span lang={l.code} dir={dirOf(l)}>{s.names[l.code] ?? EMPTY_VALUE}</chakra.span>
                      </chakra.span>
                    ))}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        </Portal>
      )}
      {others.length > 0 && (
        <Popover.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
          <Popover.Trigger asChild>
            <Button
              variant="secondary"
              size={size}
              disabled={disabled}
              aria-label={say(labels.open, { name: shown || ariaLabel || '', filled, total: others.length })}
              title={say(labels.count, { filled, total: others.length })}
              data-testid="translations"
            >
              <Languages />
              <Text as="span" fontVariantNumeric="tabular-nums" color={filled < others.length ? 'fg.muted' : undefined}>
                {filled}/{others.length}
              </Text>
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="sm" maxW="calc(100vw - 32px)">
                <Popover.Arrow />
                <Popover.Body>
                  <Text textStyle="label" mb="2">
                    {labels.title}
                  </Text>
                  <Stack gap="3">
                    {others.map((l) => {
                      const own = value[l.code] ?? '';
                      const fallbackShown = pickName([l.code, ...chain.filter((c) => c !== l.code)], { ...value, [l.code]: '' }, fallback);
                      return (
                        <Box key={l.code}>
                          <chakra.label htmlFor={`tr-${listId}-${l.code}`} textStyle="body.sm" fontWeight="medium">
                            {l.name}
                            {l.englishName && l.englishName !== l.name && (
                              <Text as="span" color="fg.muted" fontWeight="normal">
                                {' · '}
                                {l.englishName}
                              </Text>
                            )}
                          </chakra.label>
                          <Input
                            id={`tr-${listId}-${l.code}`}
                            size="sm"
                            mt="1"
                            lang={l.code}
                            dir={dirOf(l)}
                            value={own}
                            placeholder={fallbackShown}
                            disabled={disabled}
                            onChange={(e) => set(l.code, e.target.value)}
                          />
                          {!own.trim() && fallbackShown && (
                            <Text fontSize="xs" color="fg.muted" mt="0.5">
                              {say(labels.missing, { shown: fallbackShown })}
                            </Text>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </Group>
  );
}
