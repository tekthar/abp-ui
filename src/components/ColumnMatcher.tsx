'use client';

import { useId, type ReactNode } from 'react';
import { Box, chakra, HStack, Input, Stack, Table, Text } from '@chakra-ui/react';
import { useAbpLocale } from '../provider/locale';
import { formatMessage } from '../texts/format';
import { columnCounts, columnProblems, guessType, type ColumnField, type ColumnTarget, type ValueKind } from '../files/columns';
import { SelectField } from './Field';

export interface ColumnMatcherLabels {
  /** The table's name. */
  title: string;
  column: string;
  samples: string;
  target: string;
  /** "Field for {column}". */
  targetFor: string;
  newField: string;
  skip: string;
  newName: string;
  newType: string;
  /** Under the table: "{total} columns: {created} new, {matched} matched, {skipped} skipped" (ICU plurals). */
  summary: string;
  /** A field picked for two columns: "{field} is picked twice". */
  twice: string;
  /** A new field without a name. */
  unnamed: string;
  /** Two new fields with one name: "Two new fields are called {name}". */
  sameName: string;
}

const DEFAULT_LABELS: ColumnMatcherLabels = {
  title: 'Match columns',
  column: 'Column in your file',
  samples: 'First values',
  target: 'Goes to',
  targetFor: 'Field for {column}',
  newField: 'New field…',
  skip: 'Don’t import',
  newName: 'New field’s name',
  newType: 'New field’s type',
  summary: '{total, plural, one {# column} other {# columns}}: {created} new, {matched} matched, {skipped} skipped',
  twice: '{field} is picked for more than one column',
  unnamed: 'Name the new field',
  sameName: 'Two new fields are called {name}',
};

export interface ColumnMatcherProps {
  /** The file's header row. */
  headers: string[];
  /** Its first rows, as `readTable` gives them; two or three values of each column are shown. */
  samples: string[][];
  /** The fields there already (an existing table's, or a record's own); absent, every column is new or skipped. */
  fields?: ColumnField[];
  /** Whether a column may become a new field (default: when there are no fields). */
  allowNew?: boolean;
  /** The types a new field can have, in the host's words. */
  types: { value: string; label: string }[];
  /** The host's type for a kind of value (`guessType`), for a column turned into a new field; the first type when absent or unknown. */
  typeOf?: (kind: ValueKind) => string;
  /** Each column's target, in the headers' order (`guessTargets` makes a first guess). */
  value: ColumnTarget[];
  onChange: (value: ColumnTarget[]) => void;
  /** The host's own controls for a column, at the end of its row ("key", "sensitive"). */
  renderExtra?: (index: number, target: ColumnTarget) => ReactNode;
  /** The extra column's heading, when `renderExtra` is given. */
  extraHeader?: ReactNode;
  disabled?: boolean;
  labels?: Partial<ColumnMatcherLabels>;
}

/**
 * Matching a file's columns to fields before an import: one row per column with its header and first values, then
 * where it goes (a field there already, a new field named in place with its type, or nowhere), then the host's own
 * controls; a line under it counts them and says what must be fixed (a field picked twice, a new field without a name,
 * two new fields with one name). Controlled: the host keeps the targets and refuses an import with problems.
 */
export function ColumnMatcher({ headers, samples, fields, allowNew, types, typeOf, value, onChange, renderExtra, extraHeader, disabled, labels: given }: ColumnMatcherProps) {
  const labels = { ...DEFAULT_LABELS, ...given };
  const { locale } = useAbpLocale();
  const titleId = useId();
  const canNew = allowNew ?? !(fields && fields.length > 0);
  const counts = columnCounts(value);
  const problems = columnProblems(value);
  const named = (name: string) => fields?.find((f) => f.name === name)?.label ?? name;
  const set = (i: number, target: ColumnTarget) => onChange(value.map((t, j) => (j === i ? target : t)));
  const options = [
    ...(fields ?? []).map((f) => ({ value: `field:${f.name}`, label: f.label ?? f.name })),
    ...(canNew ? [{ value: 'new', label: labels.newField }] : []),
    { value: 'skip', label: labels.skip },
  ];
  const lines = [
    ...problems.twice.map((f) => formatMessage(locale, labels.twice, { field: named(f) })),
    ...(problems.unnamed.length ? [labels.unnamed] : []),
    ...problems.sameName.map((n) => formatMessage(locale, labels.sameName, { name: n })),
  ];

  return (
    <Stack gap="2" minW="0">
      <Text id={titleId} textStyle="label">{labels.title}</Text>
      <Box overflowX="auto" borderWidth="1px" borderColor="border" borderRadius="l2">
        <Table.Root size="sm" aria-labelledby={titleId}>
          <Table.Header>
            <Table.Row bg="bg.muted">
              <Table.ColumnHeader>{labels.column}</Table.ColumnHeader>
              <Table.ColumnHeader>{labels.samples}</Table.ColumnHeader>
              <Table.ColumnHeader>{labels.target}</Table.ColumnHeader>
              {renderExtra && <Table.ColumnHeader>{extraHeader}</Table.ColumnHeader>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {headers.map((header, i) => {
              const target = value[i] ?? { kind: 'skip' };
              const picked = target.kind === 'field' ? `field:${target.name}` : target.kind;
              const shown = samples.map((row) => row[i] ?? '').filter((v) => v.trim() !== '').slice(0, 3);
              return (
                <Table.Row key={i} opacity={target.kind === 'skip' ? 0.7 : undefined}>
                  <Table.Cell fontWeight="semibold" maxW="48" truncate title={header}>{header}</Table.Cell>
                  <Table.Cell color="fg.muted" maxW="56">
                    <Stack gap="0">
                      {shown.map((v, k) => <Text key={k} as="span" textStyle="caption" truncate title={v}>{v}</Text>)}
                    </Stack>
                  </Table.Cell>
                  <Table.Cell minW="56">
                    <Stack gap="1.5">
                      <SelectField size="sm" aria-label={formatMessage(locale, labels.targetFor, { column: header })} value={picked} disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          const guessed = typeOf?.(guessType(samples.map((row) => row[i] ?? '')));
                          const type = guessed && types.some((x) => x.value === guessed) ? guessed : types[0]?.value ?? 'text';
                          set(i, v === 'skip' ? { kind: 'skip' } : v === 'new' ? { kind: 'new', name: header.trim(), type } : { kind: 'field', name: v.slice(6) });
                        }}
                        options={options} />
                      {target.kind === 'new' && (
                        <HStack gap="1.5" align="stretch">
                          <Input size="sm" aria-label={labels.newName} value={target.name} disabled={disabled} aria-invalid={!target.name.trim() || undefined}
                            onChange={(e) => set(i, { ...target, name: e.target.value })} />
                          <SelectField size="sm" aria-label={labels.newType} value={target.type} disabled={disabled} maxW="10rem"
                            onChange={(e) => set(i, { ...target, type: e.target.value })} options={types} />
                        </HStack>
                      )}
                    </Stack>
                  </Table.Cell>
                  {renderExtra && <Table.Cell>{renderExtra(i, target)}</Table.Cell>}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
      <Text textStyle="caption" color="fg.muted" aria-live="polite">
        {formatMessage(locale, labels.summary, { total: counts.total, created: counts.created, matched: counts.matched, skipped: counts.skipped })}
      </Text>
      {lines.length > 0 && (
        <chakra.ul ps="4" listStyleType="disc" color="fg.error" textStyle="caption" role="alert">
          {lines.map((l) => <li key={l}>{l}</li>)}
        </chakra.ul>
      )}
    </Stack>
  );
}

export { type ColumnField, type ColumnTarget } from '../files/columns';
