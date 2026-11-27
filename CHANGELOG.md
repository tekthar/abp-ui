# Changelog

## Unreleased

- guard › Directories, the design canvas's board:
  - **New directory**, and a directory's name, open a wide `FormDialog` beside a preview: the name, the type, how often
    it syncs ("On request only" when empty), and whether it's active and lets people sign in. A connector's settings
    come once its type is chosen. Editing keeps the type, and **Delete directory** is the red link at the footer's start.
  - A row's menu edits the directory, opens its page (sync runs, connection tests, everything else), syncs it now
    (off for a type that doesn't sync), moves it up or down in priority, turns it off or on, or deletes it.
  - Priority counts from 1. The internal type is named in the area's words, and a type that doesn't sync has no sync
    interval.

  `DirectoryFields` are the directory's fields without a form of their own, shared by the dialog and the directory's
  page (`DirectoryForm`); `compact` gives one column. Active and sign-in are switches. `directoryRules.ts` holds the
  editing start (a stored secret starts empty, so it's kept), which types sync, and moving, tested in
  `tests/directory-rules.test.mjs`. New words in `directories` (`priority`, `internal`, `on`, `off`, `menuLabel`, `edit`,
  `openPage`, `deactivate`, `activate`, `newTitle`, `editTitle`, `deleteDirectory`, `namePreview`, `sync`, `syncEvery`,
  `onRequest`, `savedWithWarnings`) and `directoryForm` (`minutes`, `namePlaceholder`). `add`, `syncInterval`,
  `syncIntervalHint` and `signInEnabled` say it as the canvas does, and `addedWithWarnings` is gone.

## 0.2.0-next.34

A prerelease under npm's `next` tag.

- `EmptyState variant="page"`: on a screen narrower than its drawing (375 px), the drawing is clipped at its faded
  sides instead of pushing the page sideways.
- `FormDialog`: a change that puts a field right (picking in a select, typing the missing value) takes its red border
  and its line in the "Fix these fields" summary away at once, rather than when the field is left. A field still wrong
  keeps them until it's left.
- guard › Anonymous access, the design canvas's board:
  - **Give a role** opens a wide `FormDialog`. The role and the place are chosen from AbpGuard's places
    (`GET /anonymous/places`): a place offers only its own roles, and a role only the places offering it. The preview
    shows anonymous visitors, the role, where, and what the role can do, beside the warning that anyone on the
    internet gets it.
  - The rows show the role as a tag, the place's name and code (as the places list names them), and since when.
  - A row's menu changes the role in one step or removes it.
  - With no roles given, the page is its empty state, with Give a role.
  - A role already given in a place isn't offered there again, and a place with nothing left to give isn't offered.
    Change role saves only a different role.

  `roleDescription` joins `roleName` for a host's own roles. `anonymousRules.ts` holds the choosing, tested in
  `tests/anonymous-rules.test.mjs`. New words: `giveRole`, `dialogTitle`, `changeTitle`, `chooseRole`, `chooseWhere`,
  `warning`, `who`, `can`, `give`, `change`, `given`, `changed`, `emptyTitle`, `emptyText`, `emptyTextNoPlaces`,
  `placeWithCode`, `tableLabel`, `actions`, `menuLabel` and `notListed`. `revoke`, `revokeTitle` and `revoked` now say Remove role, and `empty` is gone.
- `PreviewCard`: an item's `wrap` lets a long value (a description) run to three lines.

## 0.2.0-next.33

A prerelease under npm's `next` tag.

- The `languages` area, `@abpjs/ui/languages`: AbpLanguages' screens on AbpLanguages.HttpApi 0.7.0 (`paths.languages`,
  `languages.site.admin`). `languagesPages` gives Settings one page: the site's languages (direction, fallback, how far
  each is translated; add, edit, turn on or off, make the default, remove) and each language's translation editor
  (every text beside its English source and what ships, filtered by status and catalog, searched, saved from a
  `SaveBar`, exported and imported as a translator's file). `onChanged` lets the host read its languages and texts again
  after a change, without starting the editor afresh; `mainCatalog` and `catalogName` name the catalogs; the
  `languages.list.actions` slot takes the host's own links. Words in English and Arabic.
- `AgentPermissionsPanel` (the design canvas's "Agents you always allow"): one row per agent and scope, with who made
  the agent, its tools together by title, the scope, since when and when last used; Remove takes the whole row back
  after a confirm ("It will ask you again before using these tools"). On the person's page, "Allow an agent" opens a
  dialog: the agent, the scope and "Tools without asking", only those AbpAgent says "Always" could answer for
  (`me/permissions/allowable`), with the ones already given checked. On an agent's page, one row per person. Needs
  AbpAgent.HttpApi 0.7.0. New and changed `permissions.*` agent texts; `permissions.what`, `forAgent`, `byPerson`,
  `given`, `takeBack` and `takeBackTitle` are gone.
- The agent area's types are AbpAgent.HttpApi 0.7.0's (`AgentAllowablePlace`, `AgentAllowableAgent`,
  `AgentAllowableTool`; `AgentPermissionInfo` gains `toolTitle`, `madeBy` and `agentNames`).

## 0.2.0-next.32

A prerelease under npm's `next` tag.

- `QueryableList` export dialog (the design canvas's Export to CSV and Excel): the Export menu's format opens a dialog
  with the rows (what the query finds, or all of them), the columns (those shown picked first), a CSV's separator
  (comma, semicolon or tab) and the first rows as the file will hold them. Export closes it; a toast says the file
  is being prepared, with Cancel, then that it's ready. `onExport(format, options)` gets `QueryExportOptions`
  (`columns`, `all`, `separator`, `signal`). New optional `queryList` labels: `exportTitleCsv`, `exportTitleExcel`,
  `exportRows`, `exportFound`, `exportAll`, `exportColumns`, `exportSeparator`, `exportComma`, `exportSemicolon`,
  `exportTab`, `exportPreview`, `exportRun`, `exportCancel`, `exportPreparing`, `exportReady`.
- `AppShell`: a top-bar item with `children` (a person's starred projects under Projects) gets a chevron beside its
  name that opens them in a menu; the name still opens the page. `childrenTitle` heads the menu ("Starred") and
  `childrenLabel` names the chevron for screen readers. The drawer lists them under the item, as before.
- `Panel` folds. `collapsible` makes its header a button with a chevron before the title (pointing to the end when
  folded, down when open), and the description, the body and the footer fold away while the actions stay and keep
  working.
  `defaultCollapsed`, or `collapsed` with `onCollapsedChange`; `summary` is a line shown in the header while folded
  ("2 groups"), hidden on narrow screens.

## 0.2.0-next.31

A prerelease under npm's `next` tag.

- `SaveBar`: a page edited in place with unsaved changes. A bar on the selected tint floats at the foot of the window,
  centred, with the question, how many changes wait (`count`, or the host's `message`), Discard and Save (`busy`,
  `saveDisabled`). New optional labels: `saveBar`, `unsavedChanges` (ICU plural on `{count}`), `discard`, `save`.
- guard: the types come from AbpGuard 0.9.0's document. The page answers are `GuardPagedResultDto` (`groups` beside
  `items`), and `types.ts` names the people actions' inputs and answers.
- guard › Sign-up, the design canvas's board:
  - the allowed domains are a list, with Add domain and Remove, each checked as a domain and listed once;
  - with sign-up on, the directory is required, and the field says so;
  - the save bar replaces the Save button, and Discard puts back what's saved;
  - a domain typed but not added counts as a change and is added on Save; one that isn't a domain stops the save;
  - never set up, the page is its empty state, with Turn on sign-up.

  Words: `off`, `directoryRequired`, `anyDomain`, `addDomain`, `add`, `removeDomain`, `domainInvalid`, `domainTwice`,
  `emptyTitle`, `emptyText` and `turnOn` are new; `enabled`, `directory` and `domains` say it as the canvas does;
  `domainsHint` and `save` are gone.

## 0.2.0-next.30

A prerelease under npm's `next` tag.

- `ConfirmDialog`: each opening starts with an empty field for `typeToConfirm`, however the last one closed.
- `FormDialog`: `size="wide"` with `preview` and `previewTitle` (the fields beside what they make, under them below
  `md`; the aside is named by its heading), `dangerAction` (a red link at the footer's start that never submits), and
  every Cancel in the `cancel` variant. `PreviewCard` draws what a form makes; `preview` is a new optional label.

## 0.2.0-next.29

A prerelease under npm's `next` tag.

- `RowMenu`: a row's ⋯ menu. It takes items (with an icon, `danger` for red, `disabled`), separators, and a quiet note
  saying who can use the items that are off.
- `Button variant="cancel"`: the one Cancel look, a gray fill a step above the surface in either mode with no border.
  `ConfirmDialog`'s Cancel uses it.
- `ConfirmDialog typeToConfirm`: the confirm turns on only once the person types the given word (a project's key, to
  delete it). Its prompt is `typeToConfirm`, an optional label ("Type {value} to confirm").
- `QueryableList`: `trailingColumn` adds a column after the fields (a row's menu). `cards` with `layout="cards"` draws
  the rows as cards in a grid, with placeholders while loading; filters, sort, saved views and pages work the same.

## 0.2.0-next.28

A prerelease under npm's `next` tag.

- agent: an empty chat list and an empty "mine" list draw `art="agent"`.

## 0.2.0-next.27

A prerelease under npm's `next` tag. (0.2.0-next.26 was tagged but never published: a test list was malformed.)

- `EmptyState variant="page"`: for a page whose whole main content is empty. In place of the icon it draws
  `illustration`, the feature the page is about: `records`, `board`, `views`, `dashboards`, `dashboard`, `reports`,
  `calendar`, `timeline`, `gantt`, `backlog`, `queue`, `comments` or `files`. The drawing is a clear card with softer
  cards either side that fade into the surface. A search that finds nothing (`no-results`, `no-filter-match`) adds a
  small search mark. Errors never get the drawing.
- `EmptyState art`: a small flat drawing in place of the icon, for an empty list in a panel or a settings card:
  `records`, `search`, `done`, `bell`, `handover`, `agent` or `error`.
- `EmptyState layout="inline"`: the drawing, the words and the action on one line, on a quiet surface. The action
  wraps under the words when there's no room.
- The drawings use only the theme's tokens (neutral, accent, amber, green) in light and dark, and are decorative
  (`aria-hidden`). A `no-results` or `no-filter-match` empty state is a polite live region, and an `error` one is an
  alert.
- `PageIllustration`, `EmptyArtDrawing`, `EmptyIllustration` and `EmptyArt` are exported.
- agent: the chat panel spans the page, not the window (its positioner is 100% wide, not 100vw), so the page's
  scrollbar no longer pushes it past the screen's edge.

## 0.2.0-next.25

A prerelease under npm's `next` tag.

- agent: the chat's delete icon is `danger`, red at all times, like every delete (trash) icon.

## 0.2.0-next.24

A prerelease under npm's `next` tag.

- `AddButton`: the one look for every add action inside a page, a panel or a dialog (Add filter, Add condition, Add
  member, a create row). It draws link-coloured bold text after a plus, with no fill, no border and no chevron, and is
  underlined on hover. A page's one main action stays a `primary` Button.
- `IconButton remove`: taking a row out of a list or a form. It is gray at rest and turns red, on a light red fill, only
  on hover. A delete (trash) icon stays `danger`, red at all times.
- `QueryableList`'s Add filter, `FilterBuilder`'s Add condition and ai's Add an alias and Add a limit use `AddButton`.
  Their row icons use `remove`.

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
