# CI Build Gate — Activation Checklist

**Why this exists:** The CI workflow (`.github/workflows/ci.yml`) already runs `next build`, `tsc --noEmit`, and `lint` on a runner that *can* reach Prisma's engine servers — so it can catch the exact errors that failed the 10.0.0, 11.0.0, and 11.0.1 deploys (a wrong relative import; `as const` on a ternary). But a workflow that exists isn't the same as a workflow that *blocks bad merges*. These steps turn it into an enforced gate.

The workflow itself is done and correct. The remaining steps are **GitHub settings only you can change** (I can't reach your repo settings). They take about 5 minutes.

## What 11.0.4 changed in the workflow
- Added a dedicated **`build-gate`** job that runs `prisma generate → import/anti-pattern guards → tsc --noEmit → next build` **on its own, first**. It fails in ~2-3 minutes with an unambiguous signal if the app doesn't compile.
- The full **`quality-and-tests`** job now `needs: build-gate` — it won't even start if the build is broken, saving CI minutes and making the failure obvious.
- Fixed a pnpm/node setup-order bug in the test job (`cache: pnpm` needs pnpm installed before `setup-node`), which could have caused earlier runs to fail on the cache step rather than on real problems.

## Step 1 — Confirm Actions is enabled (1 min)
GitHub → your repo `bagman3rd/ptt-smokehouse-control` → **Settings → Actions → General** →
- "Actions permissions" = **Allow all actions and reusable workflows** (or at least allow the repo's own).
- Save.

Then open the **Actions** tab and confirm you see runs of "Build 11.0.3 CI". If there are **no runs at all**, Actions was disabled — enabling it above fixes that, and the next push will trigger a run.

## Step 2 — Watch one run go green (2-15 min)
Push any commit to `main` (or open a PR). Open the **Actions** tab and watch:
- `build-gate` should go green first (~2-3 min).
- `quality-and-tests` runs after (up to ~60 min with Playwright).

If `build-gate` **fails**, that's the gate working — it caught a compile error before Render would have. Read the failing step's log; it's the same error Render would show, but now pre-merge.

## Step 3 — Require the gate before merge (2 min)
GitHub → **Settings → Branches → Add branch ruleset** (or "Add rule") for `main`:
- ✅ **Require status checks to pass before merging**
- In the search box, add: **`build-gate`** and **`quality-and-tests`**
- ✅ **Require branches to be up to date before merging**
- (Recommended) ✅ **Do not allow bypassing the above settings**
- Save.

From now on, a broken build **cannot be merged to `main`**, so it can never reach Render.

## Step 4 — (Optional) Stop Render from auto-deploying un-gated commits
If Render currently auto-deploys every push to `main`, a direct push could still deploy without CI. Two options:
- **Simplest:** with Step 3's branch protection, all changes go through PRs that must pass CI, so `main` is always gated. Keep Render auto-deploy on `main`.
- **Stricter:** in Render → service → **Settings → Build & Deploy**, set auto-deploy to **off** and deploy manually (or via the release workflow) only after CI is green.

## Verifying it's actually working
After Step 3, make a deliberately broken commit on a branch (e.g. import something that doesn't exist) and open a PR. You should see `build-gate` fail and the **Merge button blocked**. Delete the branch. That's proof the gate is live.

---

**Bottom line:** the code side is complete and correct. Once Steps 1-3 are done, the two classes of deploy failure you hit become impossible to merge — caught in minutes, in a PR, instead of as a failed production deploy.
