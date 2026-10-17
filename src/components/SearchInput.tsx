import { forwardRef } from 'react';
import { Input, InputGroup, type InputProps } from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { useLoading } from '../skeleton/loading';
import { ghostCss } from '../skeleton/bones';

export interface SearchInputProps extends Omit<InputProps, 'size' | 'width' | 'maxW'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Maximum width as a size token ("xs", "md") or CSS length. Defaults to full width. */
  maxW?: InputProps['maxW'];
}

/** A text input with a leading search icon, for filtering lists. Give it an aria-label. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { size = 'md', maxW, ...rest },
  ref,
) {
  const skeleton = useLoading();
  return (
    <InputGroup
      startElement={<Search />}
      startOffset="-0.25rem"
      startElementProps={{ color: 'fg.subtle', _icon: { boxSize: '4' } }}
      maxW={maxW}
      borderRadius="l2"
      aria-hidden={skeleton || undefined}
      css={skeleton ? ghostCss : undefined}
    >
      <Input ref={ref} type="search" size={size} {...rest} />
    </InputGroup>
  );
});
