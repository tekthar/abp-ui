import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { chakra, Dialog, HStack, Portal, Spinner, Stack, Text } from '@chakra-ui/react';
import { CornerDownLeft, Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  /** Beside the label, quieter (a record's status, a view's project). */
  detail?: ReactNode;
  /** Before the label. */
  icon?: ReactNode;
  onSelect: () => void;
}

export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The results for what's typed (and for nothing typed: what to start from), grouped; a group with no items isn't shown. */
  search: (text: string) => Promise<CommandGroup[]> | CommandGroup[];
  labels: {
    /** The box's name and placeholder. */
    placeholder: string;
    searching: string;
    noResults: string;
    /** The active row's hint: "Open". */
    open: string;
    /** Under the results: how to move, open and close. */
    hint: string;
  };
}

/** A label with the typed part in bold, every match, ignoring case. */
export function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(q); i >= 0; i = lower.indexOf(q, at)) {
    if (i > at) parts.push(text.slice(at, i));
    parts.push(<chakra.strong key={i} fontWeight="bold">{text.slice(i, i + q.length)}</chakra.strong>);
    at = i + q.length;
  }
  if (parts.length === 0) return <>{text}</>;
  parts.push(text.slice(at));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

/**
 * Searching everything from anywhere (the canvas's v12 command search, UI round 9 step 70): a box over the dimmed page,
 * the results grouped, the matched part in bold, the active row on the selected tint with an Enter hint. Up and down
 * move, Enter opens, Esc closes. What's searched and what opening does are the host's.
 */
export function CommandPalette({ open, onOpenChange, search, labels }: CommandPaletteProps) {
  const listId = useId();
  const [text, setText] = useState('');
  const [groups, setGroups] = useState<CommandGroup[] | null>(null);
  const [active, setActive] = useState(0);
  const latest = useRef(search);
  useEffect(() => {
    latest.current = search;
  });

  // Asked again a moment after the typing stops; an answer that comes after a newer question is dropped.
  useEffect(() => {
    if (!open) return;
    let gone = false;
    const timer = setTimeout(() => {
      Promise.resolve(latest.current(text)).then((g) => {
        if (gone) return;
        setGroups(g.filter((x) => x.items.length > 0));
        setActive(0);
      }, () => !gone && setGroups([]));
    }, text ? 150 : 0);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [text, open]);

  const items = useMemo(() => (groups ?? []).flatMap((g) => g.items), [groups]);
  const close = () => {
    onOpenChange(false);
    setText('');
    setGroups(null);
  };
  const choose = (item: CommandItem | undefined) => {
    if (!item) return;
    close();
    item.onSelect();
  };
  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    }
  }
  // The active row stays in view as the arrows move it.
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  let n = -1;
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && close()} placement="top" size="lg" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mt="16" data-command-palette="">
            <HStack gap="2.5" px="4" borderBottomWidth="1px" borderColor="border.muted" color="fg.muted" _icon={{ boxSize: '4.5', flexShrink: 0 }}>
              <Search aria-hidden />
              <chakra.input autoFocus flex="1" h="12" bg="transparent" outline="none" textStyle="md" color="fg"
                role="combobox" aria-expanded aria-controls={listId} aria-label={labels.placeholder} placeholder={labels.placeholder}
                aria-activedescendant={items.length > 0 ? `${listId}-${active}` : undefined}
                value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} />
              {groups == null && <Spinner size="sm" />}
            </HStack>
            <Dialog.Body p="2" maxH="min(60vh, 32rem)">
              <Stack gap="2" role="listbox" id={listId} aria-label={labels.placeholder}>
                {groups != null && items.length === 0 && (
                  <Text px="3" py="6" textAlign="center" color="fg.muted" textStyle="sm">{text ? labels.noResults : labels.searching}</Text>
                )}
                {(groups ?? []).map((g) => (
                  <Stack key={g.id} gap="0.5" role="group" aria-label={g.label}>
                    <Text px="3" pt="1" pb="0.5" textStyle="xs" fontWeight="bold" color="fg.muted">{g.label}</Text>
                    {g.items.map((item) => {
                      n += 1;
                      const i = n;
                      const on = i === active;
                      return (
                        <HStack key={item.id} id={`${listId}-${i}`} role="option" aria-selected={on} gap="2.5" px="3" h="10" borderRadius="l2"
                          cursor="pointer" bg={on ? 'bg.selected' : undefined} color={on ? 'fg.accent' : 'fg'} _icon={{ boxSize: '4', flexShrink: 0 }}
                          onMouseMove={() => active !== i && setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}>
                          {item.icon}
                          <Text as="span" textStyle="sm" truncate minW="0" dir="auto"><HighlightText text={item.label} query={text} /></Text>
                          {item.detail != null && <Text as="span" textStyle="xs" color="fg.muted" truncate flexShrink={1} minW="0">{item.detail}</Text>}
                          {on && (
                            <HStack as="span" gap="1" ms="auto" flexShrink={0} textStyle="xs" color="fg.muted" _icon={{ boxSize: '3.5' }} aria-hidden>
                              {labels.open}
                              <CornerDownLeft />
                            </HStack>
                          )}
                        </HStack>
                      );
                    })}
                  </Stack>
                ))}
              </Stack>
            </Dialog.Body>
            <Text px="4" py="2" borderTopWidth="1px" borderColor="border.muted" textStyle="xs" color="fg.muted">{labels.hint}</Text>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
