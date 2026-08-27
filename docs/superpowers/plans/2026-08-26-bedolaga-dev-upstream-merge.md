# BEDOLAGA-DEV Upstream Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge BEDOLAGA-DEV `main` into the writable fork while preserving Apple sign-in, mobile app promotion/deeplinks, and all upstream functionality, then publish the tested merge to fork `main` without rewriting history.

**Architecture:** Work on `merge/bedolaga-dev-main-2026-08-26`, characterize the fork-owned Apple flow before merging, and integrate the pinned upstream tip with one `--no-ff` merge commit. Resolve conflicts as additive compositions, run the complete gate before committing the merge, then fast-forward local `main` and use a normal push after checking for remote races.

**Tech Stack:** Git, npm, React 19, TypeScript, Vite 7, Vitest 4, Testing Library, happy-dom, Biome 2.5.3, i18next

**Spec:** `docs/plans/2026-08-26-bedolaga-dev-upstream-merge-design.md`

## Global Constraints

- Preserve the fork's current Apple sign-in, mobile app promotion, mobile deeplink generation, and test behavior.
- Integrate all additions from the pinned BEDOLAGA-DEV `main` tip.
- Preserve both Git histories with a true merge commit; do not rebase, squash, or force-push.
- Resolve conflicts by intent and combine compatible behavior rather than preferring one side wholesale.
- Stop before merging if the fork baseline fails tests, lint, type checking, or the production build.
- Stop before publication unless `npm test`, `npm run lint`, `npm run type-check`, and `npm run build` all pass.
- Stop for user input if a conflict requires an ambiguous product decision.
- Re-run the graph and conflict forecast if upstream has advanced beyond inspected SHA `2192484b011068d8cb75c61a6aeaada1d06115aa`.
- Let a concurrent `origin/main` update reject publication; never bypass it with force.

## File Map

- Create: `src/utils/appleSignIn.test.ts` - characterization coverage for the fork-owned Apple popup contract and state validation.
- Modify: `package.json` - upstream dependencies and Biome scripts plus fork deeplink build hooks and DOM-test dependencies.
- Regenerate: `package-lock.json` - lock data generated from the resolved manifest.
- Modify: `src/components/layout/AppShell/AppShell.tsx` - upstream shell/navigation with the fork banner and layout offsets.
- Modify: `src/pages/Login.tsx` - upstream consent/login changes with the fork Apple provider and banner.
- Modify: `src/locales/en.json` - additive English provider, banner, account-merge, subscription, and footer keys.
- Modify: `src/locales/fa.json` - additive Persian provider, banner, account-merge, subscription, and footer keys.
- Modify: `src/locales/ru.json` - additive Russian provider, banner, account-merge, subscription, and footer keys.
- Modify: `src/locales/zh.json` - additive Chinese provider, banner, account-merge, subscription, and footer keys.
- Modify: `src/vite-env.d.ts` - union of mobile/store and health environment declarations.
- Modify: `vitest.config.ts` - discover upstream utility tests while retaining aliases, React support, and happy-dom for the fork suite.
- Accept: all non-conflicting files added or changed by upstream - preserve Git's automatic merge unless a focused check demonstrates an integration defect.

---

### Task 1: Establish The Baseline And Protect Apple Sign-In

**Files:**
- Create: `src/utils/appleSignIn.test.ts`
- Verify: `src/utils/appleSignIn.ts`
- Verify: `src/hooks/useMobileAppPromo.test.ts`

**Interfaces:**
- Consumes: `signInWithApple(response: OAuthAuthorizeResponse): Promise<AppleSignInResult>` and the browser-level `window.AppleID.auth` contract.
- Produces: a characterization suite that must pass both before and after the upstream merge.

- [ ] **Step 1: Confirm branch and graph invariants**

Run:

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Expected:

```text
branch: merge/bedolaga-dev-main-2026-08-26
HEAD contains the approved design and implementation-plan commits
origin/main: ca7aea9184951138313ef240f2688f2a31c6aee9
working tree: clean
```

Stop if the branch or `origin/main` differs. Reconcile the new history before continuing.

- [ ] **Step 2: Install the fork baseline exactly from its lockfile**

Run:

```bash
npm ci
```

Expected: exit 0 with the current fork dependencies installed.

- [ ] **Step 3: Run the mandatory gate against the unmerged fork**

Run each command separately so a failure is attributable:

```bash
npm test
npm run lint
npm run type-check
npm run build
```

Expected: all four commands exit 0. Stop before fetching or merging upstream if any command fails.

- [ ] **Step 4: Add the Apple popup characterization test**

Create `src/utils/appleSignIn.test.ts` with this content:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OAuthAuthorizeResponse } from '../types';
import { signInWithApple } from './appleSignIn';

const authorizeResponse = {
  authorize_url:
    'https://appleid.apple.com/auth/authorize?client_id=com.example.web&redirect_uri=https%3A%2F%2Fcabinet.example.com%2Foauth%2Fapple&response_type=code&response_mode=form_post&scope=name%20email&state=expected-state&nonce=url-nonce',
  state: 'expected-state',
  nonce: 'api-nonce',
} satisfies OAuthAuthorizeResponse;

describe('signInWithApple', () => {
  const init = vi.fn();
  const signIn = vi.fn();

  beforeEach(() => {
    init.mockReset();
    signIn.mockReset();
    Object.defineProperty(window, 'AppleID', {
      configurable: true,
      writable: true,
      value: { auth: { init, signIn } },
    });
  });

  afterEach(() => {
    delete window.AppleID;
  });

  it('initializes the SDK from the backend authorize response and returns the popup result', async () => {
    signIn.mockResolvedValue({
      authorization: { code: 'apple-code', state: 'expected-state' },
      user: { email: 'person@example.com' },
    });

    await expect(signInWithApple(authorizeResponse)).resolves.toEqual({
      code: 'apple-code',
      state: 'expected-state',
      user: { email: 'person@example.com' },
    });
    expect(init).toHaveBeenCalledWith({
      clientId: 'com.example.web',
      scope: 'name email',
      redirectURI: 'https://cabinet.example.com/oauth/apple',
      state: 'expected-state',
      nonce: 'api-nonce',
      responseType: 'code',
      responseMode: 'form_post',
      usePopup: true,
    });
    expect(signIn).toHaveBeenCalledOnce();
  });

  it('rejects a popup result whose state does not match the authorize response', async () => {
    signIn.mockResolvedValue({
      authorization: { code: 'apple-code', state: 'wrong-state' },
    });

    await expect(signInWithApple(authorizeResponse)).rejects.toThrow(
      'Apple Sign In state mismatch',
    );
  });
});
```

This is a characterization test, so it must pass before the merge rather than fail first. Its purpose is to detect upstream-integration regressions.

- [ ] **Step 5: Run the fork-owned focused suites**

Run:

```bash
npm test -- src/utils/appleSignIn.test.ts src/hooks/useMobileAppPromo.test.ts
```

Expected: both test files pass, including Apple SDK initialization/state validation and all banner visibility/dismissal cases.

- [ ] **Step 6: Validate and commit the characterization test**

Run:

```bash
npm run lint -- src/utils/appleSignIn.test.ts
npm run type-check
git diff --check
git add src/utils/appleSignIn.test.ts
git diff --cached --check
git commit -m "test: protect Apple sign-in integration"
```

Expected: all checks pass and the commit contains only `src/utils/appleSignIn.test.ts`.

---

### Task 2: Merge Upstream And Resolve The Integration Atomically

**Files:**
- Modify: `package.json`
- Regenerate: `package-lock.json`
- Modify: `src/components/layout/AppShell/AppShell.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/fa.json`
- Modify: `src/locales/ru.json`
- Modify: `src/locales/zh.json`
- Modify: `src/vite-env.d.ts`
- Modify: `vitest.config.ts`
- Verify: `src/utils/appleSignIn.test.ts`
- Verify: `src/hooks/useMobileAppPromo.test.ts`
- Verify: `src/locales/locales.test.ts`

**Interfaces:**
- Consumes: fork `HEAD`, writable `origin/main`, upstream `refs/remotes/upstream/main`, and the Task 1 characterization tests.
- Produces: one two-parent merge commit whose first parent is the fork integration branch and second parent is the pinned upstream tip.

Do not create partial commits while Git is in the conflicted merge state. All conflict groups form one reviewable, atomic integration.

- [ ] **Step 1: Configure and fetch the read-only upstream remote**

Run:

```bash
if git remote get-url upstream >/dev/null 2>&1; then
  git remote set-url upstream https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
else
  git remote add upstream https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
fi
git fetch origin main
git fetch upstream main
git remote get-url upstream
```

Expected upstream URL:

```text
https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
```

- [ ] **Step 2: Pin and verify both remote tips**

Run:

```bash
origin_tip="$(git rev-parse origin/main)"
upstream_tip="$(git rev-parse upstream/main)"
printf 'origin/main=%s\nupstream/main=%s\n' "$origin_tip" "$upstream_tip"
git rev-list --left-right --count origin/main...upstream/main
```

Expected:

```text
origin/main is ca7aea9184951138313ef240f2688f2a31c6aee9
upstream/main is 2192484b011068d8cb75c61a6aeaada1d06115aa
fork/upstream divergence before local design/test commits: 8 440
```

If `origin/main` changed, stop. If `upstream/main` changed, run the forecast below and review any changed conflict list before continuing:

```bash
git merge-tree --write-tree HEAD upstream/main
```

- [ ] **Step 3: Create the local recovery ref and start the merge**

Run:

```bash
git branch safety/pre-bedolaga-dev-merge-2026-08-26 HEAD
git merge --no-ff --no-commit upstream/main
```

Expected: Git reports conflicts and leaves the worktree in a merge state. With upstream SHA `2192484b011068d8cb75c61a6aeaada1d06115aa`, run:

```bash
git diff --name-only --diff-filter=U
```

Expected unmerged paths:

```text
package-lock.json
package.json
src/components/layout/AppShell/AppShell.tsx
src/locales/en.json
src/locales/fa.json
src/locales/ru.json
src/locales/zh.json
src/pages/Login.tsx
src/vite-env.d.ts
vitest.config.ts
```

- [ ] **Step 4: Resolve the package manifest around upstream tooling and fork build behavior**

Use upstream `package.json` as the dependency baseline, including version `1.66.0`, its new runtime dependencies, Biome `2.5.3`, and Vitest `^4.1.10`. Resolve the scripts to this exact object:

```json
"scripts": {
  "dev": "node scripts/generate-mobile-deeplinks.mjs && vite",
  "build": "node scripts/generate-mobile-deeplinks.mjs && tsc && vite build",
  "build:docker": "node scripts/generate-mobile-deeplinks.mjs && vite build",
  "lint": "biome lint .",
  "lint:fix": "biome lint --write .",
  "format": "biome format --write .",
  "format:check": "biome format .",
  "check": "biome check .",
  "test": "vitest run",
  "test:watch": "vitest",
  "type-check": "tsc --noEmit",
  "preview": "vite preview",
  "prepare": "husky"
}
```

Retain these exact fork test dependencies alongside upstream dev dependencies:

```json
"@testing-library/dom": "^10.4.1",
"@testing-library/react": "^16.3.2",
"happy-dom": "^20.9.0"
```

Remove the old ESLint, `typescript-eslint`, and `@vitest/coverage-v8` entries. Keep upstream's Biome-based `lint-staged` object verbatim.

- [ ] **Step 5: Regenerate the lockfile from the resolved manifest**

First replace the conflicted lockfile with the upstream lockfile, then regenerate it from the final manifest:

```bash
git checkout --theirs package-lock.json
npm install --package-lock-only --ignore-scripts
npm ci
```

Expected: both npm commands exit 0; `package-lock.json` has no conflict markers and records the three retained fork test dependencies.

- [ ] **Step 6: Resolve Vitest for both test populations**

Resolve `vitest.config.ts` to:

```typescript
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    css: false,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

This single configuration discovers all 27 upstream utility suites and keeps the fork's React hook suite operational. Do not add Vitest projects unless running the complete suite demonstrates a real Node-versus-DOM incompatibility.

- [ ] **Step 7: Resolve the application shell as a behavioral union**

In `src/components/layout/AppShell/AppShell.tsx`:

1. Keep upstream's consolidated icon import containing `SubscriptionIcon` through `MoonIcon`.
2. Add these fork imports immediately before it:

```typescript
import MobileAppBanner from '@/components/MobileAppBanner';
import { useMobileAppPromo } from '@/hooks/useMobileAppPromo';
import { UI } from '@/config/constants';
```

3. Keep the already auto-merged hook state:

```typescript
const { show: showMobileAppBanner } = useMobileAppPromo();
const appBannerHeight = showMobileAppBanner ? UI.APP_BANNER_HEIGHT_PX : 0;
```

4. Keep `<MobileAppBanner />` after upstream's global hosts.
5. Use upstream's centered header and grid, but remove `top-0` from its class and apply the fork offset:

```tsx
<header
  className="fixed left-0 z-50 hidden w-screen border-b border-dark-800/50 bg-dark-950/95 lg:block"
  style={{ top: appBannerHeight }}
>
  <div className="mx-auto grid h-14 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
```

6. Keep the auto-merged `topOffset={appBannerHeight}` on `AppHeader` and both desktop/mobile spacer calculations that add `appBannerHeight`.
7. Keep upstream's `PromptDialogHost`, `useBackgroundConsumer`, consolidated icons, navigation capsule, and action layout.

- [ ] **Step 8: Resolve login as upstream consent plus fork OAuth behavior**

In `src/pages/Login.tsx`, retain the already auto-merged mobile banner imports and state. Resolve the import conflict to include every line below:

```typescript
import { signInWithApple } from '../utils/appleSignIn';
import { UsersIcon, EmailIcon, RefreshIcon, ChevronDownIcon } from '@/components/icons';
import LegalFooter from '../components/LegalFooter';
import LegalConsent from '../components/LegalConsent';
import { infoApi } from '../api/info';
import type { LegalConsentConfig } from '../types';
```

Keep `loginWithOAuth` in both the `useAuthStore` destructuring and selector:

```typescript
loginWithOAuth,
// ...
loginWithOAuth: state.loginWithOAuth,
```

Keep the merged Apple branch in `handleOAuthLogin`:

```typescript
if (provider === 'apple') {
  const { code, state, user } = await signInWithApple(authorizeResponse);
  await loginWithOAuth(provider, code, state, undefined, user);
  navigate(getReturnUrl(), { replace: true });
  return;
}
```

Also retain upstream's legal-config query, `captureConsentRequirement`, pending-consent screen, registration consent, icons, `LegalFooter`, and API error mapping. Keep `<MobileAppBanner />`, its safe-area-aware page padding, and language-switcher offset from the fork.

- [ ] **Step 9: Resolve the environment declaration as an explicit union**

Resolve `ImportMetaEnv` in `src/vite-env.d.ts` to contain all of these fields:

```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_LOGO?: string;
  readonly VITE_MOBILE_DEEPLINK_SCHEME?: string;
  readonly VITE_APP_STORE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
  readonly VITE_MAC_APP_STORE_URL?: string;
  /** Optional override for the backend liveness URL (defaults to `<origin>/health/unified`). */
  readonly VITE_HEALTH_URL?: string;
}
```

Keep the fork's Telegram and Apple browser global declarations below `ImportMeta`.

- [ ] **Step 10: Resolve locale catalogs by key-level union**

For each of `en.json`, `fa.json`, `ru.json`, and `zh.json`, resolve the two conflict regions structurally:

```text
auth.connectedAccounts.providers:
  keep every upstream provider
  append the fork's existing "apple" value after "vk"

auth.connectedAccounts:
  keep upstream "backToAccounts"

auth:
  keep upstream emailMergeTitle, emailMergeCodeDescription,
  emailMergeCodeLabel, emailMergeConfirm, and emailMergeCodeInvalid

root:
  keep the fork's complete mobileAppBanner object for that language
  keep upstream's complete subscriptions object
  keep upstream's complete footer object
```

Do not translate or normalize text during the merge. Copy each language's existing fork `apple` and `mobileAppBanner` values exactly, and copy the upstream account-merge, subscription, and footer values exactly.

- [ ] **Step 11: Prove all conflicts and marker artifacts are gone**

Run:

```bash
git diff --name-only --diff-filter=U
git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- package.json package-lock.json src vitest.config.ts
```

Expected:

```text
git diff --name-only --diff-filter=U: no output, exit 0
git grep: no output, exit 1 because no marker is present
```

Parse every locale explicitly:

```bash
node --input-type=module -e "import fs from 'node:fs'; for (const locale of ['en','fa','ru','zh']) JSON.parse(fs.readFileSync('src/locales/' + locale + '.json', 'utf8')); console.log('locale JSON OK')"
```

Expected: `locale JSON OK`.

- [ ] **Step 12: Run integration-sensitive focused tests**

Run:

```bash
npm test -- src/utils/appleSignIn.test.ts src/hooks/useMobileAppPromo.test.ts src/locales/locales.test.ts
git grep -n 'signInWithApple' -- src/pages/Login.tsx src/pages/ConnectedAccounts.tsx
git grep -n 'topOffset={appBannerHeight}' -- src/components/layout/AppShell/AppShell.tsx
```

Expected:

- All three test files pass.
- `signInWithApple` remains imported and called in both login and connected-account flows.
- `AppHeader` still receives the banner offset.

- [ ] **Step 13: Run the complete pre-commit gate**

Run each command separately:

```bash
npm test
npm run lint
npm run type-check
npm run build
git diff --check
```

Expected: every command exits 0. Review any build-generated changes under `public/.well-known/`; they may be staged only when they are deterministic outputs of the merged generator configuration. No unrelated cleanup belongs in this merge.

- [ ] **Step 14: Stage resolved paths and create the merge commit**

Run:

```bash
git add package.json package-lock.json vitest.config.ts
git add src/components/layout/AppShell/AppShell.tsx src/pages/Login.tsx src/vite-env.d.ts
git add src/locales/en.json src/locales/fa.json src/locales/ru.json src/locales/zh.json
git diff --cached --check
git status --short
git commit -m "Merge BEDOLAGA-DEV main into fork"
```

Expected: Git creates one merge commit. Confirm it has exactly two parents:

```bash
git show -s --format='%H%n%P%n%s' HEAD
git rev-list --parents -n 1 HEAD
```

The `git rev-list` line must contain the merge SHA followed by two parent SHAs.

---

### Task 3: Revalidate And Publish Fork Main

**Files:**
- Verify: the complete merged repository
- Update: local `main` ref
- Update: remote `origin/main` ref

**Interfaces:**
- Consumes: the tested two-parent merge commit from Task 2 and unchanged `origin/main` at the pre-merge fork tip.
- Produces: fork `origin/main` pointing at the exact tested merge commit.

- [ ] **Step 1: Re-run the release gate on the committed tree**

Run:

```bash
npm ci
npm test
npm run lint
npm run type-check
npm run build
git diff --check
git status --short --branch
```

Expected: all commands exit 0 and the integration branch worktree is clean after the build. Do not publish a dirty or partially validated tree.

- [ ] **Step 2: Capture the tested merge SHA and verify its ancestry**

Run:

```bash
merge_sha="$(git rev-parse HEAD)"
git merge-base --is-ancestor origin/main "$merge_sha"
git merge-base --is-ancestor upstream/main "$merge_sha"
printf 'tested merge=%s\n' "$merge_sha"
```

Expected: both ancestry checks exit 0.

- [ ] **Step 3: Check for a publication race**

Run:

```bash
expected_origin="ca7aea9184951138313ef240f2688f2a31c6aee9"
git fetch origin main
actual_origin="$(git rev-parse origin/main)"
case "$actual_origin" in
  "$expected_origin") printf 'origin/main unchanged: %s\n' "$actual_origin" ;;
  *) printf 'origin/main moved: %s\n' "$actual_origin" >&2; exit 1 ;;
esac
```

Expected: `origin/main unchanged`. If it moved, remain on the integration branch, merge the new fork commit, and repeat the complete gate before reconsidering publication.

- [ ] **Step 4: Fast-forward local main to the tested commit**

Run:

```bash
git switch main
git merge --ff-only merge/bedolaga-dev-main-2026-08-26
test "$(git rev-parse HEAD)" = "$merge_sha"
```

Expected: local `main` fast-forwards and exactly equals the tested merge SHA.

- [ ] **Step 5: Push normally and verify the remote SHA**

Run:

```bash
git push origin main
remote_sha="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
test "$remote_sha" = "$merge_sha"
printf 'origin/main verified at %s\n' "$remote_sha"
```

Expected: a normal fast-forward push succeeds and the remote SHA equals the tested merge SHA. Do not use `--force` or `--force-with-lease`.

- [ ] **Step 6: Preserve recovery context and report the result**

Run:

```bash
git status --short --branch
git log --graph --oneline --decorate -12
git branch --list 'merge/bedolaga-dev-main-2026-08-26' 'safety/pre-bedolaga-dev-merge-2026-08-26'
```

Expected:

- `main` is clean and tracks the verified `origin/main` SHA.
- The graph displays the two-parent BEDOLAGA-DEV merge.
- The integration and local safety refs remain available until the result is accepted.

Do not perform an automatic rollback. If a later rollback is explicitly requested, revert the merge with `git revert -m 1 <merge_sha>` and publish that new revert commit normally.