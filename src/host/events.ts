import { AbpApiError, isStepUp, readAbpError } from './errors.ts';
import type { HostRequestOptions } from './request.ts';

/** One server-sent event: its name (`message` when none), its data as JSON, and its id when it has one. */
export type HostEventHandler = (name: string, data: Record<string, unknown>, id: string | null) => void;

/**
 * The host's way to read a stream of server-sent events (ADR 0109 amendment): resumed from `lastEventId`, stopped by
 * `signal`. Resolves with the last event's id when the stream ends; throws the host's error (a refusal, a 401, a
 * step-up not confirmed) before it starts. Optional: a screen without it asks again every few seconds.
 */
export type HostEvents = (path: string, onEvent: HostEventHandler, options?: { lastEventId?: string | null; signal?: AbortSignal }) => Promise<string | null>;

/** Reads a response's server-sent events to its end. */
export async function readEvents(res: Response, onEvent: HostEventHandler): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = 'message';
      let id: string | null = null;
      const data: string[] = [];
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('id:')) id = line.slice(3).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) onEvent(name, JSON.parse(data.join('\n')), id);
    }
    if (done) break;
  }
}

/** Server-sent events for a host without its own reader: same origin, its headers, a 401 handed back, one step-up. */
export function createHostEvents(options: Pick<HostRequestOptions, 'onUnauthorized' | 'stepUp' | 'headers' | 'fetch'> = {}): HostEvents {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  return async function events(path, onEvent, { lastEventId = null, signal } = {}) {
    const open = () => {
      const headers: Record<string, string> = { Accept: 'text/event-stream', ...options.headers?.() };
      if (lastEventId) headers['Last-Event-ID'] = lastEventId;
      return doFetch(path, { method: 'GET', headers, credentials: 'same-origin', cache: 'no-store', signal });
    };
    let res = await open();
    if (!res.ok) {
      const error: AbpApiError = await readAbpError(res.clone());
      if (res.status === 401) options.onUnauthorized?.();
      if (isStepUp(error) && options.stepUp && (await options.stepUp())) res = await open();
      else throw error;
      if (!res.ok) throw await readAbpError(res);
    }
    let last = lastEventId;
    await readEvents(res, (name, data, id) => {
      if (id) last = id;
      onEvent(name, data, id);
    });
    return last;
  };
}
