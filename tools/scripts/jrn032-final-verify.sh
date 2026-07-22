#!/usr/bin/env bash
set -euo pipefail

SOURCE_SHA="${JRN032_SOURCE_SHA:?JRN032_SOURCE_SHA is required}"
VERIFICATION_HEAD="${JRN032_VERIFICATION_HEAD:?JRN032_VERIFICATION_HEAD is required}"
RUN_ID="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"
BUNDLE_PATH="services/dsh/contracts/generated/dsh.bundle.openapi.yaml"
CLIENT_PATH="services/dsh/clients/generated/dsh-api.ts"

echo "[JRN-032] Registering canonical OpenAPI paths"
node tools/scripts/patch-jrn032-openapi.mjs

echo "[JRN-032] Formatting governed Go files"
gofmt -w \
  services/dsh/backend/internal/analytics/analytics.go \
  services/dsh/backend/internal/analytics/jrn032_window.go \
  services/dsh/backend/internal/analytics/jrn032_preparation.go \
  services/dsh/backend/internal/analytics/jrn032_people.go \
  services/dsh/backend/internal/analytics/jrn032_drilldown.go \
  services/dsh/backend/internal/analytics/jrn032_window_test.go \
  services/dsh/backend/internal/analytics/jrn032_drilldown_test.go \
  services/dsh/backend/internal/http/analytics.go \
  services/dsh/backend/internal/http/jrn032_analytics.go \
  services/dsh/backend/internal/http/jrn032_routes.go \
  services/dsh/backend/internal/http/jrn032_routes_test.go \
  services/dsh/backend/internal/http/delivery_proof_routes.go \
  services/dsh/backend/internal/wlt/analytics_read.go \
  services/dsh/backend/internal/wlt/analytics_read_test.go

echo "[JRN-032] Composing OpenAPI and generating the DSH client"
pnpm --dir services/dsh openapi:verify
FIRST_BUNDLE_SHA="$(sha256sum "${BUNDLE_PATH}" | awk '{print $1}')"
FIRST_CLIENT_SHA="$(sha256sum "${CLIENT_PATH}" | awk '{print $1}')"

echo "[JRN-032] Running Go verification"
(
  cd services/dsh/backend
  go test ./internal/analytics ./internal/wlt ./internal/http
)

echo "[JRN-032] Running TypeScript verification"
pnpm --dir services/dsh typecheck
pnpm --dir apps/control-panel/runtime typecheck
pnpm --dir apps/app-partner/runtime typecheck

echo "[JRN-032] Running ownership and contract gates"
pnpm run guard:fullstack-boundary
pnpm run guard:wlt-financial-boundary
pnpm run contracts:lint
pnpm --dir services/dsh openapi:test
pnpm run swagger:build

echo "[JRN-032] Verifying generated artifacts are deterministic"
pnpm --dir services/dsh openapi:verify
SECOND_BUNDLE_SHA="$(sha256sum "${BUNDLE_PATH}" | awk '{print $1}')"
SECOND_CLIENT_SHA="$(sha256sum "${CLIENT_PATH}" | awk '{print $1}')"
if [[ "${FIRST_BUNDLE_SHA}" != "${SECOND_BUNDLE_SHA}" || "${FIRST_CLIENT_SHA}" != "${SECOND_CLIENT_SHA}" ]]; then
  echo "Generated DSH artifacts changed between consecutive generation passes." >&2
  exit 1
fi

echo "[JRN-032] Writing final remote verification evidence"
export SOURCE_SHA VERIFICATION_HEAD RUN_ID RUN_ATTEMPT
python - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

verified_at = datetime.now(timezone.utc).isoformat()
registry_path = Path("governance/evidence/JRN-032_SLICE_VERIFICATION.json")
registry = json.loads(registry_path.read_text(encoding="utf-8"))
for item in registry["slices"]:
    item["status"] = "verified_remote"
registry["formalDecision"] = "TECHNICALLY_CLOSED_PENDING_INDEPENDENT_ACCEPTANCE"
registry["remoteVerification"] = {
    "sourceSha": os.environ["SOURCE_SHA"],
    "verificationHead": os.environ["VERIFICATION_HEAD"],
    "workflowRunId": int(os.environ["RUN_ID"]),
    "runAttempt": int(os.environ["RUN_ATTEMPT"]),
    "verifiedAt": verified_at,
    "checks": [
        "canonical OpenAPI root composition",
        "generated DSH bundle and TypeScript client",
        "Go analytics WLT and HTTP tests",
        "DSH control-panel and partner typechecks",
        "full-stack and WLT ownership guards",
        "repository contract lint",
        "focused OpenAPI tests and Swagger publication",
        "deterministic generated artifacts across consecutive generation passes",
    ],
}
registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

Path("governance/evidence/JRN-032_FINAL_REMOTE_VERIFICATION.md").write_text(
    f"""# JRN-032 Final Remote Verification

- repository_mode: REMOTE_ONLY
- source_branch: sambassam
- verified_source_sha: {os.environ['SOURCE_SHA']}
- verification_head: {os.environ['VERIFICATION_HEAD']}
- workflow_run_id: {os.environ['RUN_ID']}
- run_attempt: {os.environ['RUN_ATTEMPT']}
- verified_at: {verified_at}
- technical_decision: TECHNICALLY_CLOSED_PENDING_INDEPENDENT_ACCEPTANCE

## Passed technical checks

- Canonical OpenAPI root composition and generated DSH bundle/client.
- Analytics, WLT read-only boundary, and protected HTTP route tests.
- DSH, control-panel, and partner TypeScript typechecks.
- Full-stack and financial ownership guards.
- Repository contract lint.
- Focused OpenAPI tests and Swagger build.
- Deterministic generated artifacts across consecutive generation passes.

## Independent gates

Product Manager, Product Owner, financial-control, deployment, and live-environment acceptance remain independent and are not self-approved by engineering automation.
""",
    encoding="utf-8",
)
PY

echo "[JRN-032] Committing verified materialization and evidence"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add \
  services/dsh/contracts/dsh.openapi.yaml \
  services/dsh/contracts/generated/dsh.bundle.openapi.yaml \
  services/dsh/clients/generated/dsh-api.ts \
  services/dsh/backend/internal/analytics \
  services/dsh/backend/internal/http/analytics.go \
  services/dsh/backend/internal/http/jrn032_analytics.go \
  services/dsh/backend/internal/http/jrn032_routes.go \
  services/dsh/backend/internal/http/jrn032_routes_test.go \
  services/dsh/backend/internal/http/delivery_proof_routes.go \
  services/dsh/backend/internal/wlt/analytics_read.go \
  services/dsh/backend/internal/wlt/analytics_read_test.go \
  governance/evidence/JRN-032_SLICE_VERIFICATION.json \
  governance/evidence/JRN-032_FINAL_REMOTE_VERIFICATION.md

if git diff --cached --quiet; then
  echo "[JRN-032] No materialized changes to commit."
else
  git commit -m "chore(jrn-032): materialize verified technical closure [skip ci]"
  git pull --rebase origin "${VERIFICATION_HEAD}"
  git push origin "HEAD:${VERIFICATION_HEAD}"
fi

echo "[JRN-032] Final verification completed successfully"
