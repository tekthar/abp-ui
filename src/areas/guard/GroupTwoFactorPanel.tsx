import { useState } from 'react';
import { Box, chakra, HStack, Stack, Text } from '@chakra-ui/react';
import { errorText, Indicator, InlineAlert, notify, Panel, useAreaRequest } from '@abpjs/ui';
import { useGuardNs } from './texts';
import type { GroupDto } from './types';

export const TWO_FACTOR_MODES = ['off', 'optional', 'required', 'strong'] as const;

/**
 * Whether a group's members are asked for a second factor: off, offered, required, or required strong (a passkey or an
 * authenticator app). A person follows the strictest of all their groups. Changing it is a step-up, and audited.
 */
export function GroupTwoFactorPanel({ group, onSaved }: { group: GroupDto; onSaved: (updated: GroupDto) => void }) {
  const t = useGuardNs('groupDetail.twoFactor');
  const request = useAreaRequest('guard');
  const [mode, setMode] = useState(group.twoFactor ?? 'off');
  const [error, setError] = useState<string | null>(null);

  async function choose(next: string) {
    if (next === mode) return;
    const before = mode;
    setMode(next);
    setError(null);
    try {
      const updated = await request<GroupDto>(`/groups/${group.id}/two-factor`, { method: 'PUT', body: { mode: next } });
      notify.success(t('saved', { name: group.name, mode: t(`modes.${next}`) }));
      onSaved(updated);
    } catch (e) {
      setMode(before);
      setError(errorText(e));
    }
  }

  return (
    <Panel title={t('title')} description={t('hint')} data-testid="group-two-factor">
      <Stack gap="2">
        <InlineAlert tone="danger">{error}</InlineAlert>
        <HStack gap="1" p="1" rounded="l2" bg="bg.subtle" w="fit-content" maxW="full" wrap="wrap" role="radiogroup" aria-label={t('title')}>
          {TWO_FACTOR_MODES.map((choice) => (
            <chakra.button
              key={choice}
              type="button"
              role="radio"
              aria-checked={mode === choice}
              position="relative"
              px="3"
              py="1.5"
              rounded="l1"
              textStyle="body.sm"
              fontWeight="medium"
              color={mode === choice ? 'fg' : 'fg.muted'}
              cursor="pointer"
              focusVisibleRing="inside"
              onClick={() => void choose(choice)}
              data-testid={`two-factor-${choice}`}
            >
              {mode === choice && (
                <Indicator group={`two-factor-${group.id}`} css={{ position: 'absolute', inset: 0, rounded: 'l1', bg: 'bg.panel', boxShadow: 'xs' }} />
              )}
              <Box as="span" position="relative">
                {t(`modes.${choice}`)}
              </Box>
            </chakra.button>
          ))}
        </HStack>
        <Text textStyle="body.sm" color="fg.muted" aria-live="polite">
          {t(`modeHints.${mode}`)}
        </Text>
      </Stack>
    </Panel>
  );
}
