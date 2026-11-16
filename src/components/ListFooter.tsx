import { Flex, Text } from '@chakra-ui/react';
import type { ListState } from '../lists/useListState';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';
import { formatMessage } from '../texts/format';
import { useFormatters } from '../utils/format';
import { Pagination } from './Pagination';

/**
 * A paged list's foot (`useListState`): its pages, and which rows of how many show ("26–50 of 112"), in the labels'
 * `queryList` words. Nothing until the first page comes, or when the list is empty.
 */
export function ListFooter<T>({ list }: { list: ListState<T> }) {
  const labels = useAbpLabels().queryList;
  const { locale } = useAbpLocale();
  const fmt = useFormatters();
  const { page, pageSize } = list.query;
  if (list.rows === undefined || list.total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, list.total);
  return (
    <Flex gap="3" align="center" justify="space-between" wrap="wrap" data-testid="list-footer">
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
