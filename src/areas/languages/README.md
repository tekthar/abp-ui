# The `languages` area: AbpLanguages' screens

The site's languages and their texts, on **AbpLanguages.HttpApi 0.7.0** (abp-cluster): the languages the site offers,
their direction, the language each falls back to and how far each is translated; and one language's translation editor,
with every text of every catalog beside its English source, what ships in that language and the site's own wording,
filtered, searched, saved at once, exported as a translator's file and imported back.

The types in `api.d.ts` are generated with `openapi-typescript` from AbpLanguages.HttpApi's routes and schemas as a
host's OpenAPI document has them (at the default prefix, `api/localization`):

```bash
npx openapi-typescript@7.10.1 abplanguages.json -o src/areas/languages/api.d.ts
```

## What the host gives

- `paths.languages`: where it serves AbpLanguages.HttpApi (`LanguagesHttpOptions.RoutePrefix`), such as
  `/api/localization`, or the host's own prefix.
- `can('languages.site.admin')`, for `languagesPages`' default `visible` when the host is passed.
- `onChanged` (on `languagesPages`, or on each screen): called after every change the server has taken (a language
  added, changed or removed; texts saved or imported), so the host reads its languages and texts again: its web server's
  list, the page it renders. The server's own caches follow by themselves.
- `mainCatalog`: the catalog that is the host's own texts (AbpLanguages' `MainCatalog`, `app` by default), shown as
  `editor.mainCatalog` (the product's name). `catalogName(catalog)`: the name for any other catalog (a plugin's, by its
  key); the key by default.
- Words: any key in `texts/en.json` through `AbpHost.texts.languages`.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `languages.site.admin` | manages the site's languages and texts | `languagesPages`' default `visible` |

It only shapes what's shown; AbpLanguages.HttpApi decides (`LanguagesHttpOptions.Policy`, or the host's
`ILanguagesRights`). The enabled languages and their texts are open to anyone; the rest answers 403 to others.

## Slots

| Slot | Context | For |
|---|---|---|
| `languages.list.actions` | none | the host's own links beside Add language on the list (a page of names still missing translations) |

## Pages and screens

`languagesPages(options)` gives the `SettingsPage` entry a host files under its sections: **Languages**
(`languages.admin`) at `href`, drawn by the host's catch-all route: the list at `href`, a language's editor at
`href/{code}`. That default title is English: a host passes `title` (and `about`) in its language.

- `LanguagesScreen` (`translateHref`, `onChanged`): the list, its add and edit dialog, turning a language on or off,
  making one the default, removing one (never the default or English).
- `TranslateScreen` (`code`, `listHref`, `onChanged`, `mainCatalog`, `catalogName`): one language's texts. Changes wait
  in the design system's `SaveBar` until saved; a text left empty takes the shipped one or the fallback's. The server
  refuses a translation that drops one of its source's placeholders (`keep {name}`), and saves nothing then.

`data-testid`s kept for a host's checks: `text-entries` (the editor's entries, each with `data-key` and `data-status`)
and `translation-memory` (an empty text's suggestions from the same English elsewhere).
