# The `storage` area: AbpCluster.Storage's screen

Where the site keeps its files, on **AbpCluster.Storage.HttpApi 0.6.0** or later (abp-cluster): the provider in use and
its place (a folder, a bucket, a container, never a key), what's kept there, a test of each store (a file written, read
back and deleted, with the time it took and the storage's own reason when it fails), and, while a previous storage is
being left, the copy from it with its progress and the first problems. Storage is set in the server's configuration, so
nothing here changes where files go.

The types in `api.d.ts` are generated with `openapi-typescript` from AbpCluster.Storage.HttpApi's routes and schemas as
a host's OpenAPI document has them (at the default prefix, `api/storage`):

```bash
npx openapi-typescript@7.10.1 abpcluster-storage.json -o src/areas/storage/api.d.ts
```

## What the host gives

- `paths.storage`: where it serves AbpCluster.Storage.HttpApi (`StorageHttpOptions.RoutePrefix`), such as `/api/storage`,
  or the host's own prefix.
- `can('storage.site.admin')`, for `storagePages`' default `visible` when the host is passed.
- Its step-up, through its request (`createHostRequest` does it by default): starting the copy is the one sensitive
  action (`StorageSensitiveAttribute`), which a host may guard with one (AbpGuard's `backups` category), and its 403
  `step_up_required` goes through the host's dialog and is sent again.
- `onChanged` (on `storagePages`, or on the screen): called after a copy is started and when a running copy ends.
- Store names: a store is named by the words `storeNames.<store>` (`AbpHost.texts.storage`), or by `storeName(store)`,
  else by its key. The area names none: the stores are the host's (`ClusterStorageOptions.Stores`).
- Words: any key in `texts/en.json` through `AbpHost.texts.storage`. `copyHint` names the configuration section
  `Storage`; a host that uses another (`ClusterStorageOptions.Section`) says so there.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `storage.site.admin` | sees and tests the site's storage, and starts the copy | `storagePages`' default `visible` |

It only shapes what's shown; AbpCluster.Storage.HttpApi decides (`StorageHttpOptions.Policy`, or the host's
`IStorageRights`), and refuses everyone when the host names neither.

## Slots

| Slot | Context | For |
|---|---|---|
| `storage.page.actions` | none | the host's own links in the page's header (its backups, a deployment guide) |

## Pages and screens

`storagePages(options)` gives the `SettingsPage` entry a host files under its sections: **Storage** (`storage.admin`) at
`href`, drawn by the host's catch-all route. That default title is English: a host passes `title` (and `about`) in its
language.

- `StorageScreen` (`onChanged`, `storeName`): the page. A running copy is read again every second until it ends.

`data-testid`s kept for a host's checks: `storage-where` (where files are kept), `storage-test` (the test's results) and
`storage-copy` (the copy).
