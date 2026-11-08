import type { ReactNode } from 'react';
import { Avatar, Box, HStack, Popover, Portal, Stack, Text } from '@chakra-ui/react';
import { Check } from 'lucide-react';
import { Bone } from '../skeleton/bones';
import { useLoading } from '../skeleton/loading';
import { Tooltip } from './Tooltip';

export interface AvatarPerson {
  id: string;
  name: string;
  /** Their picture (ADR 0096), a path on the site; their initials when there's none or it fails. */
  picture?: string | null;
  /** A line under the name, in the tooltip and the list: "4 records". */
  detail?: ReactNode;
}

export interface AvatarStackProps {
  'aria-label': string;
  people: AvatarPerson[];
  /** How many avatars show before the "+N" circle (5). */
  max?: number;
  /** The "+N" button's name for screen readers: "Show 3 more people". */
  moreLabel: (count: number) => string;
  /** The heading of the list the "+N" button opens. */
  moreTitle: ReactNode;
  /** Its people are coming (ADR 0061): a few placeholder circles. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** Who is picked (ringed). With `onToggle`, every person is a button that picks or unpicks them, as a filter. */
  selected?: readonly string[];
  onToggle?: (id: string) => void;
}

const PALETTES = ['blue', 'teal', 'purple', 'orange', 'pink', 'cyan', 'green', 'red'] as const;

/** A person's colour: the same on every page and every visit, from their id. */
export function avatarPalette(id: string): (typeof PALETTES)[number] {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function PersonAvatar({ person, overlap, selected, inButton }: { person: AvatarPerson; overlap?: boolean; selected?: boolean; inButton?: boolean }) {
  return (
    <Avatar.Root colorPalette={avatarPalette(person.id)} bg="colorPalette.muted" color="colorPalette.fg" w="8" h="8" textStyle="caption"
      borderWidth="2px" borderColor="bg" ms={overlap ? '-2' : undefined} flexShrink={0} outline={selected ? '2px solid' : undefined}
      outlineColor="accent.solid" {...(inButton ? { 'aria-hidden': true } : { role: 'img', 'aria-label': person.name })}>
      <Avatar.Fallback name={person.name} aria-hidden />
      {person.picture && <Avatar.Image src={person.picture} alt="" />}
    </Avatar.Root>
  );
}

/**
 * People as overlapping avatars (their initials, each in their own colour), the first `max` shown and the rest behind a
 * "+N" circle that opens a list of them. Names show on hover and are read out by screen readers. With `onToggle` each
 * person is a toggle (pressed when picked), for filtering by people: the list stays open so several can be picked.
 */
export function AvatarStack({ 'aria-label': ariaLabel, people, max = 5, moreLabel, moreTitle, loading: own, selected = [], onToggle }: AvatarStackProps) {
  const placeholders = useLoading(own) && people.length === 0;
  if (placeholders) {
    return (
      <HStack gap="0" aria-hidden>
        {[0, 1, 2].map((i) => <Bone key={i} circle height="8" ms={i > 0 ? '-2' : undefined} borderWidth="2px" borderColor="bg" />)}
      </HStack>
    );
  }
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.slice(max);
  const picked = (p: AvatarPerson) => selected.includes(p.id);
  const restPicked = rest.some(picked);
  return (
    <HStack gap="0" role="group" aria-label={ariaLabel}>
      {shown.map((p, i) => (
        <Tooltip key={p.id} content={p.detail ? <>{p.name} · {p.detail}</> : p.name}>
          {onToggle ? (
            // Picked avatars sit above their neighbours so the whole ring shows.
            <Box as="button" display="inline-flex" rounded="full" ms={i > 0 ? '-2' : undefined} position="relative" zIndex={picked(p) ? 1 : undefined}
              cursor="pointer" _hover={{ zIndex: 2 }} focusVisibleRing="outside" aria-pressed={picked(p)} aria-label={p.name} onClick={() => onToggle(p.id)}>
              <PersonAvatar person={p} selected={picked(p)} inButton />
            </Box>
          ) : (
            <Box display="inline-flex">
              <PersonAvatar person={p} overlap={i > 0} />
            </Box>
          )}
        </Tooltip>
      ))}
      {rest.length > 0 && (
        <Popover.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
          <Popover.Trigger asChild>
            <Box as="button" display="inline-flex" alignItems="center" justifyContent="center" w="8" h="8" ms="-2" flexShrink={0} rounded="full"
              bg="bg.muted" color="fg.muted" borderWidth="2px" borderColor="bg" textStyle="caption" fontWeight="medium" cursor="pointer"
              outline={restPicked ? '2px solid' : undefined} outlineColor="accent.solid" position="relative" zIndex={restPicked ? 1 : undefined}
              _hover={{ bg: 'bg.emphasized', color: 'fg' }} focusVisibleRing="outside" aria-label={moreLabel(rest.length)}>
              +{rest.length}
            </Box>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="64" maxW="calc(100vw - 32px)">
                <Popover.Body>
                  <Stack gap="3">
                    <Popover.Title textStyle="label">{moreTitle}</Popover.Title>
                    <Stack as="ul" gap={onToggle ? '0.5' : '2'} maxH="64" overflowY="auto" listStyleType="none" mx={onToggle ? '-2' : undefined}>
                      {rest.map((p) => {
                        const row = (
                          <>
                            <PersonAvatar person={p} selected={onToggle && picked(p)} inButton={!!onToggle} />
                            <Stack gap="0" minW="0" flex="1" textAlign="start">
                              <Text textStyle="body" truncate>{p.name}</Text>
                              {p.detail && <Text textStyle="caption" color="fg.muted">{p.detail}</Text>}
                            </Stack>
                            {onToggle && picked(p) && <Box as="span" color="accent.fg" flexShrink={0} aria-hidden><Check size={16} /></Box>}
                          </>
                        );
                        return (
                          <li key={p.id}>
                            {onToggle ? (
                              <HStack as="button" w="full" gap="2" minW="0" px="2" py="1" rounded="l2" cursor="pointer" _hover={{ bg: 'bg.muted' }}
                                focusVisibleRing="inside" aria-pressed={picked(p)} onClick={() => onToggle(p.id)}>
                                {row}
                              </HStack>
                            ) : (
                              <HStack gap="2" minW="0">{row}</HStack>
                            )}
                          </li>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </HStack>
  );
}
