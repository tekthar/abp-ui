import { Flex, Text } from '@chakra-ui/react';
import type { ListState } from '../lists/useListState';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';
import { formatMessage } from '../texts/format';
import { useFormatters } from '../utils/format';
import { Pagination } from './Pagination';
import type { PaginationForm } from './pageList';

/**
 * A paged list's foot (`useListState`): which rows of how many show ("26–50 of 112") and the way to the others, in the
 * labels' `queryList` words. `form` is `Pagination`'s, `simple` when left out (the range, then previous and next,
 * centred); `numbered` puts the pages at the start and the range at the end. Nothing until the first page comes, or
 * when the list is empty.
 */
export function ListFooter<T>({ list, form = 'simple' }: { list: ListState<T>; form?: PaginationForm }) {
  const labels = useAbpLabels().queryList;
  const { locale } = useAbpLocale();
  const fmt = useFormatters();
  const { page, pageSize } = list.query;
  if (list.rows === undefined || list.total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, list.total);
  const range = formatMessage(locale, labels.range, { from: fmt.number(from), to: fmt.number(to), total: fmt.number(list.total) });
  return (
    <Flex gap="3" align="center" justify={form === 'simple' ? 'center' : 'space-between'} wrap="wrap" data-testid="list-footer">
      <Pagination
        {...list.pagination}
        disabled={list.refreshing}
        label={labels.pages}
        previous={labels.previous}
        next={labels.next}
        pageLabel={(n) => formatMessage(locale, labels.page, { page: fmt.number(n) })}
        form={form}
        range={range}
        pageOf={formatMessage(locale, labels.pageOf, { page: fmt.number(list.pagination.page), pages: fmt.number(list.pagination.pages) })}
      />
      {form !== 'simple' && (
        <Text textStyle="caption" color="fg.muted" fontVariantNumeric="tabular-nums" aria-live="polite">
          {range}
        </Text>
      )}
    </Flex>
  );
}
