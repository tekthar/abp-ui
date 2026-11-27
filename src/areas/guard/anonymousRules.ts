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

/** The roles to choose from: the chosen place's, or every role some place offers, each once, in the order first met. */
export function rolesOffered<R extends OfferedRole>(places: OfferedPlace<R>[], place?: OfferedPlace<R>): R[] {
  const source = place ? place.roles : places.flatMap((p) => p.roles);
  return [...new Map(source.map((r) => [r.id, r])).values()];
}

/** The places to choose from: those that offer the chosen role (all, while none is chosen). */
export function placesOffering<P extends OfferedPlace>(places: P[], roleId: string): P[] {
  return places.filter((p) => !roleId || p.roles.some((r) => r.id === roleId));
}

/** The place still chosen after the role changes: kept when it offers the new role, let go when it doesn't. */
export function placeKept(places: OfferedPlace[], scopeKey: string, roleId: string): string {
  if (!scopeKey) return '';
  const place = places.find((p) => p.scopeKey === scopeKey);
  return place && (!roleId || place.roles.some((r) => r.id === roleId)) ? scopeKey : '';
}
