import { Flex, Text } from '@chakra-ui/react';
import { formatMessage, Pagination, useAbpLabels, useAbpLocale, useFormatters, type ListState } from '@abpjs/ui';

/** A paged list's foot: its pages, and which rows of how many show, in the foundation's words. */
export function ListFooter<T>({ list }: { list: ListState<T> }) {
  const labels = useAbpLabels().queryList;
  const { locale } = useAbpLocale();
  const fmt = useFormatters();
  const { page, pageSize } = list.query;
  const from = list.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, list.total);
  if (list.rows === undefined || list.total === 0) return null;
  return (
    <Flex gap="3" align="center" justify="space-between" wrap="wrap">
      <Pagination
        {...list.pagination}
        disabled={list.refreshing}
        label={labels.pages}
        previous={labels.previous}
        next={labels.next}
        pageLabel={(n) => formatMessage(locale, labels.page, { page: fmt.number(n) })}
      />
      <Text textStyle="caption" color="fg.muted" fontVariantNumeric="tabular-nums" aria-live="polite">
        {formatMessage(locale, labels.range, { from: fmt.number(from), to: fmt.number(to), total: fmt.number(list.total) })}
      </Text>
    </Flex>
  );
}
