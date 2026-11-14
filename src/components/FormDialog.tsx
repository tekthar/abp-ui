import { useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { chakra, CloseButton, Dialog, Portal, Stack } from '@chakra-ui/react';
import { formatMessage } from '../texts/format';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';
import { Button } from './Button';
import { InlineAlert } from './InlineAlert';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
/** A field that's wrong, as the summary lists it. */
interface Problem {
  el: Control;
  label: string;
  message: string;
}

const isControl = (el: unknown): el is Control =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** The controls a form would refuse: required and empty, or not in the shape asked (an email, a number's range…). */
function invalidControls(form: HTMLFormElement): Control[] {
  return [...form.elements].filter((el): el is Control => isControl(el) && !el.disabled && el.willValidate && !el.checkValidity());
}

/** A control's name as its label shows it, without the required mark. */
function labelOf(el: Control): string {
  const text = el.labels?.[0]?.textContent ?? el.getAttribute('aria-label') ?? el.name ?? '';
  return text.replace(/\*\s*$/, '').trim();
}

/** Marks a control as wrong, or right again, after the person left it; a host's own `aria-invalid` is left alone. */
function mark(el: Control, wrong: boolean) {
  if (wrong) {
    if (el.getAttribute('aria-invalid') === 'true') return;
    el.setAttribute('aria-invalid', 'true');
    el.dataset.leftInvalid = '';
  } else if ('leftInvalid' in el.dataset) {
    el.removeAttribute('aria-invalid');
    delete el.dataset.leftInvalid;
  }
}

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  submitLabel: ReactNode;
  onSubmit: () => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** No submit button (the form inside has its own, e.g. a plugin's create view). */
  hideSubmit?: boolean;
  /** The submit button is off until what the form needs is filled in. */
  submitDisabled?: boolean;
  children: ReactNode;
}

/**
 * A dialog holding a form: title, fields, the server's error message, and Cancel / submit. A field left wrong (required
 * and empty, or not in its shape) is marked when the person leaves it, not while they type; submitting with any wrong
 * lists them at the top, each a link to its field, and sends nothing.
 */
export function FormDialog({ open, onOpenChange, title, description, submitLabel, onSubmit, busy, error, size = 'md', hideSubmit, submitDisabled, children }: FormDialogProps) {
  const labels = useAbpLabels();
  const { locale } = useAbpLocale();
  const summary = useRef<HTMLDivElement>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  // Fields the person has typed in, and whether they've tried to submit: before either, leaving a field says nothing
  // (the dialog moves focus on its own as it opens).
  const typed = useRef(new WeakSet<EventTarget>());
  const tried = useRef(false);
  const describe = (el: Control): Problem => ({ el, label: labelOf(el), message: el.validity.valueMissing ? labels.formRequired : el.validationMessage });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabled) return; // Enter in a field submits too
    const wrong = invalidControls(e.currentTarget);
    tried.current = true;
    if (wrong.length > 0) {
      wrong.forEach((el) => mark(el, true));
      setProblems(wrong.map(describe));
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setProblems([]);
    void onSubmit();
  }

  // Leaving a field says whether it's wrong; fixing one takes it off the summary.
  function left(e: FocusEvent<HTMLFormElement>) {
    if (!isControl(e.target) || !e.target.willValidate) return;
    if (!tried.current && !typed.current.has(e.target)) return;
    const wrong = !e.target.checkValidity();
    mark(e.target, wrong);
    if (problems.length > 0) setProblems(invalidControls(e.currentTarget).map(describe));
  }
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={size} placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            {/* The element stays a form in both modes: swapping it would remount the content and close the dialog.
                With hideSubmit, the content (a plugin's create view) submits on its own and must not render a form. */}
            <form onSubmit={hideSubmit ? (e) => e.preventDefault() : submit} onBlur={hideSubmit ? undefined : left}
              onInput={(e) => typed.current.add(e.target)} noValidate>
              <Dialog.Header>
                <Dialog.Title>{title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="field">
                  {description != null && <Dialog.Description>{description}</Dialog.Description>}
                  {problems.length > 0 && (
                    <chakra.div ref={summary} tabIndex={-1} outline="none" data-form-problems="">
                      <InlineAlert tone="danger" title={formatMessage(locale, labels.formFix, { count: problems.length })}>
                        <chakra.ul ps="4" listStyleType="disc">
                          {problems.map((p, i) => (
                            <li key={i}>
                              <chakra.button type="button" textDecoration="underline" cursor="pointer" textAlign="start"
                                onClick={() => { p.el.focus(); p.el.scrollIntoView({ block: 'center' }); }}>
                                {p.label ? `${p.label}: ${p.message}` : p.message}
                              </chakra.button>
                            </li>
                          ))}
                        </chakra.ul>
                      </InlineAlert>
                    </chakra.div>
                  )}
                  {children}
                  <InlineAlert tone="danger">{error}</InlineAlert>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="secondary">{labels.cancel}</Button>
                </Dialog.ActionTrigger>
                {!hideSubmit && (
                  <Button type="submit" variant="primary" loading={busy} disabled={submitDisabled}>
                    {submitLabel}
                  </Button>
                )}
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={labels.close} />
              </Dialog.CloseTrigger>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
