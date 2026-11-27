// Anonymous access's choosing rules, apart from the screen so node's tests can reach them
// (tests/anonymous-rules.test.mjs).

/** A role a place offers anonymous visitors (AbpGuard's AnonymousRoleDto, as far as choosing needs it). */
export interface OfferedRole {
  id: string;
}

/** A place where anonymous visitors may get a role, with the roles it offers (AnonymousPlaceDto). */
export interface OfferedPlace<R extends OfferedRole = OfferedRole> {
  scopeKey: string;
  roles: R[];
}

/** Role-and-place pairs anonymous visitors have already: given again, the server answers with the same grant. */
export type Taken = ReadonlySet<string>;

/** A pair's key in `Taken`. */
export function takenKey(roleId: string, scopeKey: string): string {
  return `${roleId}\u0000${scopeKey}`;
}

/** The pairs of these grants (AnonymousGrantDto's role id and scope key), leaving one out (the grant being changed). */
export function takenBy(grants: readonly { id: string; roleId?: string | null; scopeKey?: string | null }[], except?: string): Taken {
  return new Set(grants.filter((g) => g.id !== except && g.roleId && g.scopeKey).map((g) => takenKey(g.roleId!, g.scopeKey!)));
}

/**
 * The roles to choose from: the chosen place's, or every role some place offers, each once, in the order first met.
 * A role already given there (in every place it's offered, when no place is chosen) isn't offered again.
 */
export function rolesOffered<R extends OfferedRole>(places: OfferedPlace<R>[], place?: OfferedPlace<R>, taken: Taken = new Set()): R[] {
  const pairs = (place ? [place] : places).flatMap((p) => p.roles.map((r) => [r, p.scopeKey] as const));
  const free = pairs.filter(([r, scopeKey]) => !taken.has(takenKey(r.id, scopeKey))).map(([r]) => r);
  return [...new Map(free.map((r) => [r.id, r])).values()];
}

/**
 * The places to choose from: those that still offer the chosen role (any role, while none is chosen). A place with no
 * roles, or whose roles are all given already, isn't offered: choosing it would leave nothing to choose.
 */
export function placesOffering<P extends OfferedPlace>(places: P[], roleId: string, taken: Taken = new Set()): P[] {
  return places.filter((p) => p.roles.some((r) => (!roleId || r.id === roleId) && !taken.has(takenKey(r.id, p.scopeKey))));
}

/** The place still chosen after the role changes: kept when it still offers the new role, let go when it doesn't. */
export function placeKept(places: OfferedPlace[], scopeKey: string, roleId: string, taken: Taken = new Set()): string {
  if (!scopeKey) return '';
  const place = places.find((p) => p.scopeKey === scopeKey);
  if (!place) return '';
  if (!roleId) return scopeKey;
  return place.roles.some((r) => r.id === roleId) && !taken.has(takenKey(roleId, scopeKey)) ? scopeKey : '';
}
