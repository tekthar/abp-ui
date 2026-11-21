import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { chakra, CloseButton, Dialog, Input, Portal, Stack } from '@chakra-ui/react';
import { defaultLabels, useAbpLabels } from '../provider/labels';
import { Button } from './Button';

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  /**
   * A word the person types before the confirm turns on (a project's key, to delete it): for acts that can't be taken
   * back and reach a lot. Matched exactly, ignoring spaces around it.
   */
  typeToConfirm?: string;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  /** Shows a spinner on the confirm button while the action runs. */
  busy?: boolean;
}

/** An alert dialog asking the user to confirm an action. Focus starts on Cancel. */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger,
  typeToConfirm,
}: ConfirmDialogProps) {
  const labels = useAbpLabels();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState('');
  const typedId = useId();
  const locked = typeToConfirm != null && typed.trim() !== typeToConfirm;
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => {
        if (!e.open) setTyped('');
        onOpenChange(e.open);
      }}
      initialFocusEl={() => cancelRef.current}
      size="sm"
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            {(description != null || typeToConfirm != null) && (
              <Dialog.Body>
                <Stack gap="3">
                  {description != null && <Dialog.Description>{description}</Dialog.Description>}
                  {typeToConfirm != null && (
                    <Stack gap="1.5">
                      <chakra.label htmlFor={typedId} textStyle="sm" fontWeight="medium">
                        {fill(labels.typeToConfirm ?? defaultLabels.typeToConfirm!, { value: typeToConfirm })}
                      </chakra.label>
                      <Input id={typedId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} dir="ltr"
                        fontFamily="mono" data-type-to-confirm="" />
                    </Stack>
                  )}
                </Stack>
              </Dialog.Body>
            )}
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button ref={cancelRef} variant="cancel">
                  {cancelLabel ?? labels.cancel}
                </Button>
              </Dialog.ActionTrigger>
              <Button variant="primary" danger={danger} loading={busy} disabled={locked} onClick={() => void onConfirm()}>
                {confirmLabel ?? labels.confirm}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" aria-label={labels.close} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/** `{name}` placeholders filled in. */
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Provides `useConfirm()`. AbpProvider renders it; you rarely need it directly. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    resolver.current?.(false);
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog
          {...state}
          onOpenChange={(open) => {
            if (!open) settle(false);
          }}
          onConfirm={() => settle(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** `if (await confirm({ title, danger: true })) ...` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside AbpProvider');
  return ctx;
}
