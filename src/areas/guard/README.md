# The `guard` area: AbpGuard's screens

The admin screens of [AbpGuard](https://github.com/tekthar/abp-guard)'s people and sign-in: accounts (their names,
addresses, second factors, duplicates and merges), groups, directories, sign-up and anonymous access. They call
**AbpGuard.HttpApi 0.7.1** or later (the paged lists are 0.6.0's, passkeys and the strong step-up 0.7.0's, the step-up's
app code alone 0.7.1's). From **0.8.2** an account's detail says what the person looking may do to it (`can`); against an
older server the account page falls back to `guard.site.admin`.

The types in `api.d.ts` are generated from abp-guard's own document (`docs/openapi/abpguard.json`, every feature on) with
`openapi-typescript`:

```bash
npx openapi-typescript@7.10.1 ../abp-guard/docs/openapi/abpguard.json -o src/areas/guard/api.d.ts
```

**Still to come:** a person's own second factors and passkeys (the `/me` screens).

## What the host gives

- `paths.guard`: where it serves AbpGuard.HttpApi, such as `/api/guard`.
- `can(right)`: the rights below.
- `me`: the person signed in, so they aren't offered a reset of their own second factor.
- `languages`: the site's languages, for names by language (a person's, a group's, a directory's).
- Words: any key in `texts/en.json` through `AbpHost.texts.guard`. A merge's parts and counts from the host's own modules
  are the host's words: `merge.part.{key}` and `merge.count.{key}` (dots as underscores: `records.reporter` is
  `merge.count.records_reporter`); without them, a part shows its key and a count its label.
- Where its pages open, for the links between them: `routes` on the screens, `guardRoutes(base)` by default
  (`/admin/accounts`, `/admin/accounts/{id}`, `/admin/accounts/{id}/merge`, `/admin/groups`, `/admin/groups/{id}`,
  `/admin/directories`, `/admin/directories/{id}`).
- Its own rows for the lists, if it has a richer list: `source` on `AccountsScreen` and `GroupsScreen` (a `ListSource`);
  AbpGuard.HttpApi's `/accounts/page` and `/groups/page` by default.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `guard.site.admin` | administers people and sign-in | directories, groups, sign-up, anonymous access; creating accounts; accounts that share an address |

What a person may do to one account (change it, lock or unlock it, merge it, reset its second factor) is the server's
answer on the account itself, `can` (0.8.2), which covers a helpdesk scoped to one directory. The rights only shape
what's shown; AbpGuard.HttpApi's answers decide (a change to someone's account is a strong step-up from 0.7.0, asked by
the foundation's step-up dialog).

## Slots

| Slot | Context | For |
|---|---|---|
| `guard.account.actions` | `{ account, detail, reload }` | the host's buttons in an account's header (a data export, an erasure) |
| `guard.account.notices` | `{ account, detail, reload }` | the host's notices above an account's panels (an erased person's) |
| `guard.account.panels` | `{ account, detail, reload }` | the host's panels below an account's addresses |
| `guard.directory.panel` | `{ directoryId, directoryType }` | panels for a directory of a type, below its settings (a connector's own) |
| `guard.directory.presets` | `{ type, apply }` | a way to fill a directory's connection settings from a preset: `apply(settings)` sets them |

`detail.can.erase` and `detail.can.exportData` say whether the person looking may erase the account or export its data.

## Pages and screens

| Screen | Props | Page |
|---|---|---|
| `AccountsScreen` | `routes`, `source` | the accounts, searched, filtered by status, sorted, a page at a time; creating an internal account; `DuplicatesPanel` |
| `AccountScreen` | `id`, `routes` | an account: name, addresses, second factor, identities, groups, merges; lock, unlock, merge |
| `MergeScreen` | `id`, `into`, `routes` | merging an account into another: what moves first, then the merge |
| `GroupsScreen` | `routes`, `source` | the groups, searched, filtered by directory and kind; creating a group or an organization |
| `GroupScreen` | `id`, `routes` | a group: names, members, parents, nested groups (`GroupTree`), second factor, organization, everyone in it |
| `DirectoriesScreen` | `routes` | the directories in order: adding, reordering, syncing |
| `DirectoryScreen` | `id`, `routes` | a directory: its settings, a connection test and a test sign-in, syncs |
| `SignUpScreen` | | sign-up's settings |
| `AnonymousScreen` | `roleName` | what anonymous visitors are given; `roleName` names a role the host ships in the reader's language |

The panels the pages are made of are exported too, for a host's own pages: `AccountEmailsPanel` (`base` is `/accounts/{id}`
for an admin or `/me` for the person), `AccountNameEditor`, `AccountSecondFactorPanel`, `MergesPanel`, `GroupTree`,
`GroupTwoFactorPanel`, `DirectoryForm`.

## Exports

The screens and panels above, `guardRoutes`, `useAccountCan`, `useWrittenName`, `useGuardTexts`, and the API's types
(`GuardTypes`).
