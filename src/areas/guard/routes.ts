/**
 * Where the area's pages open on the host, for its links between them (a directory's page from the list, an account's
 * merge from its page). Hosts mount the pages under their own addresses; the default is Administration's `/admin`.
 */
export interface GuardRoutes {
  directories: string;
  directory: (id: string) => string;
  accounts: string;
  account: (id: string) => string;
  accountMerge: (id: string) => string;
  groups: string;
  group: (id: string) => string;
}

/** The area's pages under one base: `{base}/accounts`, `{base}/accounts/{id}`, `{base}/groups/{id}`… */
export function guardRoutes(base = '/admin'): GuardRoutes {
  const root = base.replace(/\/$/, '');
  const one = (kind: string) => (id: string) => `${root}/${kind}/${encodeURIComponent(id)}`;
  return {
    directories: `${root}/directories`,
    directory: one('directories'),
    accounts: `${root}/accounts`,
    account: one('accounts'),
    accountMerge: (id) => `${one('accounts')(id)}/merge`,
    groups: `${root}/groups`,
    group: one('groups'),
  };
}
