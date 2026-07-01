# design-sync notes — bedolaga-cabinet (cabinet-frontend)

## Shape & entry
- This repo is a **Vite/React 19 application**, not a component library. There is no
  library `dist` entry, no `main`/`module`/`exports`, and no shipped `.d.ts` tree.
  Source shape is `package` (synth-entry).
- We DON'T synth-entry from all of `src/` (that would bundle the whole app). Instead a
  hand-written scoped entry `.design-sync/entry.tsx` re-exports only the design-system
  parts (primitives + data-display + selected ui) and is passed via `--entry`.
  The build command is:
  ```
  node .ds-sync/package-build.mjs --config design-sync.config.json \
    --node-modules ./node_modules --entry ./.design-sync/entry.tsx --out ./ds-bundle
  ```
- Scope (user decision 2026-07-01): **primitives only** — `primitives/` + `data-display/`
  + top-level `ui/` files. The heavy `ui/backgrounds/` set (sigma/graphology) is excluded.
- `ui/Sheet` is intentionally dropped from the entry — its name collides with the
  canonical `primitives/Sheet`.

## Path aliases (`@/*`)
- Do NOT set `cfg.tsconfig`. The bundled `tsconfigPathsPlugin` returns the *directory*
  for bare directory imports (`@/platform`, `@/components/primitives`) because its ext
  list tries `''` first and a dir `existsSync` is true → esbuild errors "is a directory".
  Leaving `cfg.tsconfig` unset lets esbuild's **native** tsconfig auto-discovery resolve
  `@/*` (repo `tsconfig.json`, `include:["src"]`) AND handle directory→`index.ts`
  correctly. Verified working.

## Prop types (`.d.ts`) — REQUIRED PRE-BUILD STEP
- The app ships no `.d.ts`, so prop extraction is empty unless we generate one.
  Before building, emit declarations:
  ```
  ./node_modules/.bin/tsc -p .design-sync/tsconfig.dts.json
  ```
  This writes `dist/types/**` (412 files). `findTypesRoot` picks `dist/types` and real
  prop interfaces (incl. Radix-inherited props) get extracted. **Re-run this whenever the
  component source changes.** (`dist/types` is build output; regenerate, don't commit.)
- Duplicate interface names in the repo mean the extractor can pick the wrong one.
  `StatCardProps` (there is also a different `components/stats/StatCard`) and `SheetProps`
  (ui/Sheet vs primitives/Sheet) are pinned via `cfg.dtsPropsFor`. `Card` is pinned too
  (its `HTMLMotionProps` extension exploded to 342 props). Radix roots
  (`Popover`/`Select`/`DropdownMenu`/`Tooltip`) and inline-typed leaves
  (`Spinner`/`AnimatedCheckmark`/`AnimatedCrossmark`) have no `<Name>Props` interface, so
  they're pinned in `cfg.dtsPropsFor` too.

## Provider (usePlatform throws without it)
- Button/Card/StatCard/Switch/Select/DropdownMenu/Sheet call `usePlatform()`, which
  THROWS without a `PlatformProvider`. `cfg.provider` is set to `PlatformProvider` (for
  the README/docs), but the provider-wrap gate keys off the `exported` set which is empty
  here (no shipped `.d.ts`), so it prints `[PROVIDER_UNEXPORTED]` and does NOT wrap the
  cards. **Every authored preview therefore wraps itself in `<PlatformProvider>`** (the
  entry re-exports it). This is also correct guidance for the design agent.
- `Spinner` calls `useTranslation`; the entry does a side-effect `import '@/i18n'` so the
  global i18next instance is initialized.

## Fonts
- The app loads Manrope / IBM Plex Mono / Outfit from Google Fonts via a `<link>` in
  `index.html` (not shipped as `@font-face`). We self-host them: the woff2 (latin +
  latin-ext + cyrillic + cyrillic-ext subsets — this is a Russian app) live in
  `.design-sync/fonts/` with `fonts.css`, wired via `cfg.extraFonts`. Cyrillic is required.

## CSS
- `cfg.cssEntry` points at the compiled Tailwind app stylesheet
  `cabinet-dist/assets/index-*.css` (hashed name — update if the app is rebuilt). It
  carries the `:root` tokens (dark palette default) + all used utilities.

## Headless browser (WSL, no sudo)
- Playwright chromium is installed under `~/.cache/ms-playwright`. WSL lacks the browser's
  system libs and there's no passwordless sudo, so the 4 missing libs (libnspr4, libnss3,
  libnssutil3, libasound2) were downloaded as `.deb`s and extracted (no sudo) into
  `.ds-sync/syslibs/extracted/...`. Run validate/capture with:
  ```
  export LD_LIBRARY_PATH="$PWD/.ds-sync/syslibs/extracted/usr/lib/x86_64-linux-gnu"
  export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
  ```
  `.ds-sync/` is gitignored and re-copied each sync, so this must be redone on re-sync
  (or run `sudo npx playwright install-deps chromium` once if sudo becomes available).

## framer-motion + headless capture (opacity/transform stuck at initial)
- In headless capture, framer's enter animations don't progress — elements stay at their
  `initial` variant (opacity 0, transforms). The capture's `settle()` doesn't wait for
  framer. Every authored preview injects a `<style>` forcing
  `[style*="opacity:0"]{opacity:1!important}` (targets only framer's inline opacity; class-
  based dimming like disabled buttons is untouched). This is why StatCard values, Dialog,
  Popover, Select content all appear.

## Floor cards (interaction-only / DS quirks — NOT failures)
- **Tooltip**: `TooltipContent` uses `asChild` + `motion.div`; Radix Tooltip injects a
  visually-hidden a11y sibling, so the Slot gets 2 children → `React.Children.only` throws
  in a static open render (Popover/Dropdown don't inject that sibling). Ships as floor card.
- **DropdownMenu**: `DropdownMenuContent` uses a *self-closing* `<motion.div/>` + Radix
  `Slot` child injection; the menu items don't render in static headless capture (Select
  works because it wraps children explicitly). Ships as floor card.
- **Sheet**: drag bottom-sheet (framer drag + off-screen translate); content is in the DOM
  but the panel stays translated off-screen. Not statically renderable. Ships as floor card.
- All three remain fully importable with correct `.d.ts` + `.prompt.md`.

## Pages (data-driven screens) — added in the second pass
- Scope expanded from primitives-only to also include **14 key user pages** (src/pages/):
  Dashboard, Subscriptions, Subscription, SubscriptionPurchase, Balance, TopUpMethodSelect,
  Connection, Profile, Support, Referral, Wheel, Login, PurchaseSuccess, Info. They're in
  `entry.tsx` + `cfg.componentSrcMap`, grouped under `pages/`.
- Pages are data-driven (react-query + zustand + router). They render via a shared harness
  **`.design-sync/page-harness.tsx`** (`PageFrame`) which each `previews/<Page>.tsx` imports.
  PageFrame:
  - Wraps in QueryClientProvider (OUTERMOST — ThemeColorsProvider/others call useQuery) →
    MemoryRouter → PlatformProvider → ThemeColorsProvider → ToastProvider → `<Routes>`.
  - Seeds the react-query cache via `setQueryData` per page (staleTime Infinity so no fetch).
    **Query-key types matter**: `useParams` values are strings unless the page `parseInt`s
    them (Subscription does → key uses the NUMBER 1). Without a matching `<Route path>` in the
    harness, useParams is empty — pass `routePattern` (e.g. "/subscriptions/:subscriptionId").
  - Seeds the auth store (mockUser), forces dark theme (`localStorage['cabinet-theme']='dark'`
    + `.dark` class), suppresses onboarding (`localStorage['onboarding_completed']='true'`).
  - **Neutralizes the network** (inert fetch + XMLHttpRequest) so on-mount side effects
    (refreshUser, traffic refresh) don't leave requests pending — Playwright waits for
    networkidle and a real axios call to the mock host would hang the capture.
  - Wrapped-response gotcha: `getSubscription()` returns `{has_subscription, subscription}`,
    NOT the Subscription directly — seed `['subscription', …]` with `mockSubscriptionResponse`.
  - Reusable mocks live in the harness (mockUser, mockSubscription, mockSubscriptionResponse,
    mockSubscriptionsList, mockTrialInfo, mockBalance, mockPaymentMethods). Extend there.
- Provider/store/router symbols the harness needs are re-exported from `entry.tsx`
  (QueryClient, QueryClientProvider, MemoryRouter, Routes, Route, ThemeColorsProvider,
  ToastProvider, PlatformProvider, useAuthStore, …). They are NOT in componentSrcMap so they
  don't become cards.
- **Login and Connection are floor cards** (like Tooltip/DropdownMenu/Sheet). Login is deeply
  entangled with the Telegram SDK / branding / OAuth and redirects on auth; Connection needs a
  large nested RemnaWave `AppConfig` (platforms→apps→blocks) that's admin/server-driven. Both
  stay fully importable. 12 of 14 pages have rich authored previews.
- **import.meta.env / global**: because this is a Vite app, both the main bundle and the
  preview bundle need `import.meta.env` (VITE_*) and `global` defined at build. Done via the
  two forks in `.design-sync/overrides/` (bundle.mjs, previews.mjs) — see `cfg.libOverrides`.
  On re-sync, diff these against the bundled `lib/*.mjs` and re-apply the define blocks if the
  upstream scripts changed. bundle.mjs fork changes ONLY the `define` map (stampHeader/output
  contract untouched).

## PROJECT MOVED (auth change 2026-07-01)
- The first upload (primitives only) went to project `e7848549-…` under one claude.ai login.
  A mid-session `/login` switched accounts; that project became inaccessible (list_projects
  empty, get_project 404). The full 32-component bundle (primitives + pages) was uploaded to a
  NEW project **`1383e51b-e04b-45be-8192-1b982e0fc040`** ("Bedolaga Cabinet") under the current
  login — this is the projectId now pinned in config. The old project is orphaned.

## Re-sync risks (what can silently go stale)
- `cfg.cssEntry` is a HASHED filename under `cabinet-dist/assets/` — if the app is
  rebuilt, update it to the new hash (or `[CSS_*]` diagnostics will fire).
- `dist/types` MUST be regenerated (tsc step above) before each build, else all props
  revert to `[key: string]: unknown`.
- `.design-sync/fonts/*.woff2` were fetched from Google Fonts on 2026-07-01; the family
  set is pinned. If new weights/families are added to the app, re-fetch.
- The browser syslibs shim (`.ds-sync/syslibs`) is gitignored + wiped on re-sync — redo it.
- The three floor-card components (Tooltip/DropdownMenu/Sheet) are the standing offer for
  incremental authoring if the DS components are fixed for React 19 static rendering.
- `cfg.dtsPropsFor` pins are hand-written from source; if those component APIs change,
  update the pins.
