# The `agent` area: AbpAgent's screens

The screens of [AbpAgent](https://github.com/tekthar/abp-agent)'s agents: the site's switch and agents, a scope's own
agents and the site's it takes on, one agent's settings (what it does, its tools, its run limits, its memory and the
graph made of it, the standing permissions people gave it), the runs on an item with their questions, the questions
waiting for the person, and the chat with an agent beside any page. They call **AbpAgent.HttpApi 0.6.1** or later;
`AgentPermissionsPanel`'s "Allow an agent" and its rows need **0.7.0** (allowing ahead of time, a row's names and titles).
The types in `api.d.ts` come from that version's document, `docs/openapi/abpagent.json` in abp-agent, with
`openapi-typescript docs/openapi/abpagent.json --output src/areas/agent/api.d.ts`.

## What the host gives

- `paths.agent`: where it serves AbpAgent.HttpApi (`AgentHttpApiOptions.RoutePrefix`), such as `/api/agent`.
- `events`: its reader for server-sent events, so a chat shows its reply as it's written. Without it, an open chat asks
  every two seconds while a run goes.
- `scopes.name`: its scopes' names (projects, departments), for the chat's places; their keys show otherwise.
- `languages`: the site's languages, for an agent's names by language.
- Its own groups of tools, when it has some (its skills, an outside server's tools): `ToolGroupsProvider` with a
  function from a tool to its group's id and heading, around the screens. They follow the host's and plugins' tools.
- Where items open: `itemHref(kind, key)` on `AgentsAdmin`, `ScopeAgentsScreen`, `AgentQuestionsPanel` and
  `AgentChatPanel` (or `ItemHrefProvider` around them). Items show as their keys without it.
- Words: any key in `texts/en.json` through `AbpHost.texts.agent`. The defaults call a scope a "project" and what a run
  or a note is about an "item"; a host names its own there (its records, its assets, the keys it offers agents to).
- The graph is drawn with React Flow: a host that shows it imports `@xyflow/react/dist/style.css` once. The area
  imports no CSS.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `agent.site.admin` | administers the site's agents | `agentPages`' default `visible`: the site's page |
| `agent.scope.admin` (with `scopeId`) | administers that scope's agents | for the host's scope settings page that shows `ScopeAgentsScreen` |

They only shape what's shown; AbpAgent.HttpApi's answers decide (its services check an agent's admins, a run's person
and the rights on items).

## Slots

| Slot | Context | For |
|---|---|---|
| `agent.markdown` | `{ source }` | an agent's words (replies, a chat's text as it's written), in the host's own Markdown renderer, which keeps its rules on links and remote images. Plain text without it |
| `agent.run.actions` | `{ run, onChanged }` | a run's actions after it ended, on an item's runs and in a chat after a run that changed something: "Undo this run", where the host keeps what a run changed |
| `agent.picture` | `{ agent, onSaved }` | the agent's picture, which is its account's |
| `agent.connections` | `{ agent, onChanged }` | the outside servers the agent may use; `onChanged` makes its tools ask again |
| `agent.tools.extra` | `{ agent, settings, set, listed, loading }` | more tools on the agent's tools tab that the API doesn't list (`listed` is what it did), with the same settings: `set(name, value)` changes one, saved with the tab |
| `agent.limits.extra` | `{ agent, register }` | the agent's AI cost limits (a gateway's), on its limits tab: `register(save)` (`useSlotSaves`) joins the tab's Save |
| `agent.names` | `{ label, value, onChange, placeholder, fallback, kind }` | the host's own field for names by language (an agent's name, or what it does: `kind` `title`), in place of the area's |
| `agent.switch.extra` | `{ settings, register }` | more on the site's switch (a cost limit agents need first, a sandbox's state): `register(save)` runs before agents go on |

## Pages and screens

`agentPages(options)` gives the `SettingsPage` entry a host files under its sections: **AI agents** (`agent.admin`),
the site's agents. That default title is English: a host passes `title` (and `about`) in its language.

- `AgentsAdmin`: the site's page without its header. `ScopeAgentsScreen` (`scope`, `roles`, `header`): a scope's agents
  for the host's own scope settings page; the host gives the roles an agent may have there.
- `AgentChatProvider` (once, around the shell), `AgentChatPanel` (inside it), `useAgentChat().open(…)` to open it on the
  list, a chat, or a new chat about an item or in a scope; `AgentChatButton` for the top bar; `AskAgentButton` for an
  item's header. `onItemChanged` on the provider hears when a chat's run about an item ended or a reply was posted.
- `ItemAgentRuns` (`kind`, `itemKey`): an item's runs. `AgentQuestionsPanel`: the questions waiting for the person.
  `AgentPermissionsPanel`: their standing permissions, one row per agent and scope with its tools together, removed
  as a whole, and "Allow an agent" to give some ahead of time (or an agent's, with `agentId`, one row per person).
  Deleting all of someone's chats (0.9.0): `MyAgentChatsPanel` (a person's own, for their privacy page),
  `PersonAgentChatsAction` (`accountId`, `name`; a site admin, on someone's account page) and `ForgetChatsOption`
  (`accountId`, `register`; for the slots `guard.account.deactivate.options` and `guard.account.delete.options`). `AgentSelect` (`scope`): an
  agent picked by key, for a workflow step or a rule. `AgentBadge`: marks an agent's account where people are named.

## Exports

The pages and screens above, their parts (`AgentEditor`, `AgentForm`, `AgentPause`, `AgentsTable`, `AgentToolsPanel`,
`AgentLimitsPanel`, `AgentMemoriesPanel`, `AgentGraph`, `AgentQuestionCard`, `AgentText`), the names by language
(`useNameOf`, `NamesField`), `useAgentTexts`, and the API's types (`AgentTypes`).
