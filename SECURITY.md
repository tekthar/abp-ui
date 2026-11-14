# Security

Please report a vulnerability privately, through GitHub's "Report a vulnerability" on this repository, not in an
issue. Say what it is, how to reach it, and what it lets someone do.

The package's own lines:

- It makes no network calls and runs no code it's given: no `eval`, no `new Function`, no HTML set from strings.
  Everything it draws goes through React, so text from the host or its users is escaped.
- Links go through the host's link component; the package doesn't decide where they lead.
- The only thing it keeps in the browser is a board's folded columns (`localStorage`, under `board.folded.{key}`).
- `@abpjs/ui/rules` has no React and no browser APIs.

A way past any of these is a vulnerability.

What the package doesn't promise: it trusts the host. The host decides who sees what (a settings page's `visible` only
keeps the menu tidy; the server must check every page), what goes into a component's props, and which CSS, fonts and
colours are loaded. A host that renders untrusted Markdown or HTML next to these components does so with its own
sanitising.
