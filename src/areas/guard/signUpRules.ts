// Sign-up's form rules, apart from the screen so node's tests can reach them (tests/sign-up-rules.test.mjs).

/** What the Sign-up page edits: whether it's on, the directory new accounts go to, and the allowed email domains. */
export interface SignUpForm {
  enabled: boolean;
  directoryId: string;
  domains: string[];
}

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/** A domain as typed ("@Acme.com. ") as it's kept ("acme.com"), or null when it isn't one. */
export function normalDomain(typed: string): string | null {
  const d = typed.trim().replace(/^@/, '').replace(/\.$/, '').toLowerCase();
  return DOMAIN.test(d) ? d : null;
}

/** How many changes the form holds over what's saved: the switch, the directory, and each domain added or taken out. */
export function signUpChanges(saved: SignUpForm, form: SignUpForm): number {
  const was = new Set(saved.domains);
  const now = new Set(form.domains);
  return (
    Number(saved.enabled !== form.enabled) +
    Number(saved.directoryId !== form.directoryId) +
    form.domains.filter((d) => !was.has(d)).length +
    saved.domains.filter((d) => !now.has(d)).length
  );
}
