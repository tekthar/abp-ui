import type { ReactNode } from 'react';
import { chakra, DataList } from '@chakra-ui/react';
import { useArriving, useLoading } from '../skeleton/loading';
import { arriveCss, boneWidth, TextBone } from '../skeleton/bones';

export interface PropertyItem {
  label: ReactNode;
  /** Its value; while the list loads, one not given yet is drawn as text that's coming. */
  value?: ReactNode;
  /** Stable key; defaults to the index. */
  id?: string;
  /** How many characters wide its value's placeholder is. */
  skeletonWidth?: number;
}

export interface PropertyListProps {
  items: PropertyItem[];
  size?: 'sm' | 'md';
  /** Its values are coming (ADR 0061). The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/** Label / value pairs (account details, directory summary). Stacks on narrow screens. */
export function PropertyList({ items, size = 'md', loading: own }: PropertyListProps) {
  const loading = useLoading(own);
  const arriving = useArriving(loading);
  return (
    <DataList.Root orientation="horizontal" size={size}>
      {items.map((item, i) => (
        <DataList.Item key={item.id ?? i}>
          <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
          <DataList.ItemValue>
            {loading && item.value == null ? (
              <TextBone width={item.skeletonWidth ?? boneWidth(i, 8, 16)} />
            ) : arriving ? (
              <chakra.span css={arriveCss}>{item.value}</chakra.span>
            ) : (
              item.value
            )}
          </DataList.ItemValue>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
