# Diagnostic & Observability Tools — Setup and Verification

This document is the authoritative reference for verifying all diagnostic/security/observability tools
installed in `bthwani-suite-next`. No platform closure is claimed here.

---

## A) Verify local CodeQL

```powershell
pnpm run diagnostics:codeql:local
```

**Expected output**:
```
CODEQL_LOCAL: PASS
  version: <x.y.z>
  path:    <path to codeql.exe>
```

If `FAIL`: install the **VS Code / Antigravity IDE CodeQL extension** (`github.vscode-codeql`)
or a [standalone CodeQL CLI](https://github.com/github/codeql-cli-binaries/releases).

---

## B) Verify CodeQL GitHub workflow

After changing `.github/workflows/codeql.yml` (already done):

```powershell
git add .github/workflows/codeql.yml
git commit -m "chore(tools): activate CodeQL on implementing"
git push origin implementing
```

Then open **GitHub → Actions → CodeQL**.

**Expected**:
- Workflow runs on `implementing` push.
- Jobs for `go` and `javascript-typescript`.
- Results appear in **Security → Code scanning** (if repo permissions allow).

---

## C) Configure SonarQube

### 1. Add GitHub secrets/variables

In **GitHub repository → Settings → Secrets and variables → Actions**:

| Type     | Name               | Value                                              |
|----------|--------------------|----------------------------------------------------|
| Secret   | `SONAR_TOKEN`      | Your Semgrep/SonarQube token                       |
| Variable | `SONAR_HOST_URL`   | `https://semgrep.dev` (or your SonarQube Server URL) |

> For Semgrep at `https://semgrep.dev/orgs/bthwani2_personal_org`, use the token
> from that account and set `SONAR_HOST_URL=https://semgrep.dev`.

### 2. Verify config locally

```powershell
pnpm run diagnostics:sonarqube:config
```

**Expected**:
```
SONARQUBE_CONFIG: PASS
```

### 3. Push and trigger workflow

```powershell
git add .github/workflows/sonarqube.yml sonar-project.properties
git commit -m "chore(tools): add SonarQube analysis"
git push origin implementing
```

**Expected**:
- SonarQube workflow starts on `implementing`.
- Runs: install → OpenAPI generate → typecheck → test → scan.
- If secret/URL missing: workflow fails with Sonar auth/config error.

---

## D) Verify Go AST extractor

```powershell
pnpm run diagnostics:go-routes
```

**Expected**:
```
GO_AST_ROUTES DSH:      PASS routes=<n>
GO_AST_ROUTES WLT:      PASS routes=<n>
GO_AST_ROUTES Identity: PASS routes=<n>
GO_AST_EXTRACTOR: PASS
```

Combined JSON written to `.diagnostics/tools/go-routes.json` (gitignored).

---

## E) Start Jaeger

```powershell
pnpm run runtime:observability:up
```

Then open: **<http://localhost:16686>**

---

## F) Send OpenTelemetry test span

> Jaeger must be running first (see E).

```powershell
pnpm run diagnostics:otel:smoke
```

**Expected**:
```
OTEL_SMOKE: PASS
Jaeger UI: http://localhost:16686
  Service: bthwani-tools-smoke
  Span:    bthwani.otel.smoke
```

In Jaeger UI:
- Search service: `bthwani-tools-smoke`
- Trace name: `bthwani.otel.smoke`

---

## G) Full tools check

```powershell
pnpm run diagnostics:tools
```

Runs all non-destructive checks in order. Jaeger NOT_RUNNING is a warning only.
Pass `-Strict` flag to fail on missing Jaeger:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/check-diagnostic-tools.ps1 -Strict
```

---

## Status Table

| Tool              | Local check command                  | GitHub trigger                                     |
|-------------------|--------------------------------------|---------------------------------------------------|
| CodeQL local      | `diagnostics:codeql:local`           | N/A                                               |
| CodeQL CI         | Push to `implementing`               | GitHub Actions → CodeQL                           |
| SonarQube config  | `diagnostics:sonarqube:config`       | Requires `SONAR_TOKEN` + `SONAR_HOST_URL` in GH  |
| Go AST extractor  | `diagnostics:go-routes`              | N/A (local only)                                  |
| Jaeger            | `runtime:observability:up`           | Local Docker                                      |
| OpenTelemetry     | `diagnostics:otel:smoke`             | Local (Jaeger must be running)                    |
| All tools         | `diagnostics:tools`                  | N/A                                               |

---

## NOT activated (planned for later phases)

- Platform closure
- Playwright / Maestro / Detox
- OTel instrumentation inside services (requires per-service work)
