# The `documents` area: AbpDocuments' screens

A scope's library of documents and a viewer that opens one at a page, on **AbpDocuments.HttpApi 0.11.0** or later
(abp-ai). People add files by dropping them or choosing them (PDF, Word, text, Markdown, PNG, JPEG, WebP), each with a
data class that decides which models may receive its text; each document's reading shows as it goes (waiting, reading,
indexing, ready, waiting on a limit, or couldn't be read with the reason), and the list is read again while any is on
its way. The viewer shows a page's text as it was read (what an answer cites), with the words asked about marked, and
for a PDF or a picture the file itself beside it.

The types in `api.d.ts` are generated with `openapi-typescript` from AbpDocuments.HttpApi's routes and schemas as a
host's OpenAPI document has them (at the default prefix, `api/documents`):

```bash
npx openapi-typescript@7.10.1 abpdocuments.json -o src/areas/documents/api.d.ts
```

## What the host gives

- `paths.documents`: where it serves AbpDocuments.HttpApi (`DocumentsHttpOptions.RoutePrefix`), such as `/api/documents`.
- `can('documents.scope.add', scopeId)` and `can('documents.scope.manage', scopeId)`, for the add area and the rows'
  menus.
- `me`: whoever added a document may delete it even without managing the scope.
- Its step-up, through its request (`createHostRequest` does it by default): changing a class is the sensitive action
  (`DocumentsSensitiveAttribute`), and its 403 `step_up_required` goes through the host's dialog and is sent again.
- Words: any key in `texts/en.json` through `AbpHost.texts.documents`. `description` says `{product}`; class names are
  `classes.<class>`, so a host with classes of its own names them there.

## Rights

| Right | Means | Shapes |
|---|---|---|
| `documents.scope.add` | adds files to the scope, at the default class or a stricter one | the add area |
| `documents.scope.manage` | reads a document again, renames it, changes its class, deletes it; files at a less strict class | the rows' menus, the class picker |

They only shape what's shown. AbpDocuments decides through the host's `IDocumentsRights`: a document a person may not
read answers 404, and is never in a list or a search.

## Slots

| Slot | Context | For |
|---|---|---|
| `documents.list.actions` | `{ scopeId }` | the host's own links in the library's header |
| `documents.viewer.actions` | `{ documentId, page }` | the host's own buttons in the viewer's header (ask about this document) |

## Screens

The library belongs to a scope, so it's a page of the host's, not a settings page: the host mounts the screens in its own
routes and keys each by its id.

- `DocumentsScreen` (`scopeId`, `viewerHref(documentId, page?)`, `title`, `onChanged`): the library. Uploads go one at
  a time; leaving while any is on its way asks first, for a link inside the app too. A list with documents on their way
  is read again three seconds after each answer, and a change of reading is said in a live region.
- `DocumentViewer` (`documentId`, `page`, `highlight`, `libraryHref`, `onPage`): one document at a page, kept within its
  pages. The host keeps the page in its address through `onPage`. The file is fetched through the host's request and
  shown from a local copy: a PDF in the browser's own viewer at the page, a picture as itself.
- `DocumentStatusPill` (`status`): a document's reading as a pill, for a host's own lists.

`data-testid`s kept for a host's checks: `documents-add` (the drop area), `documents-list` (the library),
`document-pages` (the viewer's page controls), `document-text` (the page's text) and `document-original` (the file).
