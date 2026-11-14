# Changelog

## Unreleased (0.2.0)

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
