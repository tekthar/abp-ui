// The documents area's rules, apart from React so they can be tested: what's refused before an upload is sent, how
// long until a list or a document is read again, and a page number from an address.

/** Statuses on their way: read again every few seconds. */
export const ACTIVE: readonly string[] = ['queued', 'reading', 'indexing'];

/** How often a document being read is read again. */
export const ACTIVE_POLL_MS = 3000;

/**
 * Why a file is refused before it's sent, or null: `empty`, `tooBig` (over the server's most bytes), or `kind` (its
 * name's extension isn't one the server reads; the server checks its bytes anyway).
 */
export function refusalOf(file: { name: string; size: number }, maxBytes?: number | string | null, extensions?: readonly string[] | null): 'empty' | 'tooBig' | 'kind' | null {
  if (file.size <= 0) return 'empty';
  const max = Number(maxBytes ?? 0);
  if (max > 0 && file.size > max) return 'tooBig';
  if (extensions && extensions.length > 0) {
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    if (!extensions.some((e) => e.toLowerCase() === ext)) return 'kind';
  }
  return null;
}

/**
 * How long until documents are read again: every few seconds while one is being read; while some only wait on a limit,
 * until the soonest of their retries (a quarter of a minute to five minutes); null when none is on its way.
 */
export function pollDelay(items: readonly { status: string; retryAt?: string | null }[], now = Date.now()): number | null {
  if (items.some((d) => ACTIVE.includes(d.status))) return ACTIVE_POLL_MS;
  const waits = items.filter((d) => d.status === 'waiting').map((d) => (d.retryAt ? Date.parse(d.retryAt) : now) - now);
  if (waits.length === 0) return null;
  const soonest = Math.min(...waits.map((w) => (Number.isFinite(w) ? w : 0)));
  return Math.min(300_000, Math.max(15_000, soonest + 1000));
}

/** A page number from an address or a box: a whole number from 1, within the pages when they're known; 1 otherwise. */
export function pageOf(value: unknown, pages?: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  const page = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return pages != null && Number.isFinite(pages) && pages >= 1 ? Math.min(page, Math.floor(pages)) : page;
}

/** The type a fetched file is shown as: the document's own kind, never what the response said. */
export function shownType(kind: string): string | null {
  switch (kind) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}
