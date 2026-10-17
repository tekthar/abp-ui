import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box, chakra, HStack, Stack, Text } from '@chakra-ui/react';
import { Check, File as FileIcon, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { UploadState } from '../files/upload-plan';
import { PresenceItem, PresenceList } from '../motion/components';
import { useMotionSetting } from '../motion/setting';
import { curves } from '../motion/tokens';
import { IconButton } from './Button';

export interface UploadRow {
  id: string;
  name: string;
  state: UploadState;
  /** How much of it is sent, 0 to 1. */
  fraction: number;
  /** Under the name: its size, where it goes, what will happen (a new version), or why it failed. */
  detail?: ReactNode;
  /** The row's end: "Waiting", "42 %", "Too big", ... */
  status?: ReactNode;
  /** A small picture of it (an image's own); a file's icon otherwise. */
  preview?: string;
}

export interface UploadListProps {
  rows: UploadRow[];
  /** One line over the rows ("3 of 5 uploaded"); with `fraction`, the whole queue's bar under it. */
  summary?: ReactNode;
  fraction?: number;
  /** Said to screen readers when it changes ("2 of 5 uploaded"). */
  announce?: string;
  labels: { cancel: (name: string) => string; retry: (name: string) => string; dismiss: (name: string) => string };
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

const OUT = `cubic-bezier(${curves.out.join(', ')})`;

/**
 * Files on their way (ADR 0011, amended): each a row that arrives at once with a picture of it, its name, a bar that
 * fills as it's sent and what's happening; a finished one ticks (then the host lets it go), a failed one says why and
 * can be tried again. Keep it on the page while uploads can happen, so the first row arrives too.
 */
export function UploadList({ rows, summary, fraction, announce, labels, onCancel, onRetry, onDismiss }: UploadListProps) {
  return (
    <Stack gap="2" data-testid="upload-list">
      <chakra.span srOnly aria-live="polite">
        {announce}
      </chakra.span>
      {rows.length > 0 && summary != null && (
        <Stack gap="1">
          <Text textStyle="caption" color="fg.muted">
            {summary}
          </Text>
          {fraction != null && <Bar fraction={fraction} tone="accent" label={typeof summary === 'string' ? summary : undefined} />}
        </Stack>
      )}
      <Stack gap="1.5" position="relative">
        <PresenceList>
          {rows.map((row) => (
            <PresenceItem key={row.id}>
              <Row row={row} labels={labels} onCancel={onCancel} onRetry={onRetry} onDismiss={onDismiss} />
            </PresenceItem>
          ))}
        </PresenceList>
      </Stack>
    </Stack>
  );
}

function Row({ row, labels, onCancel, onRetry, onDismiss }: { row: UploadRow } & Pick<UploadListProps, 'labels' | 'onCancel' | 'onRetry' | 'onDismiss'>) {
  const going = row.state === 'waiting' || row.state === 'sending';
  const trouble = row.state === 'failed' || row.state === 'refused';
  return (
    <HStack gap="3" px="3" py="2" rounded="l2" bg="bg.subtle" borderWidth="1px" borderColor={trouble ? 'border.error' : 'border.muted'} data-upload={row.name} data-state={row.state}>
      <Preview src={row.preview} />
      <Stack gap="1" flex="1" minW="0">
        <HStack gap="2" justify="space-between">
          <Text as="span" fontWeight="medium" truncate>
            <bdi>{row.name}</bdi>
          </Text>
          <Text as="span" textStyle="caption" color={trouble ? 'fg.error' : 'fg.muted'} flexShrink={0} fontVariantNumeric="tabular-nums">
            {row.state === 'done' ? <Done /> : row.status}
          </Text>
        </HStack>
        {(going || row.state === 'done') && <Bar fraction={row.state === 'done' ? 1 : row.fraction} tone={row.state === 'done' ? 'success' : 'accent'} label={row.name} quiet={row.state === 'waiting'} />}
        {row.detail != null && (
          <Text as="span" textStyle="caption" color={trouble ? 'fg.error' : 'fg.muted'} truncate>
            {trouble && (
              <Box as="span" display="inline-flex" verticalAlign="-0.15em" me="1" _icon={{ boxSize: '3.5' }}>
                <TriangleAlert />
              </Box>
            )}
            {row.detail}
          </Text>
        )}
      </Stack>
      {going && (
        <IconButton size="xs" variant="ghost" aria-label={labels.cancel(row.name)} onClick={() => onCancel(row.id)}>
          <X />
        </IconButton>
      )}
      {row.state === 'failed' && (
        <IconButton size="xs" variant="ghost" aria-label={labels.retry(row.name)} onClick={() => onRetry(row.id)}>
          <RotateCcw />
        </IconButton>
      )}
      {trouble && (
        <IconButton size="xs" variant="ghost" aria-label={labels.dismiss(row.name)} onClick={() => onDismiss(row.id)}>
          <X />
        </IconButton>
      )}
    </HStack>
  );
}

/** An image's own picture, cropped square; a file's icon otherwise. */
function Preview({ src }: { src?: string }) {
  return (
    <Box boxSize="8" flexShrink={0} rounded="l1" overflow="hidden" bg="bg.muted" color="fg.subtle" display="grid" placeItems="center" _icon={{ boxSize: '4' }}>
      {src ? <chakra.img src={src} alt="" boxSize="full" objectFit="cover" /> : <FileIcon />}
    </Box>
  );
}

/**
 * How much is sent: a thin bar that fills from the start side. It moves by `transform` (no layout), straight on, since
 * progress is steady; it doesn't move at all with less motion, only changes.
 */
function Bar({ fraction, tone, label, quiet }: { fraction: number; tone: 'accent' | 'success'; label?: string; quiet?: boolean }) {
  const { reduce } = useMotionSetting();
  const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <Box h="1" rounded="full" bg="bg.emphasized" overflow="hidden" opacity={quiet ? 0.6 : 1} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <Box
        h="full"
        rounded="full"
        bg={tone === 'success' ? 'fg.success' : 'colorPalette.solid'}
        colorPalette="accent"
        transformOrigin="0 50%"
        _rtl={{ transformOrigin: '100% 50%' }}
        style={{ transform: `scaleX(${percent / 100})`, transition: reduce ? 'none' : 'transform 160ms linear, background-color 200ms ease' }}
      />
    </Box>
  );
}

/** The tick a finished file gets: it pops in once (not with less motion). */
function Done() {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduce } = useMotionSetting();
  useLayoutEffect(() => {
    if (reduce) return;
    ref.current?.animate?.(
      [
        { transform: 'scale(0.5)', opacity: 0 },
        { transform: 'scale(1.15)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 260, easing: OUT },
    );
    // once, when it appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <chakra.span ref={ref} display="inline-grid" placeItems="center" boxSize="4" rounded="full" bg="fg.success" color="bg" _icon={{ boxSize: '3' }}>
      <Check strokeWidth={3} />
    </chakra.span>
  );
}
