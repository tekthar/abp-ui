import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { pastedName } from './upload-plan';

/**
 * Files dropped or pasted onto a page (ADR 0011, amended): knowing files are being dragged over it (so drop zones can
 * wake), a drop zone that knows which of its parts the pointer is over, a catch for drops anywhere else (the browser
 * would otherwise open the file in place of the page), dropped folders read with their paths, and pasted files.
 * Only files count: dragging text, a link or a board card wakes nothing.
 */

/** A dropped file, with where it was inside a dropped folder ("Specs/v2/a.pdf"; just its name when dropped alone). */
export interface DroppedFile {
  file: File;
  path: string;
  /** The name it gets, when not the file's own (a pasted screenshot). */
  name?: string;
}

const isFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** What a system leaves in folders, never meant to be uploaded. */
const JUNK = /^(\.DS_Store|Thumbs\.db|desktop\.ini|\._.*)$/i;

// ---- files over the page ------------------------------------------------------------------------------------------

let over = false;
let quiet = 0;
const listeners = new Set<() => void>();
const set = (value: boolean) => {
  if (over === value) return;
  over = value;
  for (const l of listeners) l();
};

function watch(): () => void {
  const enter = (e: DragEvent) => {
    if (!isFiles(e)) return;
    set(true);
    // A drag that ends outside the window (or with Esc there) sends nothing here: dragover stops, so stop with it.
    window.clearTimeout(quiet);
    quiet = window.setTimeout(() => set(false), 1200);
  };
  const leave = (e: DragEvent) => {
    if (e.relatedTarget == null && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) set(false);
  };
  const end = () => {
    window.clearTimeout(quiet);
    set(false);
  };
  window.addEventListener('dragenter', enter);
  window.addEventListener('dragover', enter);
  window.addEventListener('dragleave', leave);
  window.addEventListener('drop', end, true);
  window.addEventListener('dragend', end);
  window.addEventListener('blur', end);
  return () => {
    window.removeEventListener('dragenter', enter);
    window.removeEventListener('dragover', enter);
    window.removeEventListener('dragleave', leave);
    window.removeEventListener('drop', end, true);
    window.removeEventListener('dragend', end);
    window.removeEventListener('blur', end);
  };
}

let unwatch: (() => void) | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) unwatch = watch();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unwatch?.();
      unwatch = null;
      over = false;
    }
  };
}

/** Whether files are being dragged over the page right now (from the desktop or another window). */
export function useFilesOverPage(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => over,
    () => false,
  );
}

// ---- reading what was dropped -------------------------------------------------------------------------------------

const fileOf = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));

async function entriesOf(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  // A reader hands entries out in batches (a hundred in Chrome) until it hands out none.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

async function walk(entry: FileSystemEntry, prefix: string, out: DroppedFile[]): Promise<void> {
  if (JUNK.test(entry.name)) return;
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile) out.push({ file: await fileOf(entry as FileSystemFileEntry), path });
  else if (entry.isDirectory) for (const child of await entriesOf(entry as FileSystemDirectoryEntry)) await walk(child, path, out);
}

/**
 * The files in a drop, folders read through with their paths. Call it in the drop's own handler: the browser hands out
 * what was dropped only then (reading the folders may finish later).
 */
export function droppedFiles(data: DataTransfer | null): Promise<DroppedFile[]> {
  if (!data) return Promise.resolve([]);
  const entries = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.() ?? null);
  if (entries.length > 0 && entries.every((e) => e != null)) {
    return (async () => {
      const out: DroppedFile[] = [];
      for (const entry of entries) await walk(entry!, '', out);
      return out;
    })();
  }
  return Promise.resolve(Array.from(data.files).filter((f) => !JUNK.test(f.name)).map((file) => ({ file, path: file.name })));
}

// ---- a drop zone --------------------------------------------------------------------------------------------------

export interface DropZoneOptions {
  /** Off: the zone takes nothing (the browser's own handling stays off while a page catch is on). */
  enabled?: boolean;
  /** The part of the zone a drop lands on: the closest `[data-drop]` holds it; elsewhere in the zone, null. */
  onFiles: (files: DroppedFile[], part: string | null) => void;
}

export interface DropZoneState {
  /** Files are over the zone. */
  over: boolean;
  /** The `[data-drop]` part they're over, if any. */
  part: string | null;
}

/**
 * Makes an element take dropped files: it says when they're over it, and which part (`data-drop` on a child: a
 * folder's row), and hands them over with that part. A drop here never reaches a page catch.
 */
export function useDropZone(ref: RefObject<HTMLElement | null>, { enabled = true, onFiles }: DropZoneOptions): DropZoneState {
  const [state, setState] = useState<DropZoneState>({ over: false, part: null });
  const take = useRef(onFiles);
  useEffect(() => {
    take.current = onFiles;
  }, [onFiles]);

  useEffect(() => {
    const zone = ref.current;
    if (!zone || !enabled) return;
    let depth = 0;
    const partOf = (e: Event) => (e.target instanceof Element ? (e.target.closest('[data-drop]')?.getAttribute('data-drop') ?? null) : null);
    const show = (next: DropZoneState) => setState((s) => (s.over === next.over && s.part === next.part ? s : next));
    const enter = (e: DragEvent) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      depth += 1;
      show({ over: true, part: partOf(e) });
    };
    const move = (e: DragEvent) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      show({ over: true, part: partOf(e) });
    };
    const leave = (e: DragEvent) => {
      if (!isFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) show({ over: false, part: null });
    };
    const drop = (e: DragEvent) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      const part = partOf(e);
      show({ over: false, part: null });
      void droppedFiles(e.dataTransfer).then((files) => files.length > 0 && take.current(files, part));
    };
    zone.addEventListener('dragenter', enter);
    zone.addEventListener('dragover', move);
    zone.addEventListener('dragleave', leave);
    zone.addEventListener('drop', drop);
    return () => {
      zone.removeEventListener('dragenter', enter);
      zone.removeEventListener('dragover', move);
      zone.removeEventListener('dragleave', leave);
      zone.removeEventListener('drop', drop);
      setState({ over: false, part: null });
    };
  }, [ref, enabled]);

  return state;
}

/**
 * Catches files dropped anywhere on the page outside a drop zone (one page catch at a time: the record's attachments).
 * While it's on, the browser never opens a dropped file in place of the page.
 */
export function usePageDrop({ enabled = true, onFiles }: { enabled?: boolean; onFiles: (files: DroppedFile[]) => void }): void {
  const take = useRef(onFiles);
  useEffect(() => {
    take.current = onFiles;
  }, [onFiles]);
  useEffect(() => {
    if (!enabled) return;
    const move = (e: DragEvent) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const drop = (e: DragEvent) => {
      if (!isFiles(e) || e.defaultPrevented) return;
      e.preventDefault();
      void droppedFiles(e.dataTransfer).then((files) => files.length > 0 && take.current(files));
    };
    window.addEventListener('dragover', move);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', move);
      window.removeEventListener('drop', drop);
    };
  }, [enabled]);
}

// ---- pasted files -------------------------------------------------------------------------------------------------

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable=""], [contenteditable=true]') != null);

/**
 * Files pasted on the page (a screenshot from the clipboard), named as `pastedName` says. In a text box a paste is the
 * box's, unless it holds files and no text (a screenshot pasted while typing a comment is still attached).
 */
export function usePastedFiles({ enabled = true, onFiles }: { enabled?: boolean; onFiles: (files: DroppedFile[]) => void }): void {
  const take = useRef(onFiles);
  useEffect(() => {
    take.current = onFiles;
  }, [onFiles]);
  useEffect(() => {
    if (!enabled) return;
    const paste = (e: ClipboardEvent) => {
      const data = e.clipboardData;
      const files = Array.from(data?.files ?? []);
      if (files.length === 0) return;
      if (editable(e.target) && (data?.getData('text/plain') ?? '') !== '') return;
      e.preventDefault();
      const at = new Date();
      // Several screenshots pasted at once share the time: number them rather than make them versions of one file.
      const used = new Map<string, number>();
      take.current(
        files.map((file) => {
          const name = pastedName(file.name, file.type, at);
          const n = (used.get(name) ?? 0) + 1;
          used.set(name, n);
          return { file, path: file.name, name: n === 1 ? name : name.replace(/(\.[^.]+)?$/, ` (${n})$1`) };
        }),
      );
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [enabled]);
}
