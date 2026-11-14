import { useCallback, useRef } from 'react';

/** A slot's own save, run when the dialog or form holding it saves. */
export type SlotSave = () => Promise<void> | void;

/** What a slot inside a dialog receives to join its Save: it registers its save, and gets a way to take it back. */
export type RegisterSlotSave = (save: SlotSave) => () => void;

/**
 * One Save for a dialog with slots in it (ADR 0109 amendment): the host's fields inside an area's dialog (a slot) add
 * their own save through `register`, which the slot gets in its context; when the person saves, the area saves its own
 * part first, then `run()` runs every slot's save in order. A slot that throws stops the rest, and the dialog shows
 * the error as it shows its own.
 */
export function useSlotSaves(): { register: RegisterSlotSave; run: () => Promise<void> } {
  const saves = useRef(new Set<SlotSave>());
  const register = useCallback<RegisterSlotSave>((save) => {
    saves.current.add(save);
    return () => {
      saves.current.delete(save);
    };
  }, []);
  const run = useCallback(async () => {
    for (const save of [...saves.current]) await save();
  }, []);
  return { register, run };
}
