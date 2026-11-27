import { useCallback, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button, CheckboxField, errorText, notify, Panel, useAreaRequest, useConfirm, type RegisterSlotSave } from '@abpjs/ui';
import { useAgentTexts } from './texts';
import { num, type AgentChatsDeleted } from './types';

/** Says what deleting all of someone's chats did: how many went, and how many wait for their run's step to end. */
function useTellDeleted(): (done: AgentChatsDeleted) => void {
  const t = useAgentTexts();
  return useCallback((done: AgentChatsDeleted) => {
    notify.success(t('chats.deletedAll', { count: num(done.deleted) }));
    if (num(done.stillGoing) > 0) notify.info(t('chats.stillGoing', { count: num(done.stillGoing) }));
  }, [t]);
}

/**
 * Asks, then deletes every chat of the person's own (AbpAgent's `DELETE chats`): their messages and replies go for good;
 * their runs keep who, when and what changed. Resolves true when it deleted.
 */
export function useDeleteAllChats(): () => Promise<boolean> {
  const t = useAgentTexts();
  const confirm = useConfirm();
  const request = useAreaRequest('agent');
  const tell = useTellDeleted();
  return async () => {
    if (!(await confirm({ title: t('chats.deleteAllTitle'), description: t('chats.deleteAllBody'), confirmLabel: t('chats.deleteAll'), danger: true }))) return false;
    try {
      tell(await request<AgentChatsDeleted>('/chats', { method: 'DELETE' }));
      return true;
    } catch (e) {
      notify.error(errorText(e));
      return false;
    }
  };
}

/** A person's chats with agents on their own account's privacy page: deleting them all at once, as they may at any time. */
export function MyAgentChatsPanel() {
  const t = useAgentTexts();
  const deleteAll = useDeleteAllChats();
  const [busy, setBusy] = useState(false);
  return (
    <Panel title={t('chats.mineTitle')} description={t('chats.mineHint')} data-testid="agent-chats-mine">
      <Box>
        <Button size="sm" danger loading={busy} onClick={async () => { setBusy(true); try { await deleteAll(); } finally { setBusy(false); } }}
          data-testid="agent-chats-delete-all">{t('chats.deleteAll')}</Button>
      </Box>
    </Panel>
  );
}

/**
 * On someone's account, for a site admin (an account they're deactivating or deleting without erasing it): deletes
 * every chat of theirs with agents, after asking (AbpAgent's `DELETE people/{id}/chats`, audited). Erasing a person
 * takes their chats anyway.
 */
export function PersonAgentChatsAction({ accountId, name }: { accountId: string; name?: string }) {
  const t = useAgentTexts();
  const confirm = useConfirm();
  const request = useAreaRequest('agent');
  const tell = useTellDeleted();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!(await confirm({
      title: t('chats.deleteTheirsTitle', { name: name ?? '' }), description: t('chats.deleteTheirsBody'), confirmLabel: t('chats.deleteTheirs'), danger: true,
    }))) return;
    setBusy(true);
    try {
      tell(await request<AgentChatsDeleted>(`/people/${encodeURIComponent(accountId)}/chats`, { method: 'DELETE' }));
    } catch (e) {
      notify.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return <Button danger loading={busy} onClick={() => void run()} data-testid="agent-chats-delete-theirs">{t('chats.deleteTheirs')}</Button>;
}

/**
 * In a dialog that deactivates or deletes an account (the slots `guard.account.deactivate.options` and
 * `guard.account.delete.options`): "Also delete their chats with agents". Ticked, it joins the dialog's save, which runs
 * it only after the account was deactivated or deleted; a failure shows in the dialog.
 */
export function ForgetChatsOption({ accountId, register }: { accountId: string; register: RegisterSlotSave }) {
  const t = useAgentTexts();
  const request = useAreaRequest('agent');
  const tell = useTellDeleted();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!checked) return undefined;
    return register(async () => {
      tell(await request<AgentChatsDeleted>(`/people/${encodeURIComponent(accountId)}/chats`, { method: 'DELETE' }));
    });
  }, [checked, accountId, register, request, tell]);
  return <CheckboxField label={t('chats.alsoDeleteTheirs')} checked={checked} onCheckedChange={setChecked} data-testid="agent-chats-also-delete" />;
}
