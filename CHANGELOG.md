# Changelog

## 0.2.0-next.23

A prerelease under npm's `next` tag.

- `Pagination` takes a `form`. `simple` reads as which rows of how many ("26–50 of 112"), then previous and next.
  `numbered` shows the pages, as before, and `compact` shows "Page 3 of 200" between the arrows (`queryList.pageOf`).
  The simple form draws the range from a new `range` prop, and the compact form takes a new `pageOf` prop.
  `pagesShown` and `PaginationForm` are exported.
- `QueryableList` (`pagination`) and `ListFooter` (`form`) default to `simple`, centred under the list: people narrow a
  long list with search and filters rather than jump to a page. A list that wants its pages says `numbered`.

## 0.2.0-next.22

A prerelease under npm's `next` tag.

- guard: AbpGuard.HttpApi 0.8.3 is the minimum. An account's actions follow its `can` alone (no `guard.site.admin`
  fallback), sign-up's directories come only from its settings (no `/directories` call), and `isSystemGroup` reads
  `system` alone.

## 0.2.0-next.21

A prerelease under npm's `next` tag.

- agent: the default texts name no host's things: a scope is a "project", as in `ai`, and what a run or a note is about
  is an "item". A host with other words gives them through `AbpHost.texts.agent`. 17 texts the area never used are gone.

## 0.2.0-next.20

A prerelease under npm's `next` tag.

- guard: `guardPages` weighs its pages so the menu reads accounts, groups, directories, sign-up, anonymous access
  (settings sort heavier first); next.19 read them the other way round.

## 0.2.0-next.19

A prerelease under npm's `next` tag.

- guard: `guardPages(options)`, the five `SettingsPage` entries (accounts, groups, directories, sign-up, anonymous
  access) on a base path, each drawing its list or item from the catch-all's path; `directories: false` for a server
  with Guard's directories off. Sign-up reads its directories from its settings (AbpGuard 0.8.3; `/directories` before
  it), and `directoriesPage` drops the hint about a page the host doesn't have. No Delete on the system groups
  (`isSystemGroup`). A merge's `?into=` is read so the server and the browser render it alike.

## 0.2.0-next.18

A prerelease under npm's `next` tag.

- `AbpProvider`'s `useServerInsertedHTML`: a framework's hook for HTML in the page's head while it streams (Next's).
  With it, Emotion's styles go to the head on the server (`EmotionRegistry`), so the first render hydrates without a
  mismatch where Chakra's global styles met next-themes' script. Without it, nothing changes. `@emotion/cache` is a
  dependency.
- `AbpLabelsInput`, what `AbpProvider`'s `labels` takes: any label, and any of a group's (`queryList`,
  `translations`, `picker`), the rest the defaults, so a group the package adds needs nothing from a host that doesn't
  use it.

## 0.2.0-next.17

A prerelease under npm's `next` tag.

- guard: a second slot in an account's header, `guard.account.actions.end` (`{ account, detail, reload }`), after the
  area's merge and lock, so a host's destructive action (an erasure) stays last.

## 0.2.0-next.16

A prerelease under npm's `next` tag.

- guard: `CreateAccountPanel` and `CreateGroupPanel` exported, for a host that keeps its own accounts or groups list
  (saved views, column choice) and takes the rest of the area.

## 0.2.0-next.15

A prerelease under npm's `next` tag.

- guard: a person's own second factors (`MySecondFactorsPanel`): passkeys added, renamed and removed, the authenticator
  app set up, factors removed, new recovery codes; the step-ups through the foundation's dialog. `StrongFactorBanner`
  for a site admin's strong-factor deadline, from the host's `me`. A host names its own code senders through
  `secondFactor.sender.{method}`. The area uses the foundation's `ListFooter` and `useSettledValue`.

## 0.2.0-next.14

A prerelease under npm's `next` tag: the third area, `guard`.

- **`@abpjs/ui/guard`** on AbpGuard.HttpApi 0.7.1: accounts (searched, filtered and sorted a page at a time; an
  account's name, addresses, second factor, identities, groups and merges; lock, unlock, merge with its preview),
  accounts that share an address, groups (names by language, members, parents, nested groups, second factor,
  organizations), directories (their order, settings, connection and sign-in tests, syncs), sign-up and anonymous
  access. Right `guard.site.admin`; an account's own actions follow its `can` (AbpGuard 0.8.2), the right until then.
  Slots: `guard.account.actions`, `guard.account.notices`, `guard.account.panels`, `guard.directory.panel`,
  `guard.directory.presets`. Types from abp-guard's own document. A person's own second factors and passkeys come later.
- `ListFooter({ list })`: a paged list's pages and its "26–50 of 112", in the `queryList` labels.
- `useSettledValue(value, ms)`: a value once it has stood still (what's typed, before a search).

## 0.2.0-next.13

A prerelease under npm's `next` tag: pickers and names by language, for the `guard` area and the hosts.

- `SearchPicker`: one item picked from a searchable list (an ARIA combobox): a search as the person types, items
  already known, an empty choice, making one from the text typed, every match bold (`Highlight`). `PersonPicker` (name
  and @username, a `badge` for an agent's account) and `GroupPicker` take their `search` from the area or the host.
  Their words are the labels' new `picker` group.
- `TranslatedInput`: a name in every language the host offers (`AbpHost.languages`, which gains `englishName`), the
  reader's inline and the others behind a button counting them, each typed in its direction. Where the host has
  `suggestNames(text, signal)` (`NameSuggestion`), names already translated are offered while typing. Its words are the
  labels' new `translations` group.
- `@abpjs/ui/rules`: `toNamesValue(name, names, written)` and `fromNamesValue(value, written)` between a written name
  with its other languages and the one map `TranslatedInput` edits.

## 0.2.0-next.12

A prerelease under npm's `next` tag: lists served a page at a time.

- `useListState(source)`: a list's page, page size, sort, search (asked once typing settles) and filters, from a
  `ListSource` (`{ key, load(query, signal) }`); a change goes back to the first page, only the latest answer counts,
  and the previous rows stay while the next page comes (`refreshing`). `table` and `pagination` are the props for
  `DataTable` (manual sort) and `Pagination`; `onQueryChange` for a screen that keeps the list's place in its address.
- `abpListSource(request, path, options)` and `useAreaListSource(area, path, options)`: a list in ABP's shape
  (`skipCount`, `maxResultCount`, `sorting`, `filter` in; `{ totalCount, items }` out), with `abpListParams`. A host
  gives an area its own source (a query engine, saved views) in place of the package's.

## 0.2.0-next.11

A prerelease under npm's `next` tag: the first of the `guard` area's building blocks.

- `@abpjs/ui/rules`: names by language (`Names`, `languageChain(locale, default)`, `pickName(chain, names, fallback)`)
  and `splitList` (a comma- or line-separated list, trimmed).

## 0.2.0-next.10

A prerelease under npm's `next` tag.

- ai: a scope's page (`AiScopeScreen`) no longer shows a named account's or group's limit (an agent's own, say) as
  the site's or the scope's: those are counted on one line ("3 accounts and groups have limits of their own."), and a
  person's default reads "Cost per day for each person: 1". `namedLimit` tells them apart.

## 0.2.0-next.9

A prerelease under npm's `next` tag, from moving the first host's agent pages onto `agent` with no visible change.

- agent: a slot `agent.names` (`{ label, value, onChange, placeholder, fallback, kind }`) for a host's own field for
  names by language; `ToolGroupsProvider` (`ToolGroupOf`) for the host's own groups of tools (its skills, an outside
  server's tools), after the host's and plugins' and before the sandbox's; `agent.tools.extra` gets `listed` and
  `loading`.
- agent: a read-only opt-in tool is Off/On; `AgentEditor variant="scope"` (a scope's own agent, its settings alone),
  used by `ScopeAgentsScreen`; a scope's key in the agents list sits at the cell's start in right-to-left pages, and
  `ItemLink` keeps the page's direction when it wraps words (a bare key stays left to right).

## 0.2.0-next.8

A prerelease under npm's `next` tag: the third area, `agent`.

- **`@abpjs/ui/agent`** on AbpAgent.HttpApi 0.6.1: the site's switch and agents (`agentPages`, `AgentsAdmin`), a scope's
  own agents (`ScopeAgentsScreen`), one agent's settings (form, tools, run limits, memories, its graph), standing
  permissions, an item's runs and their questions, the questions waiting for the person, and the chat beside any page
  (`AgentChatProvider`, `AgentChatPanel`, `useAgentChat().open(...)`), live through the host's events or polling every
  2 s. Rights `agent.site.admin`, `agent.scope.admin`. Slots for what stays the host's: `agent.markdown`,
  `agent.run.actions`, `agent.picture`, `agent.connections`, `agent.tools.extra`, `agent.limits.extra`,
  `agent.switch.extra`. Items open where the host says (`itemHref`, `ItemHrefProvider`). The graph uses React Flow
  (`@xyflow/react`, `@dagrejs/dagre`): a host that shows it imports `@xyflow/react/dist/style.css` once.

## 0.2.0-next.7

A prerelease under npm's `next` tag.

- Exports the passkey helpers next.5 described and didn't export: `createPasskey`, `getPasskey`, `passkeysSupported`.

## 0.2.0-next.6

A prerelease under npm's `next` tag.

- `StepUpDialog`: an authenticator code alone where the server lets one pass (`appCodeAlone` in `step_up_required`'s
  data, the operator's setting): the strong level asks for the code alone (a passkey still first when the person has
  one), and the password level offers it instead of the password. Without the field, a code goes with the password, as
  before. `StepUpNeed.appCodeAlone`.

## 0.2.0-next.5

A prerelease under npm's `next` tag: the step-up dialog for AbpGuard 0.7.0's strong step-up and passkeys. Against an
older AbpGuard nothing changes (no level means the password level).

- `StepUpDialog` reads the level the server asks for (`step_up_required` with `level`, `methods`). At `strong`, it
  offers a passkey first when the person has one, or the password with an authenticator code. Asked of someone with no
  strong factor (`strong_factor_required`), it takes the password, then sets up a passkey or the app (QR and key) right
  there, with the recovery codes shown once for a first factor; the call then asks again and they confirm with it.
- Passkeys in the browser's own JSON both ways (`createPasskey`, `getPasskey`, `passkeysSupported`), with a base64url
  fallback for browsers without `PublicKeyCredential.parse*FromJSON`.
- `requestStepUp(need)` and `StepUpHandler` take the server's need (`StepUpNeed`, `stepUpNeedOf`). `createHostRequest`
  and `createHostEvents` pass it on and ask again when the server asks for more (a factor set up, then the strong step-up),
  up to three times. `HostRequestInit.stepUp: false` throws a step-up refusal instead of asking (the dialog's own calls).
  `needsStepUp` and `STRONG_FACTOR_REQUIRED` beside `isStepUp`.
- `createHostEvents` asks the step-up dialog by default, as `createHostRequest` does.

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
