import type { ReactNode } from 'react';
import { createToaster, Portal, Spinner, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react';

/**
 * The page's single toaster. It lives in @todahq/ui (a Module Federation singleton), so a
 * plugin calling `notify.success(...)` shows its toast in the shell's toaster.
 */
export const toaster = createToaster({ placement: 'bottom-end', pauseOnPageIdle: true, max: 5 });

/**
 * How long a toast stays (the canvas's v12 feedback, UI round 9 step 66): six seconds, long enough to read and reach its
 * action; an error until it's closed, so what went wrong isn't missed; a loading one until it's settled. Hovering or
 * focusing the toasts pauses them (the toaster's own). A toast given its own duration keeps it.
 */
export function toastDuration(type: string | undefined): number {
  return type === 'error' || type === 'loading' ? Infinity : 6000;
}
const createToast = toaster.create.bind(toaster);
toaster.create = ((data: Parameters<typeof createToast>[0]) =>
  createToast({ ...data, duration: data.duration ?? toastDuration(data.type) })) as typeof toaster.create;

type Message = ReactNode;

export const notify = {
  success: (title: Message, description?: Message) => toaster.create({ type: 'success', title, description }),
  error: (title: Message, description?: Message) => toaster.create({ type: 'error', title, description }),
  warning: (title: Message, description?: Message) => toaster.create({ type: 'warning', title, description }),
  info: (title: Message, description?: Message) => toaster.create({ type: 'info', title, description }),
};

/**
 * zag-js (toast 1.43) turns "bottom-end" into the physical "bottom-left" for RTL and then
 * positions it with `inset-inline-start`, which in RTL is the right edge again. Pin the group
 * to the inline end in RTL so toasts sit bottom-left in Arabic, mirroring English.
 */
const rtlPlacementFix = {
  _rtl: {
    insetInlineStart: 'auto !important',
    insetInlineEnd: 'calc(env(safe-area-inset-left, 0px) + 1rem) !important',
    alignItems: 'flex-end !important',
  },
} as const;

/** Rendered once by TodaProvider. */
export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }} css={rtlPlacementFix}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            {toast.type === 'loading' ? <Spinner size="sm" color="fg.accent" /> : <Toast.Indicator />}
            <Stack gap="0.5" flex="1" maxWidth="full">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {toast.action && <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>}
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
