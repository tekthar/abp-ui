import type { ReactNode } from 'react';
import { SegmentGroup } from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { CountBadge } from './CountBadge';

export interface SegmentedItem<V extends string = string> {
  value: V;
  label: ReactNode;
  /** An icon before the label (a lucide icon element). */
  icon?: ReactNode;
  /** A count after the label ("All views 7"). */
  count?: number | null;
  disabled?: boolean;
  /** A tooltip, or the item's name when its label is only an icon. */
  title?: string;
}

export interface SegmentedControlProps<V extends string = string> {
  'aria-label': string;
  items: SegmentedItem<V>[];
  value: V;
  onValueChange: (value: V) => void;
  size?: 'sm' | 'md';
  /** Fills its row, the items sharing the width. */
  fitted?: boolean;
  /** Its value is coming (ADR 0061): drawn without a picked item. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/**
 * One choice of a few, side by side, the picked one raised on a mark that slides to it: a list's layouts (List, Board,
 * Timeline), Basic or RQL, Day / Week / Month, All views or Mine. Arrow keys move between them (a radio group).
 */
export function SegmentedControl<V extends string = string>({
  'aria-label': ariaLabel,
  items,
  value,
  onValueChange,
  size = 'md',
  fitted = false,
  loading: own,
}: SegmentedControlProps<V>) {
  const loading = useLoading(own);
  const h = size === 'sm' ? '7' : '8';
  return (
    <SegmentGroup.Root
      size={size === 'sm' ? 'sm' : 'md'}
      aria-label={ariaLabel}
      value={loading ? null : value}
      onValueChange={(d) => d.value && onValueChange(d.value as V)}
      p="0.5"
      gap="0.5"
      boxShadow="none"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="l3"
      css={{ '--segment-radius': 'radii.l2', '--segment-indicator-shadow': 'shadows.xs' }}
      w={fitted ? 'full' : undefined}
      data-segmented=""
    >
      <SegmentGroup.Indicator />
      {items.map((item) => (
        <SegmentGroup.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          title={item.title}
          h={h}
          px={size === 'sm' ? '2.5' : '3'}
          gap="1.5"
          flex={fitted ? '1' : undefined}
          cursor="pointer"
          color="fg.muted"
          fontWeight="medium"
          textStyle="sm"
          whiteSpace="nowrap"
          _checked={{ color: 'fg' }}
          _hover={{ color: 'fg' }}
          _before={{ display: 'none' }}
          _icon={{ boxSize: '4', flexShrink: 0 }}
        >
          {item.icon}
          <SegmentGroup.ItemText>{item.label}</SegmentGroup.ItemText>
          {item.count != null && <CountBadge value={item.count} tone={item.value === value ? 'accent' : 'neutral'} />}
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
}

