import { Fragment, useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, chakra, Input, Spinner, Text } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { formatMessage } from '../texts/format';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';

/** Where a picker's option can be made from the text typed ("Add “Acme” as a new vendor"). */
const CREATE = Symbol('create');

/** How many options a search shows; more matches say "the first N". */
const SHOWN = 8;

/**
 * A text with the part matching what was typed in bold, every match, ignoring case; as it was when nothing is typed or
 * nothing matches.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(needle); i >= 0; i = lower.indexOf(needle, at)) {
    if (i > at) parts.push(text.slice(at, i));
    parts.push(<chakra.strong key={i} fontWeight="bold">{text.slice(i, i + q.length)}</chakra.strong>);
    at = i + q.length;
  }
  if (parts.length === 0) return <>{text}</>;
  parts.push(text.slice(at));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

/** A value that follows another after it has stood still for `ms`. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

export interface SearchPickerMessages {
  placeholder: string;
  searching: string;
  noMatches: string;
  noKnown: string;
  /** Under the list when nothing can be searched and only `known` is offered. */
  limitedHint?: string;
}

export interface SearchPickerProps<T> {
  value: T | null;
  onChange: (item: T | null) => void;
  /** Searches as the person types; null when there's nothing to search, and only `known` is offered. */
  search: ((text: string) => Promise<T[]>) | null;
  /** Items to offer without searching (people on the page…), filtered by the text typed. */
  known?: T[];
  getId: (item: T) => string;
  /** The text the input shows for the chosen item, and what typing filters `known` by. */
  label: (item: T) => string;
  /** How an option reads in the list (with what's typed, to bold its match: `Highlight`); the label, its match bold, by default. */
  renderOption?: (item: T, query: string) => ReactNode;
  /**
   * Making a new item from the text typed, offered last when no option is called just that ("Add “Acme” as a new
   * vendor"); it resolves with the item made, which is then picked, or null when it wasn't.
   */
  create?: { label: (text: string) => string; onCreate: (text: string) => Promise<T | null> };
  /** Offer an empty choice ("Unassigned"). */
  clearLabel?: string;
  /** With nothing picked, the closed input shows the placeholder rather than the empty choice's words. */
  emptyShowsPlaceholder?: boolean;
  /** The picker's words; the labels' `picker` defaults where not given. */
  messages?: Partial<SearchPickerMessages>;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  id?: string;
}

/** One item picked from a searchable list: an ARIA combobox with keyboard support. */
export function SearchPicker<T>({
  value,
  onChange,
  search,
  known = [],
  getId,
  label,
  renderOption,
  create,
  clearLabel,
  emptyShowsPlaceholder,
  messages: own,
  disabled,
  size = 'md',
  id,
  'aria-label': ariaLabel,
}: SearchPickerProps<T>) {
  const listId = useId();
  const labels = useAbpLabels().picker;
  const { locale } = useAbpLocale();
  const messages: SearchPickerMessages = { placeholder: labels.placeholder, searching: labels.searching, noMatches: labels.noMatches, noKnown: labels.noKnown, ...own };
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);
  const settled = useSettled(query, 200);
  const canSearch = search != null;

  useEffect(() => {
    if (!open || !search) return;
    let cancelled = false;
    search(settled.trim())
      .then((list) => {
        if (!cancelled) {
          setFound(list.slice(0, SHOWN));
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // search is recreated each render by callers; the text and openness decide when to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canSearch, settled]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const fallback = known.filter((k) => (seen.has(getId(k)) ? false : (seen.add(getId(k)), true))).filter((k) => !q || label(k).toLowerCase().includes(q));
    const items: T[] = canSearch && !failed ? (found ?? []) : fallback;
    // Made from the text when nothing is called just that.
    const makes = create && q && !items.some((i) => label(i).trim().toLowerCase() === q) ? [CREATE] : [];
    return [...(clearLabel ? [null] : []), ...items, ...makes] as (T | null | typeof CREATE)[];
  }, [query, known, canSearch, failed, found, clearLabel, getId, label, create]);
  const matches = options.filter((o) => o != null && o !== CREATE).length;

  async function choose(item: T | null | typeof CREATE) {
    if (item === CREATE) {
      if (!create || creating) return;
      setCreating(true);
      try {
        const made = await create.onCreate(query.trim());
        if (made) {
          onChange(made);
          setOpen(false);
          setQuery('');
        }
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange(item);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (options[active] !== undefined) void choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <Box position="relative" width="full">
      <Input
        id={id}
        size={size}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={messages.placeholder}
        value={open ? query : value ? label(value) : emptyShowsPlaceholder ? '' : clearLabel ?? ''}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <chakra.ul
          id={listId}
          role="listbox"
          position="absolute"
          zIndex="dropdown"
          insetInlineStart="0"
          insetInlineEnd="0"
          mt="1"
          maxH="64"
          overflowY="auto"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border"
          rounded="l2"
          shadow="md"
          py="1"
          listStyleType="none"
        >
          {query.trim() && matches > 0 && (
            <Text as="li" px="3" pt="1" pb="1.5" textStyle="caption" color="fg.muted" aria-live="polite" data-match-count="">
              {formatMessage(locale, canSearch && !failed && found != null && found.length >= SHOWN ? labels.firstMatches : labels.matches, { count: matches })}
            </Text>
          )}
          {options.length === 0 && (
            <Text as="li" px="3" py="2" textStyle="caption" color="fg.muted">
              {canSearch && !failed ? (found == null ? messages.searching : messages.noMatches) : messages.noKnown}
            </Text>
          )}
          {options.map((item, i) => (
            <chakra.li
              key={item === CREATE ? 'create' : item ? getId(item) : 'none'}
              role="option"
              aria-selected={i === active}
              px="3"
              py="1.5"
              cursor="pointer"
              bg={i === active ? 'bg.muted' : undefined}
              onMouseEnter={() => setActive(i)}
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(item);
              }}
              data-create={item === CREATE ? '' : undefined}
            >
              {item === CREATE ? (
                <Text as="span" display="inline-flex" alignItems="center" gap="1.5" textStyle="body.sm" color="fg.accent" _icon={{ boxSize: '3.5' }}>
                  {creating ? <Spinner size="xs" /> : <Plus />}
                  {create!.label(query.trim())}
                </Text>
              ) : item ? (
                renderOption ? (
                  renderOption(item, query)
                ) : (
                  <Text as="span" textStyle="body.sm">
                    <Highlight text={label(item)} query={query} />
                  </Text>
                )
              ) : (
                <Text as="span" textStyle="body.sm" color="fg.muted">
                  {clearLabel}
                </Text>
              )}
            </chakra.li>
          ))}
          {!canSearch && messages.limitedHint && (
            <Text as="li" px="3" pt="1.5" pb="1" textStyle="caption" color="fg.subtle" borderTopWidth="1px" borderColor="border.muted" mt="1">
              {messages.limitedHint}
            </Text>
          )}
        </chakra.ul>
      )}
    </Box>
  );
}

/** A person to pick: an account's id, username and name, and whether it's an agent's. */
export interface PickerPerson {
  id: string;
  username: string;
  displayName?: string | null;
}

/** A group (a team) to pick. */
export interface PickerGroup {
  id: string;
  name: string;
}

export const personLabel = (p: PickerPerson | null | undefined) => (p ? p.displayName || p.username : '');

/**
 * Picks one person: their name and @username, searched by `search` (the area's call, or the host's); without one, the
 * people already `known` on the page. `badge` marks a person where the host has something to say (an agent's account).
 */
export function PersonPicker<P extends PickerPerson>({
  badge,
  messages,
  ...rest
}: Omit<SearchPickerProps<P>, 'getId' | 'label' | 'renderOption'> & { badge?: (person: P) => ReactNode }) {
  const labels = useAbpLabels().picker;
  return (
    <SearchPicker<P>
      {...rest}
      getId={(p) => p.id}
      label={(p) => personLabel(p)}
      renderOption={(p, typed) => (
        <>
          <Text as="span" textStyle="body.sm" fontWeight="medium">
            <Highlight text={p.displayName || p.username} query={typed} />
          </Text>{' '}
          <Text as="span" textStyle="caption" color="fg.muted" dir="ltr">
            @<Highlight text={p.username} query={typed} />
          </Text>
          {badge?.(p)}
        </>
      )}
      messages={{
        placeholder: rest.search ? labels.searchPeople : labels.choosePerson,
        noMatches: labels.noPeople,
        noKnown: labels.noKnownPeople,
        ...messages,
      }}
    />
  );
}

/** Picks one group, searched by `search` (the area's call, or the host's). */
export function GroupPicker<G extends PickerGroup>({ messages, ...rest }: Omit<SearchPickerProps<G>, 'getId' | 'label'>) {
  const labels = useAbpLabels().picker;
  return (
    <SearchPicker<G>
      known={rest.value ? [rest.value] : []}
      {...rest}
      getId={(g) => g.id}
      label={(g) => g.name}
      messages={{ placeholder: labels.searchGroups, noMatches: labels.noGroups, noKnown: labels.noGroups, ...messages }}
    />
  );
}
