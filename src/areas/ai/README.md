# The `ai` area: AbpAi's screens

The admin screens of [AbpAi](https://github.com/tekthar/abp-ai)'s model gateway: models, aliases, what each scope may
use, limits, usage, a quick call through an alias, and exports. They call **AbpAi.HttpApi 0.8.0** or later (the scope's
view and the quick call are 0.8.0's; a 0.7.0 server answers them 404). The types in `api.d.ts` come from that
version's document, `docs/openapi/abpai.json` in abp-ai, with
`openapi-typescript docs/openapi/abpai.json --output src/areas/ai/api.d.ts`.

## What the host gives

- `paths.ai`: where it serves AbpAi.HttpApi (`AiHttpOptions.RoutePrefix`), such as `/api/platform/ai` or `/api/ask/ai`.
- `scopes`: its scopes (projects, departments). `search` fills the access list and pickers; `name` names the ids in
  usage, limits and access.
- `names`: people's names for the usage rows and calls the server doesn't name (AbpAi 0.8.0 names them through the
  host's `IAiAccounts.NamesOfAsync`).
- `can(right, scopeId?)`: the rights below.
- Words: any key in `texts/en.json` through `AbpHost.texts.ai`. The defaults call a scope a "project"; a host whose
  scopes are something else says so there.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `ai.site.admin` | administers the site's AI | the site page, the site's aliases, limits, access, usage and exports |
| `ai.scope.admin` (with `scopeId`) | administers that scope's AI | the scope page's aliases, its models while it may connect |
| `ai.connections.edit` (with `scopeId` for a scope's) | may change connections and their models here | for AbpAi.HttpApi 0.7.0 only, which doesn't say whether the host keeps the connections: false hides the models' Edit and Find models buttons |

They only shape what's shown; AbpAi.HttpApi's answers decide.

**Who keeps the connections** is the host's, not a person's: when the site's settings say `connectionsKeptByHost`
(AbpAi 0.8.0), the screens follow it; with 0.7.0 they ask `can('ai.connections.edit')`. Where the host keeps them
(its own `IAiConnectionSource`), the screens list them and their models but don't change them.

## Slots

| Slot | Context | For |
|---|---|---|
| `ai.models.edit` | `{ connectionId, modelId, scopeId, onSaved }` | each model row where the host keeps the connections: the host's own way to edit it |
| `ai.models.actions` | `{ scopeId, onChanged }` | the models panel's actions where the host keeps the connections (its own "find models") |
| `ai.models.can` | `{ connectionId, modelId, scopeId }` | what a model can do, where the host keeps the connections and has its own record of it (a gateway that's told every model takes everything). **Temporary:** it goes once AbpAi reports a host's own record of what its models can do (0.8.0 doesn't yet) |
| `ai.access.cell` | `{ scopeId }` | a column of the host's in the access list, headed by the `ownSkills` text (override it) |
| `ai.access.editor` | `{ scopeId, register }` | more settings in a scope's access dialog: `register(save)` (`useSlotSaves`) adds a save the dialog runs after its own on Save |

A scope's screen reads the scope's view (`scopes/{id}/view`), which a scope's admin may: the models open to it from the
site and the scopes above, the aliases and limits it gets from them, whether it may connect its own, and whether the
host keeps the connections. Usage's latest calls name the person an agent acted for first, the agent beside them.

## Pages

`aiPages(options)` gives `SettingsPage` entries a host files under its sections: **AI models and usage** (`ai.admin`),
the site's whole AI page in tabs. That default title is English: a host passes `title` (and `about`) in its language. `AiScopeScreen` is a scope's AI (its access, models, aliases, limits and usage) for a
host's own scope settings page.

## Exports

`AiAdmin`, `AiScopeScreen`, the panels (`ModelsPanel`, `AliasesPanel`, `AccessPanel`, `LimitsEditor`, `UsagePanel`,
`ExportsPanel`), `useAiTexts`, and the API's types (`AiTypes`).
