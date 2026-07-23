from __future__ import annotations

import json
from pathlib import Path


def gh_expr(value: str) -> str:
    return "$" + "{{ " + value + " }}"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"{label} anchor not found")
    return text.replace(old, new, 1)


ci = Path(".github/workflows/ci.yml")
text = ci.read_text(encoding="utf-8")
github_token = gh_expr("github.token")
contracts_if = gh_expr("needs.context.outputs.contracts == 'true'")
full_if = gh_expr("needs.context.outputs.full_verification == 'true'")

setup_anchor = (
    "      - name: Set up locked Node runtime\n"
    "        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n"
    "        with:\n"
    "          node-version: \"24.17.0\"\n"
)
locator_step = (
    "      - name: Publish contextual CI run locator\n"
    "        shell: bash\n"
    "        env:\n"
    f"          GH_TOKEN: {github_token}\n"
    "        run: |\n"
    "          set -euo pipefail\n"
    "          jq -n \\\n"
    "            --arg state pending \\\n"
    "            --arg context bthwani/contextual-ci \\\n"
    "            --arg description \"contextual CI routing and verification are running\" \\\n"
    "            --arg target_url \"${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}\" \\\n"
    "            '{state:$state,context:$context,description:$description,target_url:$target_url}' > /tmp/contextual-ci-status.json\n"
    "          curl --fail-with-body --retry 3 \\\n"
    "            -X POST \\\n"
    "            -H \"Accept: application/vnd.github+json\" \\\n"
    "            -H \"Authorization: Bearer ${GH_TOKEN}\" \\\n"
    "            -H \"X-GitHub-Api-Version: 2022-11-28\" \\\n"
    "            \"${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/statuses/${GITHUB_SHA}\" \\\n"
    "            --data-binary @/tmp/contextual-ci-status.json\n"
)
if "name: Publish contextual CI run locator" not in text:
    text = replace_once(text, setup_anchor, setup_anchor + locator_step, "context setup")

policy_old = (
    "      - name: Verify canonical governance and commands\n"
    "        run: |\n"
    "          pnpm run guard:governance-schema\n"
    "          pnpm run guard:agent-governance\n"
    "          pnpm run guard:authority-separation\n"
    "          pnpm run guard:saas-governance\n"
    "          pnpm run guard:guard-registry\n"
    "          pnpm run guard:sdlc\n"
    "          pnpm run guard:cleanup-policy\n"
    "          pnpm run guard:required-command-integrity\n"
)
policy_new = (
    "      - name: Verify governance schema\n"
    "        run: pnpm run guard:governance-schema\n"
    "      - name: Verify agent governance\n"
    "        run: pnpm run guard:agent-governance\n"
    "      - name: Verify authority separation\n"
    "        run: pnpm run guard:authority-separation\n"
    "      - name: Verify SaaS governance\n"
    "        run: pnpm run guard:saas-governance\n"
    "      - name: Verify guard registry\n"
    "        run: pnpm run guard:guard-registry\n"
    "      - name: Verify SDLC governance\n"
    "        run: pnpm run guard:sdlc\n"
    "      - name: Verify cleanup policy\n"
    "        run: pnpm run guard:cleanup-policy\n"
    "      - name: Verify required command integrity\n"
    "        run: pnpm run guard:required-command-integrity\n"
)
text = replace_once(text, policy_old, policy_new, "policy aggregate")

contracts_old = (
    "      - name: Verify imports, contracts, and bindings\n"
    f"        if: {contracts_if}\n"
    "        run: |\n"
    "          pnpm run guard:no-broken-imports\n"
    "          pnpm run contracts:lint\n"
    "          pnpm run guard:api-binding\n"
    "          pnpm run guard:backend-api-binding\n"
    "          pnpm run guard:service-manifest-drift\n"
    "          pnpm run guard:frontend-feature-binding\n"
    "          pnpm run guard:runtime-real-bindings\n"
    "          pnpm run guard:live-cross-journey-integrity\n"
)
contracts_new = (
    "      - name: Verify imports resolve\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:no-broken-imports\n"
    "      - name: Verify contract foundation\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run contracts:lint\n"
    "      - name: Verify frontend API binding\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:api-binding\n"
    "      - name: Verify backend API binding\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:backend-api-binding\n"
    "      - name: Verify service manifest drift\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:service-manifest-drift\n"
    "      - name: Verify frontend feature binding\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:frontend-feature-binding\n"
    "      - name: Verify runtime-facing bindings\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:runtime-real-bindings\n"
    "      - name: Verify cross-journey integrity\n"
    f"        if: {contracts_if}\n"
    "        run: pnpm run guard:live-cross-journey-integrity\n"
)
text = replace_once(text, contracts_old, contracts_new, "contracts aggregate")

node_old = (
    "      - name: Verify complete Node workspace\n"
    f"        if: {full_if}\n"
    "        run: |\n"
    "          pnpm run nx:typecheck\n"
    "          pnpm run nx:lint\n"
    "          pnpm run nx:test\n"
    "          pnpm run nx:build\n"
)
node_new = (
    "      - name: Verify complete Node typecheck\n"
    f"        if: {full_if}\n"
    "        run: pnpm run nx:typecheck\n"
    "      - name: Verify complete Node lint\n"
    f"        if: {full_if}\n"
    "        run: pnpm run nx:lint\n"
    "      - name: Verify complete Node tests\n"
    f"        if: {full_if}\n"
    "        run: pnpm run nx:test\n"
    "      - name: Verify complete Node builds\n"
    f"        if: {full_if}\n"
    "        run: pnpm run nx:build\n"
)
text = replace_once(text, node_old, node_new, "complete Node aggregate")
ci.write_text(text, encoding="utf-8")

test_path = Path("services/dsh/backend/internal/http/catalog_contract_alignment_test.go")
test_text = test_path.read_text(encoding="utf-8")
test_text = replace_once(
    test_text,
    '"operationId: updatePartnerProductProposal"',
    '"operationId: patchPartnerProductProposal"',
    "partner catalog operation",
)
test_text = replace_once(
    test_text,
    '"operationId: updateFieldProductProposal"',
    '"operationId: patchFieldProductProposal"',
    "field catalog operation",
)
test_path.write_text(test_text, encoding="utf-8")

trigger = Path("governance/github/lianbassam-full-verification.trigger.json")
doc = json.loads(trigger.read_text(encoding="utf-8"))
doc["attempt"] = 12
doc["previousRunId"] = 29980139926
remediation = doc.setdefault("remediation", [])
for marker in [
    "VERIFY_PER_GUARD_CANONICAL_CI_OBSERVABILITY",
    "VERIFY_DSH_CATALOG_OPERATION_ID_ALIGNMENT",
    "VERIFY_PER_TARGET_NODE_WORKSPACE_RESULTS",
]:
    if marker not in remediation:
        remediation.append(marker)
trigger.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("Rendered canonical CI observability, DSH alignment, and verification trigger.")
