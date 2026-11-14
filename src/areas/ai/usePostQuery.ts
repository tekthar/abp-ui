import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText, useAreaRequest } from '@abpjs/ui';

/**
 * A query AbpAi asks as a POST (usage, recent calls): sent again when its body changes; the latest answer wins. The
 * POST counterpart of `useApiQuery`.
 */
export function usePostQuery<T>(path: string, body: unknown) {
  const request = useAreaRequest('ai');
  const key = JSON.stringify(body);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const answer = await request<T>(path, { method: 'POST', body: JSON.parse(key) });
      if (id === seq.current) {
        setData(answer);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(errorText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [request, path, key]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
