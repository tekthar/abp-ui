/**
 * The rules of an upload queue (ADR 0011, amended), kept apart from React and the network so they can be tested:
 * which files go next, what's refused before sending, how far along the whole queue is, the folders a dropped folder
 * needs, and the name a pasted file gets.
 */

/** Where a file is: waiting its turn, being sent, done, failed (it can be tried again), cancelled, or refused before sending. */
export type UploadState = 'waiting' | 'sending' | 'done' | 'failed' | 'cancelled' | 'refused';

export interface UploadJob {
  id: string;
  /** The name it will have. */
  name: string;
  size: number;
  /** The folder it goes into ("" for the top). */
  folder: string;
  state: UploadState;
  /** Bytes sent so far. */
  sent: number;
}

/** Files sent at once: enough to keep a connection busy, few enough that each one's bar moves. */
export const UPLOADS_AT_ONCE = 3;

/** The same file to the server: the same name (compared without case) in the same folder. */
export const targetOf = (job: Pick<UploadJob, 'folder' | 'name'>): string => `${job.folder}/${job.name.toLocaleLowerCase()}`;

/**
 * The waiting files to start now, in the order they came: up to the limit with those already going, and never two of
 * the same name into the same folder at once (both would make the file, or race for its next version).
 */
export function toStart<T extends UploadJob>(jobs: readonly T[], limit = UPLOADS_AT_ONCE): T[] {
  const going = jobs.filter((j) => j.state === 'sending');
  const busy = new Set(going.map(targetOf));
  let room = limit - going.length;
  const start: T[] = [];
  for (const job of jobs) {
    if (room <= 0) break;
    if (job.state !== 'waiting' || busy.has(targetOf(job))) continue;
    busy.add(targetOf(job));
    start.push(job);
    room -= 1;
  }
  return start;
}

/** Why a file can't be sent, before sending it: it's empty, or bigger than the server takes; null when it can. */
export function refusal(size: number, maxBytes?: number | null): 'empty' | 'tooBig' | null {
  if (size <= 0) return 'empty';
  if (maxBytes != null && maxBytes > 0 && size > maxBytes) return 'tooBig';
  return null;
}

export interface QueueProgress {
  /** The files that go, or went: neither cancelled nor refused before sending. */
  total: number;
  done: number;
  /** Sent and not taken: they can be tried again. */
  failed: number;
  /** Not sent at all (empty, or too big). */
  refused: number;
  /** Still waiting or going. */
  active: number;
  /** Of the files still going or done, how much is sent: 0 to 1. */
  fraction: number;
}

/** How far along the whole queue is, for its one line ("3 of 5 uploaded") and its bar. */
export function progressOf(jobs: readonly UploadJob[]): QueueProgress {
  const counted = jobs.filter((j) => j.state !== 'cancelled' && j.state !== 'refused');
  const moving = counted.filter((j) => j.state === 'waiting' || j.state === 'sending' || j.state === 'done');
  const bytes = moving.reduce((n, j) => n + j.size, 0);
  const sent = moving.reduce((n, j) => n + (j.state === 'done' ? j.size : Math.min(j.sent, j.size)), 0);
  return {
    total: counted.length,
    done: counted.filter((j) => j.state === 'done').length,
    failed: counted.filter((j) => j.state === 'failed').length,
    refused: jobs.filter((j) => j.state === 'refused').length,
    active: counted.filter((j) => j.state === 'waiting' || j.state === 'sending').length,
    fraction: bytes > 0 ? sent / bytes : 0,
  };
}

/**
 * The folders a dropped folder needs, parents first, from its files' paths inside it ("Specs/v2/a.pdf" needs "Specs"
 * and "Specs/v2"). Files at the top need none. Empty parts ("a//b") are skipped.
 */
export function foldersFor(paths: readonly string[]): string[] {
  const needed = new Set<string>();
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) needed.add(parts.slice(0, i).join('/'));
  }
  return [...needed].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
}

/** The folder part of a file's path inside a dropped folder ("Specs/v2/a.pdf" → "Specs/v2"; "a.pdf" → ""). */
export const folderOf = (path: string): string => path.split('/').filter(Boolean).slice(0, -1).join('/');

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'text/plain': 'txt',
  'application/pdf': 'pdf',
};

/** Names a browser gives a pasted file when it has none of its own (a screenshot from the clipboard). */
const UNNAMED = /^(image|blob|file)(\.[a-z0-9]+)?$/i;

/**
 * The name a pasted file gets: its own when it has one (a file copied from a folder), else "Pasted image" (or "Pasted
 * file") with the local time, as "Pasted image 2026-10-17 13.05.42.png" (no colons, which some systems refuse).
 */
export function pastedName(original: string | undefined, type: string, at: Date): string {
  if (original && !UNNAMED.test(original.trim())) return original.trim();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}.${pad(at.getMinutes())}.${pad(at.getSeconds())}`;
  const ext = EXTENSIONS[type] ?? original?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return `${type.startsWith('image/') ? 'Pasted image' : 'Pasted file'} ${stamp}${ext ? `.${ext}` : ''}`;
}

/** Whether a newer answer may replace what's shown: it has every file shown now (one sent earlier can't hide another). */
export function covers(shown: Iterable<string>, incoming: Iterable<string>): boolean {
  const known = new Set(incoming);
  for (const id of shown) if (!known.has(id)) return false;
  return true;
}
