# The screens' areas

Each folder here is one server package's screens: `ai` (AbpAi.HttpApi), `guard` (AbpGuard.HttpApi), `agent`
(AbpAgent.HttpApi), `languages` (AbpLanguages.HttpApi). Each builds to its own entry (`@abpjs/ui/ai`) and, once complete, moves into its own package
(`@abpjs/ai`) with the same exports: only the import path changes. `tests/areas-boundary.test.mjs` keeps that true.

## An area's rules

- **Imports:** `@abpjs/ui` and `@abpjs/ui/rules`, the area's own files, and npm packages. Never another area, the design
  system's internal paths, `next/*`, or a host's code.
- **Calls:** through the host, never `fetch`: `useApiQuery('<area>', path)`, `useApiAction()`, `useApiDownload('<area>')`,
  or `useAreaRequest('<area>')` for anything else. Paths are relative to the area's base path, which the host gives
  (`AbpHost.paths`), since hosts mount the packages differently.
- **Types:** generated from the server package's OpenAPI into the area (`api.d.ts`); the README names the version.
- **Words:** `texts/en.json` and `texts/ar.json` (flat keys, ICU plurals and choices), read through
  `createAreaTexts('<area>', { en, ar })`. A host overrides any key (`AbpHost.texts`). Carried over from a host
  unchanged: the Arabic is reviewed.
- **Rights:** named in the package's own terms (`ai.site.admin`, `ai.scope.admin`), listed in the README, and asked with
  `useCan()(right, scopeId?)`. They only shape menus and buttons; the server's 403 decides.
- **Scopes and people:** a screen about one scope takes its `scopeId`; pickers use `AbpHost.scopes`; names a row lacks
  come from `useNames`.
- **What stays the host's:** a named place, `<HostSlot name="<area>.<page>.<place>" context={...} />`, listed in the
  README with its context. Inside a dialog, a slot joins the dialog's one Save through `useSlotSaves()`:
  pass its `register` in the slot's context, save the area's own part, then `await run()`. A host's capability the
  server reports (AbpAi 0.8.0's host-kept connections) is read from the server; a right stands in only for servers that
  don't report it yet.
- **Scopes in lists:** `scopes.search('')` gives every scope the host will list (it may cap them); scopes the server
  knows that the host didn't list are named through `scopes.name` and shown too.
- **Pages:** exported as `SettingsPage` entries (section, weight, `visible`, `component`), default titles specific
  ("AI models"), so a host files them under its own sections.
- **Tests and checks:** every `data-testid` a host's checks select on is kept.

## An area's files

```
src/areas/<area>/
  index.ts        the area's exports: pages, screens, hooks, types
  README.md       its server package and version, rights, slots, pages
  api.d.ts        types from the server package's OpenAPI
  texts/en.json
  texts/ar.json
  …               its screens and parts
```

And `package.json`: `"./<area>": { "types": "./dist/<area>.d.ts", "import": "./dist/<area>.js" }`.
