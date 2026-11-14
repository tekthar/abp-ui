import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { errorText } from './errors';
import type { HostFile, HostRequest, HostRequestInit } from './request';

/** A scope as a host knows it: a project, an org unit. */
export interface HostScope {
  id: string;
  name: string;
  /** Its short code (a project's key), when the host has one. */
  code?: string;
  parentId?: string | null;
}

/** One of the site's languages, for names by language. */
export interface HostLanguage {
  code: string;
  name: string;
  direction?: 'ltr' | 'rtl';
}

/**
 * What a host gives the screens (ADR 0109 amendment): how to call its server, where each package's API is, how to
 * move, what the person may do, its scopes and people, its languages, its words for any text, and the slots it fills.
 */
export interface AbpHost {
  /** The host's request: same origin, its session, anti-forgery header, sign-in and step-up (`createHostRequest`). */
  request: HostRequest;
  /** Each package's base path on this host: `{ ai: '/api/platform/ai', guard: '/api/guard', agent: '/api/agent' }`. */
  paths: Record<string, string>;
  /** Go to an address in the host's router. */
  navigate?: (href: string) => void;
  /** Whether the person may: a right in the package's own terms (`ai.scope.admin`), for one scope when given. */
  can?: (right: string, scopeId?: string) => boolean;
  /** The host's scopes, for pickers and for naming the ids a screen shows. */
  scopes?: {
    search: (text: string) => Promise<HostScope[]>;
    name?: (ids: string[]) => Promise<Record<string, string>>;
  };
  /** People's names for rows that carry only an id. */
  names?: (accountIds: string[]) => Promise<Record<string, string>>;
  /** The site's languages, the first the default. */
  languages?: HostLanguage[];
  /** The host's words for any area's text, by area then language then key: `{ ai: { en: { 'models.title': 'AI models' } } }`. */
  texts?: Record<string, Record<string, Record<string, string>>>;
  /** What the host draws in a screen's named places (`guard.account.panels`, `guard.directory.panel`). */
  slots?: Record<string, ComponentType<Record<string, unknown>>>;
}

const HostContext = createContext<AbpHost | null>(null);

export function HostProvider({ value, children }: { value?: AbpHost; children: ReactNode }) {
  return <HostContext.Provider value={value ?? null}>{children}</HostContext.Provider>;
}

/** The host, for a screen that needs it; a screen rendered without one says so. */
export function useHost(): AbpHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('A screen needs AbpProvider with a host (ADR 0109).');
  return host;
}

/** The host when there is one: for parts that also work without (a slot that draws nothing). */
export function useOptionalHost(): AbpHost | null {
  return useContext(HostContext);
}

/** A package's calls on this host: its base path in front of each path. */
export function useAreaRequest(area: string): HostRequest {
  const host = useHost();
  const base = host.paths[area];
  if (base === undefined) throw new Error(`The host gives no path for "${area}" (AbpHost.paths).`);
  return useCallback(<T,>(path: string, init?: HostRequestInit) => host.request<T>(`${base.replace(/\/$/, '')}${path}`, init), [host, base]) as HostRequest;
}

export interface ApiQuery<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (value: T) => void;
}

/** GET a package's path on this host, again when the path changes; null waits. The answer to the latest call wins. */
export function useApiQuery<T>(area: string, path: string | null): ApiQuery<T> {
  const request = useAreaRequest(area);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path != null);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    if (path == null) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const result = await request<T>(path);
      if (id === seq.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(errorText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [path, request]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/** An action's busy state and error: `run` gives what the action returns, or undefined when it failed. */
export function useApiAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

/** A file a package's path answers with, saved in the browser under the name the server gives (or the fallback). */
export function useApiDownload(area: string) {
  const request = useAreaRequest(area);
  return useCallback(async (path: string, init: HostRequestInit = {}, fallbackName = 'download') => {
    const file = await request<HostFile>(path, { ...init, as: 'file' });
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name ?? fallbackName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return file;
  }, [request]);
}

/** Go somewhere in the host's router (a link is `AppLink`). */
export function useNavigate(): (href: string) => void {
  const host = useHost();
  return useCallback((href: string) => (host.navigate ? host.navigate(href) : window.location.assign(href)), [host]);
}

/** Whether the person may: false when the host says nothing (the server decides anyway). */
export function useCan(): (right: string, scopeId?: string) => boolean {
  const host = useOptionalHost();
  return useCallback((right: string, scopeId?: string) => host?.can?.(right, scopeId) ?? false, [host]);
}

/** The site's languages, or none. */
export function useHostLanguages(): HostLanguage[] {
  return useOptionalHost()?.languages ?? [];
}

/**
 * Names for ids a screen shows (people, scopes): those the server named already stay; the host names the rest, once
 * per set of ids.
 */
export function useNames(kind: 'people' | 'scopes', ids: readonly string[]): Record<string, string> {
  const host = useOptionalHost();
  const [names, setNames] = useState<Record<string, string>>({});
  const key = useMemo(() => [...new Set(ids)].sort().join(','), [ids]);
  useEffect(() => {
    const wanted = key ? key.split(',') : [];
    const resolve = kind === 'people' ? host?.names : host?.scopes?.name;
    if (!resolve || wanted.length === 0) return;
    let alive = true;
    resolve(wanted).then((found) => alive && setNames(found), () => undefined);
    return () => {
      alive = false;
    };
  }, [host, kind, key]);
  return names;
}

/** What the host draws in a screen's named place, given the screen's context; nothing when the host fills none. */
export function HostSlot({ name, context }: { name: string; context?: Record<string, unknown> }) {
  const Filled = useOptionalHost()?.slots?.[name];
  return Filled ? <Filled {...context} /> : null;
}
