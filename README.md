# @todahq/ui

The Toda design system ([ADR 0006](../../docs/adr/0006-design-system-chakra.md)): Chakra UI v3 tokens, recipes and components. The shell and every plugin use it, and the living reference is the shell's `/design` page.

## Build and consumption

- **Built with tsup** into one ESM file plus type declarations (`dist/index.js`, `dist/index.d.ts`). The bundle starts with `"use client"`, so Next.js server components can render `TodaProvider`.
- **External dependencies.** React, Chakra, emotion, next-themes and lucide-react stay external. Chakra, emotion, React and next-themes are peer dependencies, so the host's single copy is used.
- **Why it is built, not consumed as TypeScript source.** Next 16 (Turbopack) and the Vite Module Federation remotes then resolve the same plain ESM file. Type checking in a plugin doesn't compile the package with the plugin's `tsconfig`. Next needs no `transpilePackages`.
- **In the workspace.** `pnpm -r build` builds it first, because `web` and the plugin depend on `@todahq/ui: workspace:*`. While developing, `pnpm dev` at the root runs `tsup --watch` beside `next dev`.
- **In plugins.** A plugin lists `@todahq/ui`, `@chakra-ui/react` and `@emotion/react` as dev dependencies, for types only, and declares them in `vite.config.ts` as shared with `import: false`. At runtime it receives the shell's instances. See `plugins/Toda.Guard.Ldap/web/vite.config.ts` and `web/lib/federation.ts`.

## Using it

```tsx
// host (the shell)
<html lang={locale} dir={dir} suppressHydrationWarning>
  <TodaProvider locale={locale} labels={translatedLabels} linkComponent={NextLink}>…</TodaProvider>
```

The host also loads the fonts and sets `--toda-font-sans`, `--toda-font-arabic` and `--toda-font-mono` (the shell uses `next/font/google` with IBM Plex Sans, IBM Plex Sans Arabic and IBM Plex Mono).

Plugins import components directly: `import { Panel, StatusPill, DataTable, useTodaLocale } from '@todahq/ui'`. They never render `TodaProvider`.

## Rules

- Style with semantic tokens only: `bg.panel`, `fg.muted`, `border`, the `accent`/`success`/`warning`/`danger`/`info` palettes, and `statusCategory.*`. Use text styles (`heading.page`, `body`, `label`, `caption`, `key`, `code`) and spacing steps or names (`section`, `panel`, `field`, `stack`, `page.x`). Never raw colours or pixel sizes.
- Variants belong in recipes, not in new components.
- Use logical properties only (`ps`/`pe`, `ms`/`me`, `insetStart`, `borderInlineStartWidth`). Wrap icons that point in reading direction in `DirectionalIcon`.
- No app code: no i18n library, router, auth or fetching. Strings come through `labels` and links through `linkComponent`.

## Contents

- `system`, `todaConfig`, `scales`
- `TodaProvider`, `useTodaLocale`, `useTodaLabels`, `useColorMode`, `ColorModeToggle`, `AppLink`, `useFormatters`, `formatDateTime`, `formatNumber`
- `AppShell` (ADR 0058: the site's pages in the top bar, a place's own menu in the sidebar, a drawer on small screens), `PageHeader`, `Breadcrumbs`, `Panel`, `PropertyList`
- `Button`, `IconButton`, `Field`/`FormField`, `SelectField`, `CheckboxField`, `SwitchField`
- `StatusPill` (status tones and status categories), `RecordKey`, `PathChips`
- `DataTable`: typed columns, sortable headers with `aria-sort`, sticky header, loading, empty and error states, sub-rows, and `sortMode="manual"` for server-side sorting (the M2 QueryableList builds on it)
- `InlineAlert`, `EmptyState`, `LoadingState`, `ConfirmDialog`/`useConfirm`, `toaster`/`notify`/`Toaster`, `Tooltip`, `DirectionalIcon`
- Motion (ADR 0058, on Motion; never import it directly): `FadeIn`, `Reveal`/`RevealItem`, `Presence`, `PresenceList`/`PresenceItem`, `SlideList`/`SlideItem`, `Collapse`, `Swap`, `Counter`, `Indicator`, `Pressable`, `useCelebrate`. The person's motion setting (`useMotionSetting`) and their system's are respected for you; layout motion is a small FLIP helper on Web Animations, not Motion's; the design page's Motion tab shows each
