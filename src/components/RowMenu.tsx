import { Fragment, type ReactNode } from 'react';
import { Menu, Portal, Text } from '@chakra-ui/react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from './Button';

/** One thing a row's ⋯ menu can do. */
export interface RowMenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  /** Red text and icon: delete, and other acts that can't be taken back. */
  danger?: boolean;
  /** Shown but not chosen: the person may not do it here (say why in a `note`). */
  disabled?: boolean;
}

/** An entry of a row's menu: an item, a line between groups, or a quiet note (why some items are off). */
export type RowMenuEntry = RowMenuItem | { separator: true } | { note: ReactNode };

export interface RowMenuProps {
  /** The trigger's name, with the row in it ("More for Finance"). */
  label: string;
  items: RowMenuEntry[];
  size?: 'xs' | 'sm';
}

const isSeparator = (e: RowMenuEntry): e is { separator: true } => 'separator' in e;
const isNote = (e: RowMenuEntry): e is { note: ReactNode } => 'note' in e;

/**
 * A row's ⋯ menu (the design canvas's row menu): Open, Star, Edit, then Archive and a red Delete apart. Items the
 * person may not use stay listed, turned off, with a note saying who can.
 */
export function RowMenu({ label, items, size = 'sm' }: RowMenuProps) {
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
      <Menu.Trigger asChild>
        <IconButton aria-label={label} size={size} variant="ghost" color="fg.muted" data-row-menu="">
          <MoreHorizontal />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="48" maxW="18rem" css={{ '& [role=menuitem] svg': { width: '4', height: '4', flexShrink: 0 } }}>
            {items.map((e, i) =>
              isSeparator(e) ? (
                <Menu.Separator key={`sep-${i}`} />
              ) : isNote(e) ? (
                <Fragment key={`note-${i}`}>
                  <Menu.Separator />
                  <Text px="2" py="1.5" textStyle="caption" color="fg.muted">{e.note}</Text>
                </Fragment>
              ) : (
                <Menu.Item
                  key={e.id}
                  value={e.id}
                  disabled={e.disabled}
                  onSelect={() => e.onSelect?.()}
                  color={e.danger ? 'fg.error' : undefined}
                  _highlighted={e.danger ? { bg: 'bg.error', color: 'fg.error' } : undefined}
                >
                  {e.icon}
                  {e.label}
                </Menu.Item>
              ),
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
