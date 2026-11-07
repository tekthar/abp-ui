import { useMemo } from 'react';
import { chakra, HStack, Popover, Portal, Stack, Switch, Text } from '@chakra-ui/react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns3, GripVertical } from 'lucide-react';
import { useTodaLabels } from '../../provider/labels';
import { Button } from '../Button';

export interface ColumnsPopoverField {
  id: string;
  label: string;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
}

/**
 * The list's columns, in a popover: the shown ones in their order, each with a switch and a handle to drag it (or move
 * it with the keyboard: space to lift, arrows, space to drop), then the fields not shown, each a switch away. One column
 * always stays.
 */
export function ColumnsPopover({ fields, columns, onChange }: { fields: ColumnsPopoverField[]; columns: string[]; onChange: (next: string[]) => void }) {
  const labels = useTodaLabels().queryList;
  const byId = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const shown = columns.filter((c) => byId.has(c));
  const hidden = fields.filter((f) => !columns.includes(f.id));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = columns.indexOf(String(e.active.id));
    const to = columns.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(columns, from, to));
  }

  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
      <Popover.Trigger asChild>
        <Button size="sm" variant="secondary" disabled={fields.length === 0}>
          <Columns3 />
          {labels.columns}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="80" maxW="calc(100vw - 2rem)">
            <Popover.Body p="0">
              <HStack justify="space-between" px="3.5" pt="3" pb="1">
                <Text textStyle="sm" fontWeight="semibold">{labels.visibleColumns}</Text>
                <Button size="xs" variant="ghost" disabled={hidden.length === 0} onClick={() => onChange([...columns, ...hidden.map((f) => f.id)])}>
                  {labels.showAllColumns}
                </Button>
              </HStack>
              <Text textStyle="caption" color="fg.muted" px="3.5" pb="2">{labels.columnsHint}</Text>
              <chakra.div maxH="80" overflowY="auto" pb="2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={shown} strategy={verticalListSortingStrategy}>
                    <Stack gap="0" role="list" aria-label={labels.visibleColumns}>
                      {shown.map((id) => (
                        <ColumnRow key={id} id={id} label={byId.get(id)!.label} checked disabled={shown.length === 1}
                          onCheckedChange={() => onChange(columns.filter((c) => c !== id))} />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
                {hidden.length > 0 && (
                  <Stack gap="0" borderTopWidth="1px" borderColor="border.muted" mt="1" pt="1" role="list" aria-label={labels.hiddenColumns}>
                    {hidden.map((f) => (
                      <ColumnRow key={f.id} id={f.id} label={f.label} checked={false} onCheckedChange={() => onChange([...columns, f.id])} />
                    ))}
                  </Stack>
                )}
              </chakra.div>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function ColumnRow({ id, label, checked, disabled, onCheckedChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onCheckedChange: () => void }) {
  const labels = useTodaLabels().queryList;
  const sortable = useSortable({ id, disabled: !checked });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  return (
    <HStack ref={setNodeRef} role="listitem" gap="2" px="2" py="1.5" mx="1.5" borderRadius="l2" bg={isDragging ? 'bg.muted' : undefined}
      position="relative" zIndex={isDragging ? 1 : undefined} boxShadow={isDragging ? 'md' : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }} _hover={{ bg: 'bg.subtle' }}>
      {checked ? (
        <chakra.button type="button" display="inline-flex" color="fg.subtle" cursor="grab" borderRadius="l1" focusVisibleRing="outside"
          _hover={{ color: 'fg' }} aria-label={fill(labels.dragColumn, { field: label })} {...attributes} {...listeners}>
          <GripVertical size={16} />
        </chakra.button>
      ) : (
        <chakra.span w="4" flexShrink={0} />
      )}
      <Text as="span" flex="1" textStyle="sm" truncate color={checked ? 'fg' : 'fg.muted'}>{label}</Text>
      <Switch.Root size="sm" colorPalette="accent" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label}>
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  );
}
