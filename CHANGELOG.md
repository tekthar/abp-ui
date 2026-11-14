# Changelog

## 0.2.0-next.4

A prerelease under npm's `next` tag, for a host's scope page on the `ai` area.

- ai: `ai.models.can`'s context names the scope too (`scopeId`), so a host that keeps the connections reads that
  scope's own record of what its models can do on a scope's screen.
- ai: `AiScopeScreen` takes the host's page `header`, drawn first in its own column, so a host's page keeps one column.

## 0.2.0-next.3

A prerelease under npm's `next` tag. The `ai` area now needs **AbpAi.HttpApi 0.8.0** on the server: stay on next.2
until the server moves.

- Area requests stay the same across host objects: `useAreaRequest`, `useAreaEvents` and `useNames` read the host
  through a ref, so a host built afresh on each render no longer makes every query ask again (a tab switch included).
- `readAbpError` reads a refusal at the top level (`{ code, message, ... }`, AbpAi's 422s) with the rest as its data,
  instead of showing the status.
- `AppShell` on a phone: the drawer shows the place's card (name, detail, link) and the sidebar's `top` between the
  site's pages and the place's, as the sidebar does, instead of only the place's name as a heading. The drawer is
  named for screen readers (`labels.navigation`).
- `StepUpDialog`: its explanation fits any protected action ("This action is protected…"), not only rights and secrets.
- **ai on AbpAi.HttpApi 0.8.0** (its minimum now): a scope's screen reads the scope's view, so a scope's admin sees
  the models open to it and the aliases and limits from above; the quick call through an alias is the area's own
  (`TryPanel`, `POST try`), so the `ai.try` slot goes; whether the host keeps the connections comes from the server
  (`connectionsKeptByHost`), the host's right only for a server that doesn't say; usage names people as the server
  does, and a call an agent made for someone shows that person first, the agent beside them; the Projects tab asks each
  scope's limits once.

## 0.2.0-next.2

A prerelease under npm's `next` tag.

- `StepUpDialog`: the password again before a sensitive action, plus a code when the person has a second factor (their
  app, a recovery code, or one the site sends), on AbpGuard's `session/step-up` and `me/second-factors`. `AbpProvider`
  draws it when the host gives `paths.guard`. A host with its own dialog sets `stepUpDialog: false`. Its English and
  Arabic texts can be overridden through `AbpHost.texts.stepUp`.
- `createHostRequest` asks that dialog by default (`requestStepUp`, once however many calls wait). With no dialog, the
  call fails as the server answered. `setStepUpHandler` lets a host register its own.
- `ai`: a model priced 0 in and 0 out reads as "No price" (AbpAi's prices aren't nullable, and the calls are free
  either way). A new slot, `ai.models.can` `{ connectionId, modelId }`, lets a host that keeps the connections say
  what each model can do. It is temporary, until AbpAi 0.8.0.

## 0.2.0-next.1

A prerelease under npm's `next` tag: the foundation and the first area, `ai`. More areas (`guard`, `agent`) follow in
later prereleases before 0.2.0.

The foundation for the screens (ADR 0109's amendment in the application it came from): areas under `src/areas`, each
its own entry, moving to its own package later by import path alone.

- The host contract: `AbpProvider`'s `host` (`AbpHost`): the host's `request`, a base path per package, `navigate`,
  `can(right, scopeId?)`, scopes, people's names, languages, text overrides and slots. `createHostRequest` for a host
  without its own (anti-forgery cookie and header, a 401 handed back, one retry after a step-up, files with their names).
- `useApiQuery`, `useApiAction`, `useApiDownload`, `useAreaRequest`, `useCan`, `useNavigate`, `useNames`,
  `useHostLanguages`, `HostSlot`; `AbpApiError` reads ABP's error shape.
- `createHostEvents` and `useAreaEvents`: server-sent events resumed from the last id, a refusal thrown before the
  stream; optional, so a host without it gets screens that ask again. `me` and `useMe` for the person signed in.
- `createAreaTexts` and `formatMessage`: an area's English and Arabic texts with plurals and choices, overridable by
  the host.
- `FormDialog`, with the labels `formRequired` and `formFix`.
- `tests/areas-boundary.test.mjs` keeps each area to its boundary; prereleases publish under npm's `next` tag.
- **`@abpjs/ui/ai`**, AbpAi's screens on AbpAi.HttpApi 0.7.0 (`src/areas/ai`): the site's AI page in tabs (models,
  aliases, each scope's access, limits, usage, exports) as `aiPages` and `AiAdmin`, a scope's AI as `AiScopeScreen`,
  and their panels. Types from AbpAi's OpenAPI document; rights, slots and pages in its README.

## 0.1.0

The design system as a package of its own (ADR 0109 in the application it came from).

- `createAbpSystem({ prefix, brand, config })` and `abpConfig`: the host's CSS variable prefix and colours on the
  design system's tokens and recipes; the package's own neutral colours and the `abp` prefix when none are given.
- `AbpProvider` with the host's system, locale and direction, labels, link component, colour mode, motion setting,
  time zone, confirm dialogs and the toaster.
- Components: the app shell, panels, tables (grouping, two levels, row drag), queryable lists with filters, grouping
  and pagination, boards, timelines and cards, calendars, dashboards, charts, forms, pickers, the command search,
  skeletons and motion.
- Settings areas: `settingsArea`, `findSettingsPage`, `SettingsLayout`, and the `SettingsPage` and `SettingsSection` types.
- `@abpjs/ui/rules`: query conditions, grouping, the breadcrumb fold and the settings order, with no React.
- Peers: React 19, Chakra UI 3.38 or later.
