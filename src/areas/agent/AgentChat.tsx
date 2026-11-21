import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, chakra, CloseButton, Drawer, HStack, Portal, Stack, Text, Textarea } from '@chakra-ui/react';
import { ArrowLeft, Bot, Check, ChevronDown, ChevronRight, Send, Square, Trash2 } from 'lucide-react';
import {
  Button, DirectionalIcon, EmptyState, Field, HostSlot, IconButton, InlineAlert, notify, SelectField, StatusPill, useApiAction, useApiQuery, useAreaEvents,
  useAreaRequest, useConfirm, useFormatters, useNames,
} from '@abpjs/ui';
import { AgentQuestionCard, AgentText } from './AgentRuns';
import { ItemHrefProvider, ItemLink, type ItemHref } from './links';
import { useNameOf } from './names';
import { useAgentTexts } from './texts';
import { GOING, itemPath, RUN_TONES, type AgentChatInfo, type AgentChatPlace, type AgentChatSummary, type AgentRunInfo, type AgentTarget, type AskableAgent } from './types';

/** What the chat opens on: a chat by its id, a new one about an item or in a scope (with an agent and words to start), or the list. */
export type AgentChatOpen = { chat?: string; item?: AgentTarget; scope?: string; agent?: string; prompt?: string };

type View = { kind: 'list' } | { kind: 'new'; target: AgentChatOpen } | { kind: 'chat'; id: string; opened?: boolean };

interface ChatState {
  open: boolean;
  view: View;
  show: (target?: AgentChatOpen) => void;
  setView: (view: View) => void;
  close: () => void;
  onItemChanged?: (item: AgentTarget) => void;
}

const ChatContext = createContext<ChatState | null>(null);

/**
 * Where the chat lives in a host's shell: wrap the shell once, place `<AgentChatPanel />` inside it, and open it from
 * anywhere with `useAgentChat().open(…)`. `onItemChanged` hears when a chat's run about an item ended or a reply was
 * posted on it, so the host can show the item afresh.
 */
export function AgentChatProvider({ children, onItemChanged }: { children: ReactNode; onItemChanged?: (item: AgentTarget) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: 'list' });
  const show = useCallback((target: AgentChatOpen = {}) => {
    setView(target.chat ? { kind: 'chat', id: target.chat, opened: true } : target.item || target.scope || target.agent || target.prompt ? { kind: 'new', target } : { kind: 'list' });
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, view, show, setView, close, onItemChanged }), [open, view, show, close, onItemChanged]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** Opens the chat beside the page: on the list, on a chat, or on a new chat about an item or in a scope. */
export function useAgentChat(): { open: (target?: AgentChatOpen) => void; close: () => void; isOpen: boolean } {
  const state = useContext(ChatContext);
  if (!state) throw new Error('useAgentChat needs AgentChatProvider around it.');
  return { open: state.show, close: state.close, isOpen: state.open };
}

/** How often an open chat asks how its run is going when it can't follow the run's events. */
const EVERY_MS = 2000;

/** Streams in a row that end with nothing in them before an open chat asks every EVERY_MS instead. */
const EMPTY_STREAMS = 3;

/** A step of the going run, as its events say: the tool, its target, and how it went (null while it runs). */
type LiveStep = { step: number; tool: string; target: string | null; outcome: string | null };

/** The going run as its events show it: each model turn's text so far, and its steps. */
type Live = { run: string | null; texts: Record<number, string>; steps: LiveStep[] };

const NO_LIVE: Live = { run: null, texts: {}, steps: [] };

/**
 * Follows the chat's events while a run goes: the reply a block at a time, and each step as it starts and ends. A
 * question or the run's end loads the chat afresh; a stream that ends while the run still goes is opened again after
 * the last event it gave. Where the host reads no events, or they can't be read, the chat is asked every EVERY_MS.
 */
function useLiveRun(chatId: string, going: boolean, reload: () => Promise<void>): Live {
  const events = useAreaEvents('agent');
  const [live, setLive] = useState<Live>(NO_LIVE);
  useEffect(() => {
    if (!going) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;
    let last: string | null = null;
    if (!events) {
      timer = setInterval(() => void reload(), EVERY_MS);
      return () => clearInterval(timer);
    }
    void (async () => {
      setLive(NO_LIVE); // a new run: nothing shown of it yet
      // A stream that gives nothing (a run stuck as going, a proxy that closes it at once) waits longer before the next;
      // after EMPTY_STREAMS in a row the chat is asked every EVERY_MS instead.
      let empty = 0;
      while (!abort.signal.aborted) {
        const heard = { any: false };
        try {
          last = await events(`/chats/${chatId}/events`, (name, data) => {
            if (name !== 'ping') heard.any = true;
            const run = typeof data.run === 'string' ? data.run : null;
            const turn = typeof data.turn === 'number' ? data.turn : 0;
            switch (name) {
              case 'turn':
                // A turn begun again (its server stopped) starts its text afresh.
                setLive((l) => ({ ...l, run, texts: { ...l.texts, [turn]: '' } }));
                break;
              case 'text':
                setLive((l) => ({ ...l, run, texts: { ...l.texts, [turn]: (l.texts[turn] ?? '') + String(data.text ?? '') } }));
                break;
              case 'step': {
                const step: LiveStep = { step: Number(data.step), tool: String(data.tool ?? ''), target: (data.target as string | null) ?? null, outcome: (data.outcome as string | null) ?? null };
                setLive((l) => ({ ...l, run, steps: [...l.steps.filter((x) => x.step !== step.step), step].sort((a, b) => a.step - b.step) }));
                break;
              }
              case 'question':
              case 'run':
                void reload();
                break;
            }
          }, { lastEventId: last, signal: abort.signal });
        } catch {
          if (abort.signal.aborted) return;
          timer = setInterval(() => void reload(), EVERY_MS);
          return;
        }
        await reload();
        empty = heard.any ? 0 : empty + 1;
        if (empty >= EMPTY_STREAMS) {
          if (!abort.signal.aborted) timer = setInterval(() => void reload(), EVERY_MS);
          return;
        }
        await new Promise((r) => setTimeout(r, heard.any ? 300 : 1000 * 2 ** empty));
      }
    })();
    return () => {
      abort.abort();
      if (timer) clearInterval(timer);
    };
  }, [chatId, going, reload, events]);
  return going ? live : NO_LIVE;
}

/** The top bar's way into the chat: shown when the person may chat with an agent somewhere. */
export function AgentChatButton() {
  const t = useAgentTexts();
  const { open } = useAgentChat();
  const places = useApiQuery<AgentChatPlace[]>('agent', '/chats/places');
  if (!places.data?.length) return null;
  return (
    <IconButton aria-label={t('chat.open')} size="sm" onClick={() => open()} data-testid="agent-chat-open">
      <Bot size={18} />
    </IconButton>
  );
}

/**
 * "Ask an agent" in an item's header: the chat beside the page, on a new chat about it, with the agents its scope took
 * on, for whoever reads it. Nothing shows when there's no agent to ask.
 */
export function AskAgentButton({ kind, itemKey }: { kind: string; itemKey: string }) {
  const t = useAgentTexts();
  const { open } = useAgentChat();
  const agents = useApiQuery<AskableAgent[]>('agent', `${itemPath(kind, itemKey)}/agents`);
  if (!agents.data?.length) return null;
  return (
    <Button size="sm" variant="ghost" onClick={() => open({ item: { kind, key: itemKey } })} data-testid="ask-agent">
      <Bot />
      {t('runs.ask')}
    </Button>
  );
}

/**
 * The chat with an agent, beside whatever page is open: the person's chats, a new one (in a scope, or about the item it
 * was opened on), and one chat with its messages and replies. It leaves the page usable behind it.
 */
export function AgentChatPanel({ itemHref }: { itemHref?: ItemHref }) {
  const t = useAgentTexts();
  const state = useContext(ChatContext);
  if (!state) throw new Error('AgentChatPanel needs AgentChatProvider around it.');
  const { open, view, setView, close } = state;
  if (!open) return null;

  return (
    <ItemHrefProvider value={itemHref}>
      <Drawer.Root open placement="end" size="md" modal={false} closeOnInteractOutside={false} trapFocus={false} preventScroll={false}
        onOpenChange={(e) => !e.open && close()}>
        <Portal>
          {/* The page keeps its scrollbar (preventScroll off), so the positioner spans the page (100%), not the window
              (100vw): 100vw reaches under the scrollbar and pushed the panel past the screen's edge by its width. */}
          <Drawer.Positioner pointerEvents="none" width="100%">
            <Drawer.Content pointerEvents="auto" borderStartWidth="1px" borderColor="border.muted" data-testid="agent-chat">
              {view.kind === 'list' ? (
                <ChatList onOpen={(id) => setView({ kind: 'chat', id })} onNew={() => setView({ kind: 'new', target: {} })} />
              ) : view.kind === 'new' ? (
                <NewChat target={view.target} onBack={() => setView({ kind: 'list' })} onStarted={(id) => setView({ kind: 'chat', id })} />
              ) : (
                <ChatView key={view.id} id={view.id} onBack={() => setView({ kind: 'list' })} onMissing={view.opened ? () => setView({ kind: 'list' }) : undefined} />
              )}
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={t('chat.close')} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </ItemHrefProvider>
  );
}

/** Where a chat is: about an item, or in a scope, by the name the host gives it. */
function Where({ chat }: { chat: AgentChatSummary }) {
  const t = useAgentTexts();
  const names = useNames('scopes', chat.itemKey ? [] : [chat.scopeId]);
  if (chat.itemKey) return <>{t('chat.about', { key: chat.itemKey })}</>;
  return <>{t('chat.in', { place: names[chat.scopeId] ?? chat.scopeKey ?? '' })}</>;
}

/** The person's chats, newest first, and a new one. */
function ChatList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const chats = useApiQuery<AgentChatSummary[]>('agent', '/chats');

  return (
    <>
      <Drawer.Header pe="12">
        <Stack gap="0.5">
          <Drawer.Title>{t('chat.title')}</Drawer.Title>
          <Text textStyle="caption" color="fg.muted">{t('chat.private')}</Text>
        </Stack>
      </Drawer.Header>
      <Drawer.Body px="0">
        <Box px="5" pb="3">
          <Button size="sm" variant="primary" onClick={onNew} data-testid="agent-chat-new">{t('chat.new')}</Button>
        </Box>
        {chats.error && <Box px="5"><InlineAlert tone="danger">{chats.error}</InlineAlert></Box>}
        {chats.data?.length === 0 && <EmptyState size="sm" art="agent" title={t('chat.none')} description={t('chat.noneHint')} />}
        <Stack gap="0" as="ul" listStyleType="none" aria-label={t('chat.chats')}>
          {chats.data?.map((c) => (
            <Box as="li" key={c.id} borderTopWidth="1px" borderColor="border.muted">
              <chakra.button type="button" w="full" textAlign="start" px="5" py="2.5" _hover={{ bg: 'bg.muted' }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'border.accent', outlineOffset: '-2px' }} onClick={() => onOpen(c.id)} data-testid="agent-chat-row">
                <HStack gap="2" justify="space-between" align="start">
                  <Text textStyle="sm" fontWeight="medium" truncate dir="auto">{c.title}</Text>
                  {c.going && <StatusPill tone="info">{t('chat.going')}</StatusPill>}
                </HStack>
                <Text textStyle="caption" color="fg.muted" truncate>
                  {c.agent?.displayName ?? c.agentKey} · <Where chat={c} /> · {fmt.dateTime(c.lastAt)}
                </Text>
              </chakra.button>
            </Box>
          ))}
        </Stack>
      </Drawer.Body>
    </>
  );
}

/** A new chat: about the item it was opened on (with the agents its scope took on), or in a scope the person picks; the agent; and the first message. */
function NewChat({ target, onBack, onStarted }: { target: AgentChatOpen; onBack: () => void; onStarted: (id: string) => void }) {
  const t = useAgentTexts();
  const nameOf = useNameOf();
  const request = useAreaRequest('agent');
  const action = useApiAction();
  const item = target.item ?? null;
  const places = useApiQuery<AgentChatPlace[]>('agent', item ? null : '/chats/places');
  const askable = useApiQuery<AskableAgent[]>('agent', item ? `${itemPath(item.kind, item.key)}/agents` : null);
  const scopeNames = useNames('scopes', (places.data ?? []).map((p) => p.scope.id));
  const [place, setPlace] = useState(target.scope ?? '');
  const [agentId, setAgentId] = useState('');
  const [prompt, setPrompt] = useState(target.prompt ?? '');
  const placeKey = places.data?.some((p) => p.scope.key === place) ? place : places.data?.[0]?.scope.key;
  const agents = item ? askable.data : places.data?.find((p) => p.scope.key === placeKey)?.agents;
  const chosen = agents?.find((a) => a.id === agentId)?.id ?? agents?.find((a) => a.id === target.agent || a.key === target.agent)?.id ?? agents?.[0]?.id;
  const agentName = (a: AskableAgent) => [nameOf(a.names, a.account.displayName || a.key), nameOf(a.titles, '')].filter(Boolean).join(' · ');
  const loaded = item ? askable.data !== undefined || askable.error : places.data !== undefined || places.error;

  async function start() {
    if (!chosen || !prompt.trim()) return;
    const chat = await action.run(() => request<AgentChatInfo>('/chats', { method: 'POST', body: { agentId: chosen, prompt, ...(item ? { kind: item.kind, key: item.key } : { scope: placeKey }) } }));
    if (chat) onStarted(chat.chat.id);
  }

  return (
    <>
      <Drawer.Header pe="12">
        <HStack gap="1.5" align="start">
          <BackButton onBack={onBack} />
          <Stack gap="0.5">
            <Drawer.Title>{item ? t('chat.newAbout', { key: item.key }) : t('chat.new')}</Drawer.Title>
            <Text textStyle="caption" color="fg.muted">{t('chat.private')}</Text>
          </Stack>
        </HStack>
      </Drawer.Header>
      <Drawer.Body>
        <Stack gap="4">
          {loaded && !agents?.length ? (
            <EmptyState size="sm" title={item ? t('chat.noAgentsHere', { key: item.key }) : t('chat.noPlaces')} />
          ) : (
            <>
              {!item && places.data && places.data.length > 1 && (
                <Field label={t('chat.place')}>
                  <SelectField value={placeKey ?? ''} onChange={(e) => { setPlace(e.target.value); setAgentId(''); }} data-testid="agent-chat-place"
                    options={places.data.map((p) => ({ value: p.scope.key, label: scopeNames[p.scope.id] ? `${scopeNames[p.scope.id]} (${p.scope.key})` : p.scope.key }))} />
                </Field>
              )}
              {agents && agents.length > 0 && (
                <Field label={t('chat.agent')}>
                  <SelectField value={chosen ?? ''} onChange={(e) => setAgentId(e.target.value)} data-testid="agent-chat-agent" options={agents.map((a) => ({ value: a.id, label: agentName(a) }))} />
                </Field>
              )}
            </>
          )}
          {action.error && <InlineAlert tone="danger">{action.error}</InlineAlert>}
        </Stack>
      </Drawer.Body>
      {agents && agents.length > 0 && (
        <Drawer.Footer borderTopWidth="1px" borderColor="border.muted">
          <Composer value={prompt} onChange={setPrompt} onSend={() => void start()} busy={action.busy} label={t('chat.first')} autoFocus />
        </Drawer.Footer>
      )}
    </>
  );
}

/** One chat: its messages and replies, oldest first, a working line while a run goes, and the next message. */
function ChatView({ id, onBack, onMissing }: { id: string; onBack: () => void; onMissing?: () => void }) {
  const t = useAgentTexts();
  const confirm = useConfirm();
  const request = useAreaRequest('agent');
  const state = useContext(ChatContext);
  const chat = useApiQuery<AgentChatInfo>('agent', `/chats/${id}`);
  const send = useApiAction();
  const [prompt, setPrompt] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const { reload, setData } = chat;
  const c = chat.data;

  // Opened by its id from elsewhere and not the person's (or gone): their list, not an error.
  useEffect(() => {
    if (onMissing && chat.error && !c) onMissing();
  }, [onMissing, chat.error, c]);
  const going = c ? !c.canSend : false;
  const last = c?.runs.at(-1);
  const live = useLiveRun(id, going, reload);
  const liveText = Object.values(live.texts).join('').length;

  // A run about the item ended: its page may have changed.
  const wasGoing = useRef(false);
  useEffect(() => {
    if (wasGoing.current && !going && c?.chat.itemKey && c.chat.itemKind) state?.onItemChanged?.({ kind: c.chat.itemKind, key: c.chat.itemKey });
    wasGoing.current = going;
  }, [going, c, state]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [c?.runs.length, last?.state, last?.answer, liveText, live.steps.length]);

  async function say() {
    if (!prompt.trim() || going) return;
    const next = await send.run(() => request<AgentChatInfo>(`/chats/${id}/messages`, { method: 'POST', body: { prompt } }));
    if (next) {
      setData(next);
      setPrompt('');
    }
  }

  async function remove() {
    if (!(await confirm({ title: t('chat.deleteTitle'), description: t('chat.deleteBody'), confirmLabel: t('chat.delete'), danger: true }))) return;
    const done = await send.run(async () => {
      await request(`/chats/${id}`, { method: 'DELETE' });
      return true;
    });
    if (done) {
      notify.success(t('chat.deleted'));
      onBack();
    }
  }

  return (
    <>
      <Drawer.Header pe="12">
        <HStack gap="1.5" align="start" w="full">
          <BackButton onBack={onBack} />
          <Stack gap="0.5" flex="1" minW="0">
            <Drawer.Title truncate dir="auto">{c?.chat.title ?? ''}</Drawer.Title>
            {c && (
              <Text textStyle="caption" color="fg.muted" truncate>
                {c.chat.agent?.displayName ?? c.chat.agentKey} ·{' '}
                {c.chat.itemKey ? <ItemLink kind={c.chat.itemKind} itemKey={c.chat.itemKey}>{t('chat.about', { key: c.chat.itemKey })}</ItemLink> : <Where chat={c.chat} />}
              </Text>
            )}
          </Stack>
          {c && !going && (
            <IconButton danger aria-label={t('chat.delete')} size="sm" onClick={() => void remove()} data-testid="agent-chat-delete">
              <Trash2 size={16} />
            </IconButton>
          )}
        </HStack>
      </Drawer.Header>
      <Drawer.Body>
        {chat.error && <InlineAlert tone="danger">{chat.error}</InlineAlert>}
        {c && (
          <Stack gap="5" as="ol" listStyleType="none" aria-label={t('chat.messages')}>
            <Text as="li" textStyle="caption" color="fg.muted" textAlign="center">{t('chat.private')}</Text>
            {c.runs.map((run) => (
              <Turn key={run.id} run={run} chat={c} onChat={setData} onChanged={reload}
                live={GOING.has(run.state) && (live.run === run.id || (live.run === null && run.id === last?.id)) ? live : undefined} />
            ))}
          </Stack>
        )}
        <div ref={end} />
      </Drawer.Body>
      <Drawer.Footer borderTopWidth="1px" borderColor="border.muted">
        <Stack gap="1.5" w="full">
          {send.error && <InlineAlert tone="danger">{send.error}</InlineAlert>}
          <Composer value={prompt} onChange={setPrompt} onSend={() => void say()} busy={send.busy} disabled={going}
            label={t('chat.message', { agent: c?.chat.agent?.displayName ?? c?.chat.agentKey ?? '' })} hint={going ? t('chat.busy') : undefined} autoFocus />
        </Stack>
      </Drawer.Footer>
    </>
  );
}

/**
 * One message and its reply: the person's words, then the agent's: its state while it goes (with Stop), the reply as
 * it's written and each step as it happens, the question it waits on, the reply, the tools it used, and posting the
 * reply on the item. After a run that changed something, the host's actions (`agent.run.actions`: "Undo this run").
 */
function Turn({ run, chat, onChat, onChanged, live }: { run: AgentRunInfo; chat: AgentChatInfo; onChat: (c: AgentChatInfo) => void; onChanged: () => Promise<void>; live?: Live }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('agent');
  const state = useContext(ChatContext);
  const action = useApiAction();
  const [open, setOpen] = useState(false);
  const going = GOING.has(run.state);
  // While it goes, its steps as its events say; the reply so far is its latest turn's text.
  const tools: { name: string; target?: string | null; outcome: string; writes?: boolean; number: string | number }[] = live && live.steps.length > 0
    ? live.steps.map((s) => ({ name: s.tool, target: s.target, outcome: s.outcome ?? 'started', number: s.step }))
    : run.steps.filter((s) => s.kind === 'tool');
  const writing = live ? Object.entries(live.texts).sort(([a], [b]) => Number(b) - Number(a)).find(([, text]) => text.length > 0)?.[1] : undefined;
  const itemKey = chat.chat.itemKey;
  const itemKind = chat.chat.itemKind;
  const postable = chat.postable.includes(run.id);
  const agent = chat.chat.agent?.displayName ?? chat.chat.agentKey;
  // Something to undo: a step that could change things ran, or stopped while it ran.
  const changed = tools.some((s) => s.writes && (s.outcome === 'done' || s.outcome === 'unknown'));
  const itemChanged = async () => {
    await onChanged();
    if (itemKey && itemKind) state?.onItemChanged?.({ kind: itemKind, key: itemKey });
  };

  async function stop() {
    if (await action.run(() => request<AgentRunInfo>(`/runs/${run.id}/stop`, { method: 'POST' }))) await onChanged();
  }

  async function post() {
    const next = await action.run(() => request<AgentChatInfo>(`/chats/${chat.chat.id}/runs/${run.id}/post`, { method: 'POST' }));
    if (next) {
      onChat(next);
      notify.success(t('chat.postedNote', { agent, key: itemKey ?? '' }));
      if (itemKey && itemKind) state?.onItemChanged?.({ kind: itemKind, key: itemKey });
    }
  }

  return (
    <Box as="li" data-testid="agent-chat-turn">
      <Stack gap="2.5">
        {run.prompt && (
          <Box alignSelf="flex-end" maxW="85%" bg="bg.muted" borderRadius="l3" px="3" py="2" textStyle="sm" whiteSpace="pre-wrap" dir="auto" aria-label={t('chat.you')}>
            {run.prompt}
          </Box>
        )}
        <Stack gap="1.5">
          <HStack gap="2" wrap="wrap">
            <Bot size={14} aria-hidden />
            <Text as="span" textStyle="sm" fontWeight="medium">{agent}</Text>
            {run.state !== 'done' && <StatusPill tone={RUN_TONES[run.state] ?? 'neutral'}>{t(`runs.states.${run.state}`)}</StatusPill>}
            {run.outside && <StatusPill tone="warning">{t('runs.outside')}</StatusPill>}
            {run.wide && <StatusPill tone="warning">{t('runs.wide')}</StatusPill>}
            <Text as="span" textStyle="caption" color="fg.muted">{fmt.dateTime(run.createdAt)}</Text>
            {going && (
              <Button size="xs" variant="ghost" onClick={() => void stop()} loading={action.busy} data-testid="agent-chat-stop">
                <Square />
                {t('runs.stop')}
              </Button>
            )}
          </HStack>
          {going && !run.question && !writing && (
            <Text textStyle="caption" color="fg.muted" aria-live="polite">{run.state === 'queued' ? t('chat.queued') : t('chat.working', { agent, count: tools.length })}</Text>
          )}
          {going && writing && <Box aria-busy="true"><AgentText source={writing} testId="agent-chat-writing" /></Box>}
          {run.question && <AgentQuestionCard question={run.question} onAnswered={onChanged} />}
          {run.answer && <AgentText source={run.answer} testId="agent-chat-reply" />}
          {!going && !run.answer && (
            <Text textStyle="caption" color={run.state === 'failed' ? 'fg.error' : 'fg.muted'}>
              {run.state === 'stopped' ? t('chat.stopped') : run.state === 'failed' ? t('chat.failed', { why: run.error ?? '' }) : t('chat.noReply')}
            </Text>
          )}
          {tools.length > 0 && (
            <Box>
              <Button size="xs" variant="link" px="0" onClick={() => setOpen(!open)} aria-expanded={open}>
                {open ? <ChevronDown /> : <DirectionalIcon><ChevronRight /></DirectionalIcon>}
                {t('runs.steps', { count: tools.length })}
              </Button>
              {open && (
                <Stack gap="0.5" mt="1" as="ol" listStyleType="none">
                  {tools.map((s) => (
                    <Text as="li" key={String(s.number)} textStyle="caption" color={s.outcome === 'failed' || s.outcome === 'refused' ? 'fg.error' : 'fg.muted'}>
                      {s.name}{s.target ? ` · ${s.target}` : ''}: {t(`runs.outcomes.${s.outcome}`)}
                    </Text>
                  ))}
                </Stack>
              )}
            </Box>
          )}
          {!going && (postable || run.postedAt || changed) && (
            <HStack gap="1" wrap="wrap">
              {postable && itemKey && (
                <Button size="xs" variant="secondary" onClick={() => void post()} loading={action.busy} data-testid="agent-chat-post">{t('chat.post', { key: itemKey })}</Button>
              )}
              {run.postedAt && itemKey && (
                <HStack gap="1" color="fg.muted" textStyle="caption" px="1">
                  <Check size={12} aria-hidden />
                  <Text as="span">{t('chat.posted', { key: itemKey })}</Text>
                </HStack>
              )}
              {changed && <HostSlot name="agent.run.actions" context={{ run, onChanged: itemChanged }} />}
            </HStack>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  const t = useAgentTexts();
  return (
    <IconButton aria-label={t('chat.back')} size="sm" onClick={onBack} data-testid="agent-chat-back">
      <DirectionalIcon>
        <ArrowLeft size={16} />
      </DirectionalIcon>
    </IconButton>
  );
}

/** Where the person writes: Enter sends, Shift+Enter starts a new line, and nothing sends while a run goes. */
function Composer({ value, onChange, onSend, busy, disabled, label, hint, autoFocus }: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const t = useAgentTexts();
  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!disabled && !busy) onSend();
    }
  }

  return (
    <Stack gap="1.5" w="full">
      <Textarea rows={3} maxLength={8000} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={keyDown} placeholder={label} aria-label={label}
        dir="auto" autoFocus={autoFocus} resize="none" data-testid="agent-chat-composer" />
      <HStack justify="space-between" gap="2">
        <Text textStyle="caption" color="fg.muted">{hint ?? t('chat.keys')}</Text>
        <Button size="sm" variant="primary" onClick={onSend} loading={busy} disabled={disabled || !value.trim()} data-testid="agent-chat-send">
          <DirectionalIcon>
            <Send />
          </DirectionalIcon>
          {t('chat.send')}
        </Button>
      </HStack>
    </Stack>
  );
}
