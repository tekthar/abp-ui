import { Box } from '@chakra-ui/react';
import { AppLink, InlineAlert, useFormatters } from '@abpjs/ui';
import { useGuardTexts } from './texts';

/** What AbpGuard says of a person's strong factor (`me.strongFactor`): whether they have one, and by when they must. */
export interface StrongFactorState {
  has: boolean;
  requiredBy?: string | null;
  overdue?: boolean;
}

/**
 * A site admin the operator requires a strong factor of, who has none yet: by when to set up a passkey or an
 * authenticator app, at the top of every page until they have. After the date, signing in asks them to set one up
 * before going on; until then it's this, never in the way of their work. Draws nothing otherwise.
 */
export function StrongFactorBanner({ strongFactor, setUpHref }: { strongFactor?: StrongFactorState | null; setUpHref: string }) {
  const t = useGuardTexts();
  const fmt = useFormatters();
  if (!strongFactor || strongFactor.has || !strongFactor.requiredBy) return null;
  return (
    <Box mb="section" data-testid="strong-factor-banner">
      <InlineAlert tone={strongFactor.overdue ? 'danger' : 'warning'} title={t('secondFactor.required.title')}>
        {t(strongFactor.overdue ? 'secondFactor.required.overdue' : 'secondFactor.required.by', { date: fmt.dateTime(strongFactor.requiredBy) })}{' '}
        <AppLink href={setUpHref}>{t('secondFactor.required.setUp')}</AppLink>
      </InlineAlert>
    </Box>
  );
}
