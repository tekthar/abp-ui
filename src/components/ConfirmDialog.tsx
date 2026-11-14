import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CloseButton, Dialog, Portal } from '@chakra-ui/react';
import { useAbpLabels } from '../provider/labels';
import { Button } from './Button';

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
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
}: ConfirmDialogProps) {
  const labels = useAbpLabels();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
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
            {description != null && (
              <Dialog.Body>
                <Dialog.Description>{description}</Dialog.Description>
              </Dialog.Body>
            )}
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button ref={cancelRef} variant="secondary">
                  {cancelLabel ?? labels.cancel}
                </Button>
              </Dialog.ActionTrigger>
              <Button variant="primary" danger={danger} loading={busy} onClick={() => void onConfirm()}>
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
