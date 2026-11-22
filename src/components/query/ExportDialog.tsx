import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { chakra, CloseButton, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { useAbpLabels } from '../../provider/labels';
import { useFormatters } from '../../utils/format';
import { formatMessage } from '../../texts/format';
import { useAbpLocale } from '../../provider/locale';
import { Button } from '../Button';
import { CheckboxField, SelectField } from '../Field';
import { SegmentedControl } from '../SegmentedControl';
import type { QueryExportFormat, QueryExportSeparator, QueryField, QueryRow } from '../QueryableList';
import { csvField, exportText } from './exportText';

export interface ExportChoice {
  columns: string[];
  all: boolean;
  separator: QueryExportSeparator;
}

export interface ExportDialogProps {
  /** The format picked from the Export menu; null while the dialog is closed. */
  format: QueryExportFormat | null;
  onClose: () => void;
  fields: QueryField[];
  /** The columns the list shows: picked to start with, first and in their order. */
  shown: string[];
  /** Column headers the list draws in place of the fields' names (a text one names the column here too). */
  columnLabels?: Record<string, ReactNode>;
  /** How many rows the list's query finds. */
  found: number;
  /** Whether the list is narrowed by a query, so "All" means something else than what's found. */
  filtered: boolean;
  /** The first rows on screen, for the preview. */
  sample: QueryRow[];
  onExport: (choice: ExportChoice) => void;
}

const SEPARATORS: Record<QueryExportSeparator, string> = { comma: ',', semicolon: ';', tab: '\t' };

/**
 * The export dialog (UI round 10 step 76, the canvas's Export to CSV and Excel): which rows (what the query finds, or
 * all of them), which columns, a CSV's separator, and the first rows as the file will hold them.
 */
export function ExportDialog({ format, onClose, fields, shown, columnLabels, found, filtered, sample, onExport }: ExportDialogProps) {
  const labels = useAbpLabels();
  const q = labels.queryList;
  const { locale } = useAbpLocale();
  const fmt = useFormatters();
  const ordered = useMemo(() => {
    const byId = new Map(fields.map((f) => [f.id, f]));
    const first = shown.filter((id) => byId.has(id));
    return [...first, ...fields.map((f) => f.id).filter((id) => !first.includes(id))];
  }, [fields, shown]);
  const [picked, setPicked] = useState<Set<string>>(new Set(shown));
  const [all, setAll] = useState(false);
  const [separator, setSeparator] = useState<QueryExportSeparator>('comma');

  // Each opening starts from what the list shows.
  useEffect(() => {
    if (format) {
      setPicked(new Set(shown));
      setAll(false);
    }
  }, [format, shown]);

  const name = (id: string) => {
    const own = columnLabels?.[id];
    return typeof own === 'string' ? own : fields.find((f) => f.id === id)?.label ?? id;
  };
  const columns = ordered.filter((id) => picked.has(id));
  const rows = sample.slice(0, 3);
  const sep = SEPARATORS[separator];
  const csv = [columns.map((id) => csvField(name(id), sep)), ...rows.map((r) => columns.map((id) => csvField(exportText(r.values[id]), sep)))]
    .map((cells) => cells.join(sep === '\t' ? '    ' : sep))
    .join('\n');

  return (
    <Dialog.Root open={format != null} onOpenChange={(e) => !e.open && onClose()} size="lg" placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-export-dialog="">
            <Dialog.Header>
              <Dialog.Title>{format === 'xlsx' ? q.exportTitleExcel ?? 'Export to Excel' : q.exportTitleCsv ?? 'Export to CSV'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="5">
                {filtered && (
                  <Stack gap="1.5">
                    <Text textStyle="label">{q.exportRows ?? 'Rows'}</Text>
                    <SegmentedControl size="sm" aria-label={q.exportRows ?? 'Rows'} value={all ? 'all' : 'found'} onValueChange={(v) => setAll(v === 'all')}
                      items={[
                        { value: 'found', label: formatMessage(locale, q.exportFound ?? 'Filtered ({count})', { count: fmt.number(found) }) },
                        { value: 'all', label: q.exportAll ?? 'All' },
                      ]} />
                  </Stack>
                )}
                <Stack gap="1.5" role="group" aria-labelledby="export-columns">
                  <Text id="export-columns" textStyle="label">{q.exportColumns ?? 'Columns'}</Text>
                  <chakra.div display="grid" gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap="2">
                    {ordered.map((id) => (
                      <CheckboxField key={id} label={name(id)} checked={picked.has(id)}
                        onCheckedChange={(on) => setPicked((p) => {
                          const next = new Set(p);
                          if (on) next.add(id);
                          else next.delete(id);
                          return next;
                        })} />
                    ))}
                  </chakra.div>
                </Stack>
                {format === 'csv' && (
                  <Stack gap="1.5">
                    <chakra.label textStyle="label" htmlFor="export-separator">{q.exportSeparator ?? 'Separator'}</chakra.label>
                    <SelectField id="export-separator" value={separator} onChange={(e) => setSeparator(e.target.value as QueryExportSeparator)} maxW="16rem"
                      options={[
                        { value: 'comma', label: q.exportComma ?? 'Comma ( , )' },
                        { value: 'semicolon', label: q.exportSemicolon ?? 'Semicolon ( ; )' },
                        { value: 'tab', label: q.exportTab ?? 'Tab' },
                      ]} />
                  </Stack>
                )}
                {columns.length > 0 && rows.length > 0 && (
                  <Stack gap="1.5">
                    <Text textStyle="label">{q.exportPreview ?? 'Preview'}</Text>
                    {format === 'csv' ? (
                      <chakra.pre dir="ltr" textAlign="start" m="0" p="3" bg="bg.subtle" borderRadius="l2" textStyle="code" overflowX="auto" whiteSpace="pre" data-export-preview="">
                        {csv}
                      </chakra.pre>
                    ) : (
                      <chakra.div overflowX="auto" bg="bg.subtle" borderRadius="l2" data-export-preview="">
                        <chakra.table textStyle="body.sm" borderCollapse="collapse" w="full">
                          <thead>
                            <tr>
                              {columns.map((id) => (
                                <chakra.th key={id} textAlign="start" fontWeight="bold" px="3" py="1.5" borderBottomWidth="1px" whiteSpace="nowrap">{name(id)}</chakra.th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id}>
                                {columns.map((id) => (
                                  <chakra.td key={id} px="3" py="1.5" whiteSpace="nowrap" maxW="16rem" truncate>{exportText(r.values[id])}</chakra.td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </chakra.table>
                      </chakra.div>
                    )}
                  </Stack>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="cancel">{labels.cancel}</Button>
              </Dialog.ActionTrigger>
              <Button variant="primary" disabled={columns.length === 0} onClick={() => onExport({ columns, all, separator })}>
                {q.exportRun ?? 'Export'}
              </Button>
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
