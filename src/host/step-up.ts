/**
 * What the server asked for (AbpGuard 0.7.0, ADR 0110 in the application it came from): a step-up at a level, with the
 * person's ways best first, or a strong factor they don't have yet. Older servers send no level: the password level.
 */
export interface StepUpNeed {
  /** `step_up_required`, or `strong_factor_required` when a strong step-up is asked of someone with no strong factor. */
  code: string;
  /** `password` (the password, with a code of a second factor when the person has one) or `strong` (a passkey, or the password and an authenticator code). */
  level: 'password' | 'strong';
  category: string | null;
  /** The person's ways at that level, best first: `passkey`, `app`, `password`, `email`… Empty when the server doesn't say. */
  methods: string[];
  /** An authenticator code alone passes (the operator's setting, AbpGuard's `appCodeAlone`); else it goes with the password. */
  appCodeAlone: boolean;
}

/** What asks the person to confirm who they are: true once confirmed (or a strong factor set up), false if they gave up. */
export type StepUpHandler = (need: StepUpNeed) => Promise<boolean>;

let handler: StepUpHandler | null = null;
let pending: Promise<boolean> | null = null;

/** The step-up dialog registers itself here (`StepUpDialog`, drawn by `AbpProvider`); null when it goes. */
export function setStepUpHandler(next: StepUpHandler | null) {
  handler = next;
}

/** The need an error carries: its code, and the level and methods in its data. */
export function stepUpNeedOf(code: string, data: Record<string, unknown> | null | undefined): StepUpNeed {
  const level = code === 'strong_factor_required' || data?.level === 'strong' ? 'strong' : 'password';
  const methods = Array.isArray(data?.methods) ? (data.methods as unknown[]).filter((m): m is string => typeof m === 'string') : [];
  return { code, level, category: typeof data?.category === 'string' ? data.category : null, methods, appCodeAlone: data?.appCodeAlone === true };
}

/**
 * Asks the person to confirm who they are, once however many calls are waiting for it (ADR 0109 amendment). False when
 * nothing is registered to ask with: the call then fails with the server's refusal, as it would without.
 */
export function requestStepUp(need: StepUpNeed = { code: 'step_up_required', level: 'password', category: null, methods: [], appCodeAlone: false }): Promise<boolean> {
  if (!handler) return Promise.resolve(false);
  pending ??= handler(need).finally(() => {
    pending = null;
  });
  return pending;
}
