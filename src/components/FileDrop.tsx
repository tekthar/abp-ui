import { forwardRef, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box, HStack, Portal, Text, type BoxProps } from '@chakra-ui/react';
import { ArrowDownToLine } from 'lucide-react';
import { Presence } from '../motion/components';
import { useMotionSetting } from '../motion/setting';
import { curves } from '../motion/tokens';

const OUT = `cubic-bezier(${curves.out.join(', ')})`;

export interface FileDropAreaProps extends BoxProps {
  /** Files are being dragged over the page: the area wakes and says what a drop does. */
  awake?: boolean;
  /** They're over the area itself: let go here. */
  over?: boolean;
  /** What a drop does, shown over the area while it's awake ("Drop to attach to PAY-41"). */
  hint?: ReactNode;
}

/**
 * Where files can be dropped (ADR 0011, amended). At rest it's the dashed box around its children (an Upload button);
 * while files are dragged over the page it wakes (the accent, and over its children what a drop does); with them over
 * it, it lifts a little and its arrow bobs. Its size never changes, so nothing around it moves.
 */
export const FileDropArea = forwardRef<HTMLDivElement, FileDropAreaProps>(function FileDropArea({ awake = false, over = false, hint, children, ...rest }, ref) {
  const { reduce } = useMotionSetting();
  const lit = awake || over;
  return (
    <Box
      ref={ref}
      position="relative"
      p="3"
      rounded="l2"
      borderWidth="1px"
      borderStyle={over ? 'solid' : 'dashed'}
      borderColor={lit ? 'border.accent' : 'border.emphasized'}
      data-drop-area={over ? 'over' : awake ? 'awake' : undefined}
      style={{
        transform: over && !reduce ? 'scale(1.01)' : undefined,
        boxShadow: over ? '0 0 0 4px var(--toda-colors-accent-muted)' : undefined,
        transition: reduce ? 'none' : `transform 160ms ${OUT}, box-shadow 160ms ${OUT}, border-color 160ms ease`,
      }}
      {...rest}
    >
      {children}
      <Presence show={lit} from="fade" position="absolute" inset="0" rounded="l2" zIndex="1" pointerEvents="none">
        <HStack
          h="full"
          justify="center"
          gap="2"
          px="3"
          rounded="l2"
          bg={over ? 'accent.subtle' : 'bg.accent'}
          color="fg.accent"
          fontWeight="medium"
          textAlign="center"
          style={{ transition: 'background-color 160ms ease' }}
        >
          <Bob active={over && !reduce} />
          <Text as="span" truncate>
            {hint}
          </Text>
        </HStack>
      </Presence>
    </Box>
  );
});

/** The arrow over the area: it bobs while files are over it, saying "let go". */
function Bob({ active }: { active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!active) return;
    const animation = ref.current?.animate?.([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], {
      duration: 900,
      easing: `cubic-bezier(${curves.inOut.join(', ')})`,
      iterations: Infinity,
    });
    return () => animation?.cancel();
  }, [active]);
  return (
    <Box as="span" ref={ref} display="inline-flex" flexShrink={0} _icon={{ boxSize: '4' }}>
      <ArrowDownToLine />
    </Box>
  );
}

export interface DropHintProps {
  /** Files are over the page, and not over a drop area that says it itself. */
  show: boolean;
  children: ReactNode;
}

/**
 * A pill at the bottom of the window while files are dragged over the page: a drop anywhere works, and it says where
 * the files will go. It never catches the pointer, so the drop lands on the page beneath it.
 */
export function DropHint({ show, children }: DropHintProps) {
  return (
    <Portal>
      <Box position="fixed" insetInline="0" bottom="6" display="flex" justifyContent="center" pointerEvents="none" zIndex="toast" px="4">
        <Presence show={show} from="rise">
          <HStack gap="2" px="4" py="2" rounded="full" bg="bg.inverted" color="fg.inverted" shadow="lg" textStyle="body.sm" fontWeight="medium" maxW="lg" data-testid="drop-hint" _icon={{ boxSize: '4' }}>
            <ArrowDownToLine />
            <Text as="span" truncate>
              {children}
            </Text>
          </HStack>
        </Presence>
      </Box>
    </Portal>
  );
}
