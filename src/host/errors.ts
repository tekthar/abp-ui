/**
 * An answer the server refused, in ABP's error shape (`{ error: { code, message, details, validationErrors } }`), or
 * a problem's title, or the status. Read as JSON whatever the content type says, as file routes answer refusals so.
 */
export class AbpApiError extends Error {
  status: number;
  code: string | null;
  details: string | null;
  validationErrors: { message: string; members?: string[] }[];
  /** The error's data, e.g. { start, end } for a query error. */
  data: Record<string, unknown> | null;

  constructor(
    status: number,
    code: string | null,
    message: string,
    details: string | null = null,
    validationErrors: { message: string; members?: string[] }[] = [],
    data: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'AbpApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.validationErrors = validationErrors;
    this.data = data;
  }
}

/** The error for a sensitive action that needs the person to confirm who they are again. */
export const STEP_UP_REQUIRED = 'step_up_required';

export async function readAbpError(res: Response): Promise<AbpApiError> {
  let message = `${res.status} ${res.statusText || 'Request failed'}`;
  try {
    const body = await res.json();
    const e = body?.error;
    if (e) {
      return new AbpApiError(res.status, e.code ?? null, e.message || e.details || message, e.details ?? null, e.validationErrors ?? [], e.data ?? null);
    }
    // A refusal at the top level (AbpAi's 422s: { code, message, limit }): its code and message, the rest as data.
    if (body && typeof body === 'object' && typeof body.message === 'string' && body.message) {
      const { code, message: text, details, ...rest } = body as Record<string, unknown>;
      return new AbpApiError(res.status, typeof code === 'string' ? code : null, text as string, typeof details === 'string' ? details : null, [], Object.keys(rest).length ? rest : null);
    }
    if (typeof body?.title === 'string') message = body.title;
  } catch {
    // Not JSON: the status says it.
  }
  return new AbpApiError(res.status, null, message);
}

/** An error as a person reads it. */
export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const isStepUp = (e: unknown) => e instanceof AbpApiError && e.status === 403 && e.code === STEP_UP_REQUIRED;
