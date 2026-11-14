/** What asks the person to confirm who they are: true once confirmed, false if they gave up. */
export type StepUpHandler = () => Promise<boolean>;

let handler: StepUpHandler | null = null;
let pending: Promise<boolean> | null = null;

/** The step-up dialog registers itself here (`StepUpDialog`, drawn by `AbpProvider`); null when it goes. */
export function setStepUpHandler(next: StepUpHandler | null) {
  handler = next;
}

/**
 * Asks the person to confirm who they are, once however many calls are waiting for it (ADR 0109 amendment). False when
 * nothing is registered to ask with: the call then fails with the server's `step_up_required`, as it would without.
 */
export function requestStepUp(): Promise<boolean> {
  if (!handler) return Promise.resolve(false);
  pending ??= handler().finally(() => {
    pending = null;
  });
  return pending;
}
