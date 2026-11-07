import { Avatar, chakra } from '@chakra-ui/react';
import { avatarPalette } from './AvatarStack';
import { useLoading } from '../skeleton/loading';
import { Bone, TextBone } from '../skeleton/bones';

export interface PersonChipProps {
  /** The person's id: their colour, the same everywhere. */
  id: string;
  name: string;
  /** The initials only, the name in a title and read out (a board card's corner). */
  compact?: boolean;
  size?: 'xs' | 'sm' | 'md';
  /** The person is coming (ADR 0061): a circle and a line of text's ghosts. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

const SIZES = { xs: '5', sm: '6', md: '8' } as const;

/** A person as their initials in their own colour, and their name beside them unless compact. */
export function PersonChip({ id, name, compact = false, size = 'sm', loading: own }: PersonChipProps) {
  if (useLoading(own)) {
    return (
      <chakra.span display="inline-flex" alignItems="center" gap="2" aria-hidden>
        <Bone circle height={SIZES[size]} />
        {!compact && <TextBone width={12} />}
      </chakra.span>
    );
  }
  const avatar = (
    <Avatar.Root colorPalette={avatarPalette(id)} bg="colorPalette.muted" color="colorPalette.fg" w={SIZES[size]} h={SIZES[size]}
      fontSize={size === 'md' ? 'xs' : '2xs'} fontWeight="semibold" flexShrink={0}
      {...(compact ? { role: 'img', 'aria-label': name, title: name } : { 'aria-hidden': true })}>
      <Avatar.Fallback name={name} />
    </Avatar.Root>
  );
  if (compact) return avatar;
  return (
    <chakra.span display="inline-flex" alignItems="center" gap="2" minW="0" maxW="full">
      {avatar}
      <chakra.span truncate>{name}</chakra.span>
    </chakra.span>
  );
}
