# GitHub Environments + Branch Protection Operator Runbook

## Purpose

This runbook captures the one-time operator setup required before
`.github/workflows/deploy.yml` can run end-to-end. It provisions two GitHub
Environments (`staging`, `production`), the secrets each environment needs,
six Vercel Deploy Hooks (one per web project per environment), branch
protection rules on `main` (and `staging`), and disables Vercel's built-in
Git auto-deploy so only GitHub Actions can publish. This work satisfies
requirements **CI-01**, **CI-02**, **CI-05**, **ENV-03**, **ENV-05**.

Completing this runbook is a checkpoint in Plan `10-01`; the runbook is the
only piece of the plan the human must execute by hand.

## Prerequisites

- Admin access to the GitHub repo Settings page.
- Fly.io account with `flyctl` installed locally — tokens are generated
  on-demand in Step 3 via `flyctl tokens create deploy`.
- Neon account with `cleanly-staging` and `cleanly-production` projects
  provisioned (Phase 01) — direct connection strings pulled from the Neon
  dashboard in Step 3.
- Sentry account with the `cleanly` organization — auth tokens created
  on-demand in Step 3 via Sentry Settings → Developer Settings → Auth Tokens.
- Vercel project-owner access to all three web projects (`customer-web`,
  `admin-web`, `company-web`) — Deploy Hook URLs are **created** in Step 1
  below.
- `TURBO_TOKEN` and `TURBO_TEAM` already exist at the **repo** secret scope
  (set during Phase 09). Confirm via GitHub → Settings → Secrets and variables
  → Actions → Repository secrets. Do **not** duplicate these into
  Environments; repo secrets are automatically visible to every Environment.

### Secret storage model (solo dev)

GitHub Environment secrets are the **single source of truth**. They are
encrypted at rest by GitHub and scoped per environment. No external password
manager is required for this checkpoint.

If you want offline disaster-recovery copies (recommended but optional), keep
them in whatever you already use — 1Password, Bitwarden, a GPG-encrypted
local file, or your browser's password manager. The runbook does not assume
any specific tool.

## Step 1 — Create Vercel Deploy Hooks (3 × 2 = 6 hooks)

For each Vercel project (`customer-web`, `admin-web`, `company-web`), create
**two** Deploy Hooks — one for staging, one for production.

1. Vercel → open the project → **Settings → Git → Deploy Hooks**.
2. Click **Create Hook**.
3. Fill in:
   - Name: `staging` (first pass) or `production` (second pass).
   - Branch: `staging` (first pass) or `main` (second pass).
4. Click **Create Hook**, then **Copy URL**.
5. Keep the URL on the clipboard — you will paste it directly into a GitHub
   Environment secret in Step 3. Don't close the Vercel tab between hooks;
   creating all 6 in one sitting is faster than looking them up again.

If you want an offline backup: paste each URL into your password manager of
choice at this point. Otherwise, GitHub Environment secrets store them
encrypted at rest and are the only copy that matters for deploys.

## Step 2 — Create GitHub Environments

GitHub → Repo → **Settings → Environments → New environment**.

Create two environments:

1. **`staging`**
   - No protection rules. Leave "Required reviewers" OFF.
   - No deployment branch restriction needed.
   - Save.
2. **`production`**
   - **Required reviewers: OFF** (per decision **D-02** — deploys to
     production run without manual gating once `main` is protected).
   - **Deployment branches and tags**: set to **Selected branches and tags**
     and add only the `main` branch. This prevents a feature branch from
     accidentally being deployed to production if someone targets the
     workflow manually.
   - Save.

## Step 3 — Generate secrets and paste into each Environment

For **both** `staging` and `production`, add these **Environment** secrets
(GitHub → Settings → Environments → `<env>` → **Environment secrets → Add
secret**). The secret *names* are identical across both environments —
only the values differ.

Generate each value on-demand from its source system and paste it directly
into GitHub. GitHub encrypts Environment secrets at rest, so this is the
canonical copy.

| Secret                              | How to generate the value                                       |
| ----------------------------------- | --------------------------------------------------------------- |
| `FLY_API_TOKEN`                     | `flyctl tokens create deploy --org <cleanly-org>` — run once per env, paste the output. Org-scoped tokens survive user session rotation; user-scoped tokens silently break. |
| `DIRECT_URL`                        | Neon dashboard → `cleanly-<env>` project → **Connection Details** → copy the **direct** connection string (not the pooled one). Format: `postgres://...neon.tech/...` without `-pooler`. |
| `SENTRY_AUTH_TOKEN`                 | Sentry → **Settings → Developer Settings → Auth Tokens → Create New Token**. Scopes: `project:releases`, `org:read`. Generate one token per env to keep revocation blast radius small. |
| `SENTRY_ORG`                        | The Sentry org slug (typically `cleanly`). Same value in both envs unless orgs diverge. |
| `VERCEL_DEPLOY_HOOK_CUSTOMER_WEB`   | Deploy Hook URL from Step 1 for `customer-web <Env>`.           |
| `VERCEL_DEPLOY_HOOK_ADMIN_WEB`      | Deploy Hook URL from Step 1 for `admin-web <Env>`.              |
| `VERCEL_DEPLOY_HOOK_COMPANY_WEB`    | Deploy Hook URL from Step 1 for `company-web <Env>`.            |

Notes:

- `TURBO_TOKEN` and `TURBO_TEAM` live at repo-secret level (set during
  Phase 09) and are automatically available inside every Environment. Do
  **not** redeclare them.
- Later plans will add more secrets to these environments — Plan 10-05/06
  introduces Sentry DSNs per surface; Plan 10-07 introduces Better Stack
  tokens. Leave room; don't pre-create placeholder secrets.
- Optional offline backup: after pasting into GitHub, also store each value
  in a password manager (1Password, Bitwarden, Keepass, etc.) so you can
  rebuild the environment if the GitHub repo is ever deleted. Skipping this
  is fine for a solo developer — you can always regenerate Fly/Sentry tokens
  and look up Neon URLs and Vercel hooks from their respective dashboards.

## Step 4 — Apply branch protection on `main` (and `staging`)

GitHub → Repo → **Settings → Rules → Rulesets → New branch ruleset**.

Create two rulesets.

### 4a. Ruleset: `Production Branch`

- **Ruleset Name**: `Production Branch`
- **Target**: Include default branch (`main`). **Do not** include `staging`.
- **Enforcement**: Active.
- **Rules**:
  - Require a pull request before merging.
    - **Required approving reviews: 0** (per decision **D-02** — solo
      developer velocity).
  - Require status checks to pass before merging.
    - Required check: **`Lint, Typecheck & Test`** — this is the exact job
      name from `.github/workflows/ci.yml`.
  - Block force pushes.
  - (Optional) Require linear history.
- Save.

### 4b. Ruleset: `Staging Branch`

- **Ruleset Name**: `Staging Branch`
- **Target**: Include branch `staging`.
- **Enforcement**: Active.
- **Rules**:
  - Block force pushes.
- Save.

Rationale: `staging` stays low-friction (direct pushes allowed for rapid
iteration per D-02), but force-pushes are still forbidden so we preserve
the deploy history.

## Step 5 — Disable Vercel Git auto-deploy (per D-01)

This is the most forgotten step — skip it and Vercel will shadow-deploy
every push on its own timeline, confusing release tracking and bypassing
`deploy.yml`.

For **each** of the three Vercel projects (`customer-web`, `admin-web`,
`company-web`):

1. Vercel → Project → **Settings → Git**.
2. Under **Production Branch**, either:
   - Set the Production Branch to `(none)` if the UI allows it, **or**
   - Disconnect the GitHub integration entirely. The deploy hooks from
     Step 1 continue to work after disconnection — they're project-scoped
     URLs, not Git integration artifacts.
3. Save.

Verification: after the first successful `deploy.yml` run, open
Vercel → **Deployments** for each project. Every Deployment row should
list its source as a Deploy Hook trigger (typically labeled `(no commit)`
or `Hook: staging` / `Hook: production`). If you see deployments marked
with Git commit SHAs **not** initiated by the Deploy Hook, Git integration
has leaked back on — repeat this step.

## Verification

With Steps 1–5 complete, run the end-to-end smoke test:

```bash
git checkout staging
git commit --allow-empty -m "chore: verify deploy.yml wiring"
git push
```

Open GitHub → **Actions** → latest **Deploy** workflow run:

- The `setup` job should succeed and expose outputs:
  - `env_name = staging`
  - `fly_app_api = cleanly-api-staging`
  - `sha = <7-character SHA>`
- `deploy_api` and `deploy_web` jobs are **expected to fail at this
  checkpoint** because Plans 10-02/05/06 haven't finished wiring migrations,
  Sentry releases, and source-map uploads yet. That is the normal state
  for the 10-01 smoke test.

If `setup` itself fails, something in this runbook was missed.

## Troubleshooting

- **Workflow doesn't trigger on push.** Confirm `.github/workflows/deploy.yml`
  was merged into `staging` (or `main`) — the workflow file must exist on
  the branch you push to, not only on the default branch.
- **`FLY_API_TOKEN` unauthorized.** Regenerate with an org-scoped token:
  `flyctl tokens create deploy --org personal` (or the actual Cleanly org).
  User-scoped tokens silently lose access when the user rotates sessions.
- **Vercel deploy hook returns HTTP 409.** A deploy is already in flight
  for that hook. Wait ~60 seconds and retry; the matrix job can be
  re-run individually from the GitHub Actions UI.
- **One web app fails, the other two succeed.** That's the intended
  `fail-fast: false` behavior. Re-run just the failed matrix job from
  the Actions UI; the two successful deploys do not need to be redone.
- **Branch protection blocks your own PR merge.** Confirm the
  `Lint, Typecheck & Test` check is green on the PR. The required check
  name is case-sensitive and must match `ci.yml` exactly.
- **Vercel deploys fire on every push despite Step 5.** The project still
  has Git integration connected. Disconnect it fully via Vercel →
  Settings → Git → Disconnect. Deploy Hook URLs survive disconnection.

## Revision log

- **2026-04-14 (Plan 10-01)** — Initial runbook for staging + production
  GitHub Environments, Vercel Deploy Hooks, branch protection, Vercel Git
  auto-deploy disable.
