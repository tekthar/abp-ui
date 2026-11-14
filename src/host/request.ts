import { AbpApiError, isStepUp, readAbpError } from './errors.ts';
import { requestStepUp } from './step-up.ts';

/** What a call sends: its method, a JSON body (or FormData as is), headers, and a way to stop it. */
export interface HostRequestInit {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** The answer as a file (a Blob and the name Content-Disposition gives) rather than JSON. */
  as?: 'json' | 'file';
}

/** A file the server answered with. */
export interface HostFile {
  blob: Blob;
  name: string | null;
}

/**
 * The host's way to call its server (ADR 0109): same origin, with its own session, anti-forgery header, sign-in
 * redirect and step-up. Throws `AbpApiError` for a refusal. The screens call nothing else.
 */
export type HostRequest = <T = unknown>(path: string, init?: HostRequestInit) => Promise<T>;

export interface HostRequestOptions {
  /** The anti-forgery cookie's name and the header it's sent in on every call that changes something. */
  csrf?: { cookie: string; header: string };
  /** A 401: the host sends the person to sign in. */
  onUnauthorized?: () => void;
  /**
   * A 403 `step_up_required`: the host confirms the person again; true retries the call once. By default the step-up
   * dialog `AbpProvider` draws asks (`requestStepUp`), and without one the call fails as the server answered.
   */
  stepUp?: () => Promise<boolean>;
  /** More headers on every call (a development user, a tenant). */
  headers?: () => Record<string, string>;
  fetch?: typeof fetch;
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function cookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`).exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : null;
}

/** A file's name from Content-Disposition, `filename*=UTF-8''…` first. */
export function fileNameOf(disposition: string | null): string | null {
  if (!disposition) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : null;
}

/**
 * A host request for a host that has none of its own: cookies for the session, the anti-forgery cookie echoed in its
 * header, a 401 handed to the host, and one retry after a step-up (the provider's step-up dialog unless `stepUp` is given). A host with its own request passes that instead.
 */
export function createHostRequest(options: HostRequestOptions = {}): HostRequest {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const stepUp = options.stepUp ?? requestStepUp;
  async function send(path: string, init: HostRequestInit): Promise<Response> {
    const method = (init.method ?? (init.body === undefined ? 'GET' : 'POST')).toUpperCase();
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers?.(), ...init.headers };
    let body: BodyInit | undefined;
    if (init.body instanceof FormData || init.body instanceof Blob) body = init.body;
    else if (init.body !== undefined) {
      body = JSON.stringify(init.body);
      headers['Content-Type'] = 'application/json';
    }
    if (options.csrf && !SAFE.has(method)) {
      const token = cookie(options.csrf.cookie);
      if (token) headers[options.csrf.header] = token;
    }
    return doFetch(path, { method, headers, body, credentials: 'same-origin', signal: init.signal });
  }

  return async function request<T>(path: string, init: HostRequestInit = {}): Promise<T> {
    let res = await send(path, init);
    if (!res.ok) {
      const error = await readAbpError(res.clone());
      if (res.status === 401) options.onUnauthorized?.();
      if (isStepUp(error) && (await stepUp())) res = await send(path, init);
      else throw error;
      if (!res.ok) throw await readAbpError(res);
    }
    if (init.as === 'file') return { blob: await res.blob(), name: fileNameOf(res.headers.get('Content-Disposition')) } as T;
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  };
}

export { AbpApiError };
