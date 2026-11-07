import type { ReactNode } from 'react';
import { chakra } from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { TextBone } from '../skeleton/bones';
import { priorityLevel } from './priority-level';

export interface PriorityMarkProps {
  /**
   * Where the priority sits among its list, from the top: 0 is the highest. With `of`, the list's length, the mark
   * fills as many of its four bars as the priority is high.
   */
  rank: number;
  of: number;
  /** The priority's name, shown after the bars; without it the bars carry a title only. */
  children?: ReactNode;
  /** The name read out and shown on hover when there's no visible label. */
  title?: string;
  /** The priority is coming (ADR 0061): its name's ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/**
 * A priority as signal bars (higher, more bars, warmer colour) and its name. The name always shows or is read out, so the
 * priority is never told by colour or height alone.
 */
export function PriorityMark({ rank, of, children, title, loading }: PriorityMarkProps) {
  if (useLoading(loading)) return <TextBone width={7} />;
  const { bars, palette } = priorityLevel(rank, of);
  return (
    <chakra.span display="inline-flex" alignItems="center" gap="1.5" colorPalette={palette} title={children == null ? title : undefined}
      role={children == null ? 'img' : undefined} aria-label={children == null ? title : undefined} whiteSpace="nowrap">
      <chakra.svg viewBox="0 0 12 12" w="3" h="3" flexShrink={0} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <chakra.rect key={i} x={i * 3 + 0.5} y={9 - i * 3} width="2" height={3 + i * 3} rx="0.5"
            fill={i < bars ? 'colorPalette.solid' : 'border.emphasized'} />
        ))}
      </chakra.svg>
      {children != null && (
        <chakra.span color={palette === 'blue' || palette === 'gray' ? 'fg.muted' : 'colorPalette.fg'} fontWeight="medium">
          {children}
        </chakra.span>
      )}
    </chakra.span>
  );
}
