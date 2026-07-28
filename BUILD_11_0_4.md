# Build 11.0.4 — Enforced CI Build Gate

11.0.4 closes the root cause behind three deploy failures (10.0.0, 11.0.0, 11.0.1): a broken build reaching Render because nothing compiled the app *before* deploy. The fix is a CI gate that runs the real `next build` on a runner that can fetch Prisma engines — catching compile errors in a PR, in minutes, instead of as a failed production deploy.

## The insight

The CI workflow already ran `next build`, `tsc --noEmit`, and `lint` — on `ubuntu-latest`, which *can* reach `binaries.prisma.sh`. So the capability to catch these errors existed. What was missing was **enforcement and structure**:
- The build ran only at the very end of one ~50-step chain (`ci:test`), so an earlier unrelated failure could stop the build from ever running.
- There was no fast, unambiguous "does it compile?" signal.
- A pnpm/node setup-order bug (`cache: pnpm` before pnpm was installed) could make runs fail on setup rather than on real issues.
- Most importantly, nothing is known to have been **enforced as a required status check**, so a red build didn't block merge/deploy.

## What changed

### 1. Dedicated `build-gate` job (runs first, fast)
A new standalone CI job runs, in order and with nothing else in the way:
`pnpm install --frozen-lockfile → prisma generate → test:imports → test:ts-antipatterns → tsc --noEmit → next build`.
It fails in ~2-3 minutes with a clear signal if the app doesn't compile. It uses a syntactically-valid dummy `DATABASE_URL` (the build never connects) so Prisma generation and Next's build-time checks succeed.

### 2. Full test job gated on the build
`quality-and-tests` now declares `needs: build-gate` — the expensive suite (Playwright, restore drill, etc.) doesn't even start unless the app compiles. Broken builds fail fast and cheap.

### 3. Setup-order fix
Reordered `pnpm/action-setup` before `actions/setup-node` in the test job so `cache: pnpm` resolves the pnpm executable. (The new `build-gate` job already had the correct order.)

### 4. Contract-locked
`scripts/ci-release-contract-test.mjs` now asserts the workflow defines `build-gate`, that `quality-and-tests` `needs: build-gate`, and that the gate runs `next build`, `tsc --noEmit`, and both static guards — so this protection can't be silently removed.

## Activation (human steps — see `docs/CI_ACTIVATION_CHECKLIST.md`)

The workflow is complete and correct. Turning it into an enforced gate is GitHub settings only the repo owner can change (~5 min):
1. Confirm **Settings → Actions** is enabled; verify runs appear under the Actions tab.
2. Push once and watch `build-gate` go green.
3. **Settings → Branches**: require `build-gate` and `quality-and-tests` as status checks before merging `main`.
4. (Optional) tighten Render auto-deploy so only gated `main` commits deploy.

After step 3, a broken build **cannot be merged**, so it can never reach Render.

## Verified
- `ci-release-contract-test` PASS with the new build-gate assertions.
- Both static guards PASS; every script the gate invokes exists.
- Full `test:compliance` bundle PASS; regression sweep PASS; lint clean; preflight PASS.
- Both workflow files valid YAML; both jobs have correct pnpm/node ordering.

No schema, migration, or dependency changes in 11.0.4. Workflow + test + docs only.
