# BEDOLAGA-DEV Upstream Merge Design

Date: 2026-08-26
Status: Approved

## Context

The writable repository is the `egvill/bedolaga-cabinet` fork configured as
`origin`. The source repository to integrate is
`https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git`.

At design time:

- Fork `main`: `ca7aea9`
- Upstream `main`: `2192484`
- Merge base: `ec3eebe`
- Fork-only commits: 8
- Upstream-only commits: 440

A dry merge-tree forecast reports conflicts in `package-lock.json`,
`package.json`, `src/components/layout/AppShell/AppShell.tsx`, four locale
catalogs, `src/pages/Login.tsx`, `src/vite-env.d.ts`, and `vitest.config.ts`.

## Goals

- Preserve the fork's current Apple sign-in, mobile app promotion, mobile
  deeplink generation, and test behavior.
- Integrate all additions from the pinned upstream `main` tip.
- Preserve both Git histories in an auditable merge commit.
- Update fork `main` only after tests, lint, type checking, and the production
  build all pass.
- Publish with a normal push and never rewrite `main` history.

## Non-Goals

- Rebase or squash the fork's commits.
- Prefer either side wholesale when a conflict contains compatible behavior.
- Change backend API contracts intentionally.
- Fix unrelated pre-existing defects discovered by the validation commands.

## Selected Approach

Use a true `--no-ff` merge on a temporary integration branch. Keep a local
safety ref at the pre-merge fork tip, resolve each conflict by intent, validate
the complete result, fast-forward local `main` to the tested merge commit, and
push `main` normally to `origin`.

This approach was selected over rebasing or transplanting the fork delta. It
resolves conflicts once, retains provenance for both repositories, requires no
force push, and provides the clearest rollback history.

## History And Release Flow

1. Keep design and implementation-plan commits on the integration branch so
   local `main` remains unchanged during preparation.
2. Confirm the worktree is clean and run the validation gate against the fork
   baseline. Stop if any command fails.
3. Configure `BEDOLAGA-DEV/bedolaga-cabinet` as `upstream` and fetch both
   remotes.
4. Pin the fetched upstream SHA. If it differs from `2192484`, repeat the
   divergence and merge-tree forecast before merging.
5. Create a local safety ref at the current integration tip.
6. Merge the pinned `upstream/main` with `--no-ff`.
7. Resolve conflicts according to the component rules below and commit the
   merge only after focused checks pass.
8. Run the complete validation gate from a clean dependency installation.
9. Fetch `origin` again and confirm `origin/main` did not advance unexpectedly.
10. Fast-forward local `main` to the tested integration commit and push it to
    `origin/main` without force.
11. Verify that the remote `main` SHA equals the tested local commit.

## Component Integration

### Package And Tooling

Adopt upstream's current dependency and Biome baseline. Retain the fork's
mobile-deeplink generator in every development or production build path that
must emit generated association files. Rebuild `package-lock.json` from the
resolved `package.json`; do not resolve lockfile conflict markers manually.

### Application Shell

Use upstream's expanded icon/navigation structure and centered desktop header.
Compose the existing `MobileAppBanner` above it and continue using the banner
height to offset fixed headers and page content. Both desktop and mobile
layouts must remain free of overlap.

### Login And Authentication

Retain the fork's `signInWithApple` provider action, loading and error behavior,
mobile app banner, and post-authentication navigation. Integrate them with
upstream's icons, legal consent and footer, backend-provided legal
configuration, and existing authentication options. Apple remains an
additional provider rather than replacing an upstream provider.

### Environment Contract

Combine the fork's `VITE_MOBILE_DEEPLINK_SCHEME`, `VITE_APP_STORE_URL`,
`VITE_PLAY_STORE_URL`, and `VITE_MAC_APP_STORE_URL` declarations with
upstream's `VITE_HEALTH_URL`. Build-time deeplink inputs and runtime health
configuration remain independent.

### Locales

Structurally merge all four JSON catalogs. Preserve `providers.apple` and the
`mobileAppBanner` object. Add upstream's account-merge, subscription, and
footer keys. Every catalog must parse and expose equivalent key shapes.

### Test Configuration

Retain support for the fork's React, alias, and happy-dom tests while including
upstream utility tests. Prefer one Vitest configuration when both test classes
pass. If their environment requirements conflict, use separate browser and
Node test projects without changing production behavior.

## Data Flow

Environment configuration feeds the build-time deeplink generator and runtime
app-link destinations. App-promotion state controls the shared banner and its
layout offsets. Authentication combines upstream consent/configuration
retrieval with all supported providers, including Apple. The merged locale
catalogs provide strings for both feature sets. No backend request or response
shape is deliberately changed.

## Error Handling And Safeguards

- Abort before merging when the fork baseline fails any required command.
- Reject unresolved conflict markers, malformed JSON, duplicate package
  scripts or locale keys, stale lockfile content, and unexpected generated
  files.
- Stop for user input when a conflict represents an ambiguous product choice.
- Re-forecast and revalidate if upstream advances beyond the pinned SHA.
- Let a concurrent `origin/main` update reject the normal push; never bypass it
  with force.
- Keep the pre-merge safety ref locally. A later production rollback uses an
  explicit merge revert, not history rewriting.

## Testing And Validation

Run focused tests for integration-sensitive behavior:

- Apple remains available and reaches the existing sign-in flow.
- Upstream legal consent still gates authentication correctly.
- The mobile app banner renders, dismisses, and offsets the app shell without
  overlap.
- Type declarations accept both mobile-link and health settings.
- Every locale file parses and contains the combined key set.

Then run the mandatory full gate:

```bash
npm test
npm run lint
npm run type-check
npm run build
```

All four commands must pass. Review the final diff and worktree after the build
so only intentional source, dependency, generated association, test, design,
and plan files are included.

## Success Criteria

The fork's `origin/main` ends at the verified merge commit through a normal
push. That commit contains both ancestries, preserves current fork behavior,
integrates upstream additions through the pinned tip, contains no unresolved
conflicts, and passes the complete validation gate.