import type { ReactNode } from 'react';
import { DataList } from '@chakra-ui/react';

export interface PropertyItem {
  label: ReactNode;
  value: ReactNode;
  /** Stable key; defaults to the index. */
  id?: string;
}

export interface PropertyListProps {
  items: PropertyItem[];
  size?: 'sm' | 'md';
}

/** Label / value pairs (account details, directory summary). Stacks on narrow screens. */
export function PropertyList({ items, size = 'md' }: PropertyListProps) {
  return (
    <DataList.Root orientation="horizontal" size={size}>
      {items.map((item, i) => (
        <DataList.Item key={item.id ?? i}>
          <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
          <DataList.ItemValue>{item.value}</DataList.ItemValue>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
