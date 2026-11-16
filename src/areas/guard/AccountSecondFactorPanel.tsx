import { HStack, Text } from '@chakra-ui/react';
import { Button, EMPTY_VALUE, InlineAlert, notify, Panel, PropertyList, StatusPill, useApiAction, useApiQuery, useAreaRequest, useConfirm } from '@abpjs/ui';
import { useGuardNs } from './texts';
import { num, type MySecondFactorsDto } from './types';

export interface AccountSecondFactorPanelProps {
  accountId: string;
  name: string;
  /** Whether the person looking may reset them; never on their own account. */
  canReset: boolean;
}

/**
 * A person's two-factor sign-in as an admin sees it: what their groups ask, what they set up, the recovery codes left,
 * and a reset for someone who lost their phone and their codes. Resetting is a strong step-up, and audited.
 */
export function AccountSecondFactorPanel({ accountId, name, canReset }: AccountSecondFactorPanelProps) {
  const t = useGuardNs('accountDetail.secondFactor');
  const tf = useGuardNs('groupDetail.twoFactor');
  const ts = useGuardNs('secondFactor');
  const confirm = useConfirm();
  const request = useAreaRequest('guard');
  const state = useApiQuery<MySecondFactorsDto>('guard', `/accounts/${accountId}/second-factors`);
  const action = useApiAction();
  const data = state.data;
  const factors = data?.factors ?? [];

  async function reset() {
    if (!(await confirm({ title: t('resetTitle', { name }), description: t('resetHint'), confirmLabel: t('reset'), danger: true }))) return;
    const ok = await action.run(async () => {
      await request(`/accounts/${accountId}/second-factors`, { method: 'DELETE' });
      return true;
    });
    if (ok) {
      notify.success(t('resetDone'));
      await state.reload();
    }
  }

  return (
    <Panel
      title={t('title')}
      actions={
        canReset &&
        factors.length > 0 && (
          <Button size="sm" danger onClick={() => void reset()} loading={action.busy} data-testid="reset-second-factor">
            {t('reset')}
          </Button>
        )
      }
      data-testid="account-second-factor"
    >
      <InlineAlert tone="danger">{state.error ?? action.error}</InlineAlert>
      {data?.disabled && <InlineAlert tone="neutral">{ts('disabled')}</InlineAlert>}
      <PropertyList
        items={[
          {
            label: t('mode'),
            value: data && (
              <HStack gap="2">
                <Text as="span">{tf(`modes.${data.mode}`)}</Text>
                {data.asked ? <StatusPill tone="success">{t('asked')}</StatusPill> : <StatusPill>{t('notAsked')}</StatusPill>}
              </HStack>
            ),
          },
          { label: t('factors'), value: data && (factors.length ? factors.map((f) => ts(`kinds.${f.kind}`)).join(', ') : t('none')) },
          { label: t('recoveryLeft'), value: data && (factors.length ? String(num(data.recoveryCodesLeft)) : EMPTY_VALUE) },
        ]}
      />
    </Panel>
  );
}
