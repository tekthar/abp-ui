import { useEffect, useId, useRef, useState } from 'react';
import { CloseButton, Dialog, HStack, Input, Portal, Stack, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { useAbpLabels } from '../../provider/labels';
import { AddButton, Button, IconButton } from '../Button';
import { SelectField } from '../Field';
import type { QueryConditionJson, QueryField, QuerySuggestion, QuerySuggestions, QueryValueEditor } from '../QueryableList';
import { LIST_OPS, mergeSameField, NO_VALUE_OPS, parseValue, valueText } from '../../rules';

/** One condition while it's being written: its field, operator, and the value typed or picked. */
interface Draft {
  id: number;
  field: string;
  op: string;
  text: string;
  chosen: unknown;
  /** Edited since it was added: an incomplete row says so only then. */
  dirty?: boolean;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

/** The condition a draft stands for, or null while it's incomplete (no value yet). */
function conditionOf(d: Draft, field: QueryField | undefined, own: boolean): QueryConditionJson | null {
  if (!field) return null;
  if (NO_VALUE_OPS.has(d.op)) return { field: field.id, op: d.op };
  if (own) return d.chosen == null || (Array.isArray(d.chosen) && d.chosen.length === 0) ? null : { field: field.id, op: d.op, value: d.chosen };
  if (!d.text.trim()) return null;
  return { field: field.id, op: d.op, value: LIST_OPS.has(d.op) ? d.text.split(',').map((v) => v.trim()).filter(Boolean).map(parseValue) : parseValue(d.text) };
}


/**
 * Building the filters in a dialog (UI round 9, step 57; the canvas's "Build your filters"): every condition as a row (a
 * field, its operator, a value in the field's own editor), added and removed freely, nothing applied until Apply; a row
 * without a value says so and is skipped; the live count says how many records the complete ones match. Conditions on the
 * same field with "is" match any of their values.
 */
export function FilterBuilderDialog({ fields, initial, suggest, renderValueEditor, countMatches, onApply, onClose }: {
  fields: QueryField[];
  initial: QueryConditionJson[];
  suggest?: (rql: string, caret: number) => Promise<QuerySuggestions>;
  renderValueEditor?: QueryValueEditor;
  /** How many records the conditions match (with the list's search), for the live count. */
  countMatches?: (conditions: QueryConditionJson[]) => Promise<number>;
  onApply: (conditions: QueryConditionJson[]) => void;
  onClose: () => void;
}) {
  const labels = useAbpLabels().queryList;
  const [seq, setSeq] = useState(initial.length + 1);
  // An "is any of" on a field opens as one row per value, as it was built.
  const [rows, setRows] = useState<Draft[]>(() => initial.flatMap((c, i) => (c.op === 'in' && Array.isArray(c.value) && fields.find((f) => f.id === c.field)?.operators.includes('eq')
    ? (c.value as unknown[]).map((v, j) => ({ id: i * 100 + j + 1, field: c.field, op: 'eq', text: valueText(v), chosen: v }))
    : [{ id: i * 100 + 1, field: c.field, op: c.op, text: valueText(c.value), chosen: c.value }])));
  const [touched, setTouched] = useState(false);
  const own = (d: Draft) => {
    const f = fields.find((x) => x.id === d.field);
    return Boolean(f && renderValueEditor && !NO_VALUE_OPS.has(d.op) && renderValueEditor({ field: f, op: d.op, value: d.chosen, onChange: () => undefined }) != null);
  };
  const complete = rows.map((d) => conditionOf(d, fields.find((f) => f.id === d.field), own(d))).filter((c): c is QueryConditionJson => c != null);
  const incomplete = rows.length - complete.length;
  const repeats = new Set(rows.map((r) => r.field)).size < rows.length;
  const key = JSON.stringify(complete);

  // The live count, a moment after the conditions settle; the total once, as the dialog opens. The host's counter may be a
  // new function each render, so it's read through a ref.
  const counter = useRef(countMatches);
  useEffect(() => { counter.current = countMatches; });
  const counts = Boolean(countMatches);
  const [count, setCount] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    if (!counts) return;
    let gone = false;
    counter.current?.([]).then((n) => !gone && setTotal(n), () => undefined);
    return () => { gone = true; };
  }, [counts]);
  useEffect(() => {
    if (!counts) return;
    let gone = false;
    const timer = setTimeout(() => {
      counter.current?.(mergeSameField(JSON.parse(key) as QueryConditionJson[], fields)).then((n) => !gone && setCount(n), () => !gone && setCount(null));
    }, 300);
    return () => { gone = true; clearTimeout(timer); };
  }, [key, counts, fields]);

  const add = () => {
    const f = fields[0];
    setRows((r) => [...r, { id: seq, field: f?.id ?? '', op: f?.operators[0] ?? 'eq', text: '', chosen: undefined }]);
    setSeq((n) => n + 1);
  };
  const change = (id: number, patch: Partial<Draft>) => setRows((r) => r.map((d) => (d.id === id ? { ...d, ...patch, dirty: true } : d)));

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()} size="lg" placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-filter-builder="">
            <Dialog.Header>
              <HStack justify="space-between" w="full" gap="3">
                <Dialog.Title>{labels.buildFilters}</Dialog.Title>
                <Button size="xs" variant="ghost" onClick={() => setRows([])} disabled={rows.length === 0}>{labels.clearAll}</Button>
              </HStack>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="3">
                <Text textStyle="sm" color="fg.muted">
                  {labels.matchAll}
                  {repeats && <> {labels.sameFieldAny}</>}
                </Text>
                {rows.length === 0 && <Text textStyle="sm" color="fg.muted" py="2">{labels.noConditions}</Text>}
                {rows.map((d) => (
                  <ConditionRow key={d.id} draft={d} fields={fields} suggest={suggest} renderValueEditor={renderValueEditor}
                    warn={(touched || Boolean(d.dirty)) && !conditionOf(d, fields.find((f) => f.id === d.field), own(d))}
                    onChange={(patch) => change(d.id, patch)} onRemove={() => setRows((r) => r.filter((x) => x.id !== d.id))} />
                ))}
                <HStack>
                  <AddButton onClick={add} disabled={fields.length === 0}>
                    {labels.addCondition}
                  </AddButton>
                </HStack>
                <Stack gap="1" borderTopWidth="1px" borderColor="border.muted" pt="3">
                  <Text textStyle="xs" fontWeight="bold" color="fg.muted">{labels.activeFilters}</Text>
                  <Text textStyle="sm" data-active-filters="">
                    {complete.length === 0 ? labels.noneActive : complete.map((c) => describe(c, fields, labels)).join(' · ')}
                  </Text>
                </Stack>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack justify="space-between" w="full" wrap="wrap" gap="2">
                <Text textStyle="sm" color="fg.muted" aria-live="polite" data-filter-count="">
                  {count != null && fill(total != null ? labels.matchCount : labels.matchCountOnly, { count, total: total ?? '' })}
                  {incomplete > 0 && <> · {labels.incompleteSkipped}</>}
                </Text>
                <HStack gap="2">
                  <Button size="sm" variant="ghost" onClick={onClose}>{labels.cancel}</Button>
                  <Button size="sm" variant="primary" onClick={() => {
                    setTouched(true);
                    onApply(mergeSameField(complete, fields));
                  }}>
                    {labels.applyFilters}
                  </Button>
                </HStack>
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

type Labels = ReturnType<typeof useAbpLabels>['queryList'];

/** A condition in words: "Status is Draft". */
function describe(c: QueryConditionJson, fields: QueryField[], labels: Labels): string {
  const field = fields.find((f) => f.id === c.field);
  const op = (field?.kind === 'number' ? labels.numberOperators[c.op] : undefined) ?? labels.operators[c.op] ?? c.op;
  return `${field?.label ?? c.field} ${op}${NO_VALUE_OPS.has(c.op) ? '' : ` ${valueText(c.value)}`}`;
}

/** One condition's controls: field, operator, value (the field's own editor, else a box with suggestions), remove. */
function ConditionRow({ draft, fields, suggest, renderValueEditor, warn, onChange, onRemove }: {
  draft: Draft;
  fields: QueryField[];
  suggest?: (rql: string, caret: number) => Promise<QuerySuggestions>;
  renderValueEditor?: QueryValueEditor;
  warn: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const labels = useAbpLabels().queryList;
  const listId = useId();
  const field = fields.find((f) => f.id === draft.field);
  const { op, text } = draft;
  const [options, setOptions] = useState<QuerySuggestion[]>([]);
  const own = field && renderValueEditor && !NO_VALUE_OPS.has(op)
    ? renderValueEditor({ field, op, value: draft.chosen, onChange: (v) => onChange({ chosen: v }) }) : null;

  // Values come from the same autocomplete the RQL box uses, as if typing "field = …".
  useEffect(() => {
    if (!suggest || !field || NO_VALUE_OPS.has(op) || own != null) return;
    const typed = LIST_OPS.has(op) ? (text.split(',').pop() ?? '').trim() : text;
    const prefix = `"${field.id}" = `;
    let cancelled = false;
    const timer = setTimeout(() => {
      suggest(prefix + typed, prefix.length + typed.length).then((s) => !cancelled && setOptions(s.items)).catch(() => !cancelled && setOptions([]));
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [suggest, field, op, text, own]);

  return (
    <Stack gap="1" data-condition="">
      <HStack gap="1.5" wrap="wrap" align="start">
        <SelectField width="auto" size="sm" aria-label={labels.field} value={draft.field}
          onChange={(e) => {
            const next = fields.find((f) => f.id === e.target.value);
            onChange({ field: e.target.value, op: next?.operators[0] ?? 'eq', text: '', chosen: undefined });
          }}
          options={fields.map((f) => ({ value: f.id, label: f.label }))} />
        <SelectField width="auto" size="sm" aria-label={labels.operator} value={op} onChange={(e) => onChange({ op: e.target.value })}
          options={(field?.operators ?? []).map((o) => ({ value: o, label: (field?.kind === 'number' ? labels.numberOperators[o] : undefined) ?? labels.operators[o] ?? o }))} />
        {own}
        {!NO_VALUE_OPS.has(op) && own == null && (
          <>
            <Input size="sm" flex="1" minW="10rem" aria-label={labels.value} placeholder={LIST_OPS.has(op) ? labels.valuesHint : labels.value}
              list={listId} value={text} aria-invalid={warn} onChange={(e) => onChange({ text: e.target.value })} />
            <datalist id={listId}>
              {options.filter((o) => o.kind !== 'keyword').map((o) => (
                <option key={o.text} value={o.text.replace(/^"|"$/g, '')}>{o.label}</option>
              ))}
            </datalist>
          </>
        )}
        <IconButton size="sm" variant="ghost" remove aria-label={fill(labels.removeFilter, { field: field?.label ?? draft.field })} onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </HStack>
      {warn && <Text textStyle="xs" color="fg.error">{labels.incomplete}</Text>}
    </Stack>
  );
}
