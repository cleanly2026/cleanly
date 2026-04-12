# Cleanly - Fly.io Account Setup

| Field | Value |
|-------|-------|
| Provider | Fly.io |
| Tier | Pay-per-use |
| Cost | Variable (estimated $5-15/mo for staging) |
| Dashboard | https://fly.io |

---

## Prerequisites

- Gmail account (personal)
- Credit card for pay-per-use billing
- `flyctl` CLI installed locally: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`

---

## Signup Checklist

1. Go to https://fly.io
2. Click **Sign Up** -> Sign up with GitHub or personal Gmail
3. Complete account verification
4. Add a credit card under **Billing** (required for any machine deployment)
5. Install `flyctl` CLI if not already installed:
   ```bash
   # macOS
   brew install flyctl
   # Linux/WSL
   curl -L https://fly.io/install.sh | sh
   ```
6. Authenticate CLI:
   ```bash
   flyctl auth login
   ```

### Create Deploy Token

7. Navigate to **Account** -> **Access Tokens** -> **Deploy Tokens**
8. Click **Create Deploy Token**:
   - **Name:** `cleanly-ci-deploy`
9. Copy the deploy token (shown once)

> **NOTE:** App creation is Phase 9. Phase 8 only creates the Fly.io account and deploy token. Mumbai (bom) region is locked from prior decisions.

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Email | Account email | Personal Gmail |
| Deploy Token | Access Tokens page after creation | `FlyV1 ...` (long string) |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Fly.io** | `email` | Account email |
| | `deploy_token` | CI deploy token |

Vault: `Cleanly`
Tags: `hosting`, `fly`, `deployment`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Deploy Token | GitHub Environments | `FLY_API_TOKEN` | CI — deploy pipeline |

---

## Billing Alert

- **Plan:** Pay-per-use
- **Alert:** Set budget alert at **$20/mo**
  - Dashboard -> Billing -> Set spending limit/alert
- **Estimate:** Staging with 1 API machine + 1 worker machine ~ $5-15/mo

---

## Post-Phase-8: Phase 9 App Creation

> **CRITICAL: Phase 9 app creation MUST use `bom` (Mumbai) region.**

When Phase 9 begins, create the Fly.io apps with these exact commands:

```bash
# Staging API
fly apps create cleanly-api-staging --machines

# Production API
fly apps create cleanly-api --machines
```

Then in each `fly.toml`, set the primary region:

```toml
primary_region = "bom"
```

Mumbai (`bom`) is the closest Fly.io region to the UAE/Gulf. There is no Bahrain region on Fly.io.

**Additional Phase 9 tasks:**
- Set all runtime secrets via `flyctl secrets set`
- Deploy API + BullMQ worker as two separate machines (same image, different start command)
- Worker process group must have `auto_stop_machines = "off"` to prevent queue stalling
- See FLY-08/FLY-09 requirements in REQUIREMENTS.md
