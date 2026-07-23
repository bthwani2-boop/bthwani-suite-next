from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    text = read(relative)
    if new in text and old not in text:
        return
    if old not in text:
        raise RuntimeError(f"missing patch anchor in {relative}: {old[:120]!r}")
    write(relative, text.replace(old, new, 1))


# Master-index the active COD custody proxy contract so frontend adapters are
# checked against the same contract inventory as backend routes.
replace_once(
    "contracts/master.openapi.yaml",
    "    dshPayoutDestinations: ../services/dsh/contracts/dsh.jrn-037-payouts-destinations.openapi.yaml\n",
    "    dshPayoutDestinations: ../services/dsh/contracts/dsh.jrn-037-payouts-destinations.openapi.yaml\n"
    "    dshCodCustody: ../services/dsh/contracts/dsh.jrn-038-cod-custody.openapi.yaml\n",
)

# The primary modular contract deliberately keeps the bounded PUT compatibility
# operation. Give the canonical PATCH operations in the standalone catalog
# contract distinct operation IDs so both transports are explicit and generated.
replace_once(
    "services/dsh/contracts/dsh.catalog.openapi.yaml",
    "      operationId: updatePartnerProductProposal\n",
    "      operationId: patchPartnerProductProposal\n",
)
replace_once(
    "services/dsh/contracts/dsh.catalog.openapi.yaml",
    "      operationId: updateFieldProductProposal\n",
    "      operationId: patchFieldProductProposal\n",
)

# Document the actor-owned notification preference read route next to its
# existing mutation route.
notification_path = "services/dsh/contracts/paths/misc.paths.yaml"
notification_anchor = """/dsh/notifications/preferences:
  put:
"""
notification_replacement = """/dsh/notifications/preferences:
  get:
    operationId: getDshNotificationPreferences
    summary: List notification preferences for the authenticated actor.
    tags: [notifications]
    security:
      - bearerAuth: []
    responses:
      \"200\":
        description: Actor-owned notification preference policies.
        content:
          application/json:
            schema:
              type: object
              required: [preferences]
              properties:
                preferences:
                  type: array
                  items: { $ref: \"../dsh.openapi.yaml#/components/schemas/DshNotificationPreference\" }
      \"400\": { $ref: \"../dsh.openapi.yaml#/components/responses/InvalidRequest\" }
      \"401\": { $ref: \"../dsh.openapi.yaml#/components/responses/Unauthenticated\" }
  put:
"""
replace_once(notification_path, notification_anchor, notification_replacement)

# Add the real DSH administration support-session proxy surface. These routes
# are governed maker/checker flows backed by Identity support sessions; no
# credential or token material is persisted in DSH.
administration_path = "services/dsh/contracts/dsh.administration.openapi.yaml"
administration_anchor = "components:\n"
administration_block = """  /operator/admin/support-sessions:
    get:
      operationId: listDshAdministrationSupportSessionRequests
      description: Lists governed support-session requests without exposing issued bearer tokens.
      parameters:
        - name: status
          in: query
          required: false
          schema: { type: string, enum: [pending, approved, rejected, issued, revoked, expired] }
      responses:
        \"200\":
          description: Support-session request queue.
          content:
            application/json:
              schema:
                type: object
                required: [requests]
                properties:
                  requests: { type: array, items: { type: object, additionalProperties: true } }
        \"400\": { description: Invalid status filter. }
        \"401\": { description: Authentication required. }
        \"403\": { description: Administration read permission required. }
    post:
      operationId: createDshAdministrationSupportSessionRequest
      description: Creates a pending support-session request; issuance requires an independent checker.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [targetActorId, reason, durationMinutes]
              properties:
                targetActorId: { type: string, minLength: 1 }
                reason: { type: string, minLength: 5, maxLength: 1000 }
                durationMinutes: { type: integer, minimum: 1, maximum: 120 }
      responses:
        \"202\": { description: Pending support-session request created. }
        \"400\": { description: Invalid request. }
        \"401\": { description: Authentication required. }
        \"403\": { description: Administration manage permission required. }
        \"409\": { description: Equivalent request is active or source state changed. }
        \"503\": { description: Identity support-session integration is not configured. }
  /operator/admin/support-sessions/{requestId}/review:
    post:
      operationId: reviewDshAdministrationSupportSessionRequest
      description: Independently approves or rejects a pending support-session request.
      parameters:
        - $ref: \"#/components/parameters/RequestId\"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [decision, expectedVersion]
              properties:
                decision: { type: string, enum: [approved, rejected] }
                reviewNote: { type: string, maxLength: 1000 }
                expectedVersion: { type: integer, minimum: 1 }
      responses:
        \"200\": { description: Request reviewed; an approved response may include the one-time Identity handoff result. }
        \"400\": { description: Invalid review. }
        \"403\": { description: Self-approval or missing approval permission. }
        \"404\": { description: Request not found. }
        \"409\": { description: Version or lifecycle conflict. }
        \"502\": { description: Identity denied the support-session handoff. }
  /operator/admin/support-sessions/{requestId}/revoke:
    post:
      operationId: revokeDshAdministrationSupportSessionRequest
      description: Revokes the Identity support session and appends the DSH request lifecycle evidence.
      parameters:
        - $ref: \"#/components/parameters/RequestId\"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [reason]
              properties:
                reason: { type: string, minLength: 3, maxLength: 1000 }
      responses:
        \"200\": { description: Support session revoked. }
        \"400\": { description: Invalid revocation. }
        \"403\": { description: Administration approval permission required. }
        \"404\": { description: Request not found. }
        \"409\": { description: Request is no longer revocable. }
  /operator/admin/support/snapshot:
    get:
      operationId: getDshAdministrationSupportSnapshot
      description: Returns a privacy-scoped snapshot only for a valid Identity support session with actor-bound support.read permission.
      responses:
        \"200\": { description: Identity support-session context and privacy-scoped operational snapshot. }
        \"401\": { description: Support bearer session required. }
        \"403\": { description: Session invalid, expired, or outside its actor scope. }
        \"503\": { description: Identity support-session integration is not configured. }

components:
"""
replace_once(administration_path, administration_anchor, administration_block)

# Register the implemented operations analytics endpoint in the existing manual
# analytics extension contract.
analytics_path = "services/dsh/contracts/dsh.analytics-extensions.openapi.yaml"
analytics_anchor = """  /dsh/operator/analytics/export.csv:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1export.csv"
"""
analytics_replacement = analytics_anchor + """  /dsh/operator/analytics/operations:
    get:
      operationId: getDshOperationsAnalytics
      summary: Return the governed operations analytics projection.
      security: [{ bearerAuth: [] }]
      parameters:
        - name: period
          in: query
          required: false
          schema: { type: string, enum: [today, week, month], default: today }
      responses:
        \"200\":
          description: Operations analytics projection.
          content:
            application/json:
              schema: { type: object, additionalProperties: true }
        \"400\": { description: Invalid analytics period. }
        \"401\": { description: Authentication required. }
        \"403\": { description: Analytics read permission required. }
"""
replace_once(analytics_path, analytics_anchor, analytics_replacement)

# Govern bounded compatibility aliases instead of pretending they are separate
# canonical APIs.
classification_path = ROOT / "services/dsh/contracts/backend-route-classification.json"
classification = json.loads(classification_path.read_text(encoding="utf-8"))
extra_classifications = [
    {
        "route": "PUT /dsh/operator/catalog/stores/{storeId}/images/{role}",
        "classification": "LEGACY_COMPATIBILITY",
        "canonicalRoute": "PUT /dsh/stores/{storeId}/images/{role}",
        "owner": "central-catalog",
        "retirementState": "DEPRECATED_SUPPORTED",
    },
    {
        "route": "GET /dsh/partner/catalog/proposals",
        "classification": "LEGACY_COMPATIBILITY",
        "canonicalRoute": "GET /dsh/partner/catalog/product-proposals",
        "owner": "central-catalog",
        "retirementState": "DEPRECATED_SUPPORTED",
    },
]
existing_routes = {entry["route"] for entry in classification["routes"]}
for entry in extra_classifications:
    if entry["route"] not in existing_routes:
        classification["routes"].append(entry)
classification["routes"].sort(key=lambda item: item["route"])
classification_path.write_text(json.dumps(classification, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# Install a real fail-closed runtime accessibility command. The command requires
# an explicit running URL and therefore never converts missing runtime evidence
# into a false pass.
a11y_gate = ROOT / "tools/guards/a11y-runtime-gate.mjs"
a11y_gate.write_text(
    """import AxeBuilder from \"@axe-core/playwright\";
import { chromium } from \"@playwright/test\";

const guardId = \"a11y-runtime-gate\";
const baseUrl = process.env.A11Y_RUNTIME_URL?.trim();
if (!baseUrl) {
  console.error(`${guardId}: FAIL A11Y_RUNTIME_URL is required and must point to a running surface`);
  process.exit(1);
}

const paths = (process.env.A11Y_RUNTIME_PATHS ?? \"/\")
  .split(\",\")
  .map((value) => value.trim())
  .filter(Boolean);
if (paths.length === 0) {
  console.error(`${guardId}: FAIL A11Y_RUNTIME_PATHS resolved to an empty route set`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const findings = [];
try {
  const context = await browser.newContext({ locale: \"ar-YE\" });
  for (const route of paths) {
    const page = await context.newPage();
    const target = new URL(route, baseUrl).toString();
    const response = await page.goto(target, { waitUntil: \"networkidle\", timeout: 60_000 });
    if (!response || !response.ok()) {
      findings.push({ target, reason: `HTTP_${response?.status() ?? \"NO_RESPONSE\"}` });
      await page.close();
      continue;
    }
    const result = await new AxeBuilder({ page })
      .withTags([\"wcag2a\", \"wcag2aa\", \"wcag21a\", \"wcag21aa\", \"wcag22aa\"])
      .analyze();
    for (const violation of result.violations) {
      findings.push({
        target,
        rule: violation.id,
        impact: violation.impact ?? \"unknown\",
        nodes: violation.nodes.length,
        help: violation.help,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (findings.length > 0) {
  console.error(`${guardId}: FAIL`);
  for (const finding of findings) console.error(JSON.stringify(finding));
  process.exit(1);
}
console.log(`${guardId}: PASS routes=${paths.length}`);
""",
    encoding="utf-8",
)

package_path = ROOT / "package.json"
package_doc = json.loads(package_path.read_text(encoding="utf-8"))
package_doc["scripts"]["guard:a11y-runtime"] = "node tools/guards/a11y-runtime-gate.mjs"
package_path.write_text(json.dumps(package_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

guard_registry_path = ROOT / "governance/guards/guard-registry.json"
guard_registry = json.loads(guard_registry_path.read_text(encoding="utf-8"))
for entry in guard_registry["entries"]:
    if entry.get("id") == "a11y-runtime":
        entry["source_file"] = "tools/guards/a11y-runtime-gate.mjs"
        break
else:
    raise RuntimeError("a11y-runtime registry entry is missing")
guard_registry_path.write_text(json.dumps(guard_registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# Renumber colliding WLT migrations after the existing JRN-036 sequence while
# preserving each journey's dependency order. Update every tracked text
# reference so tests, diagnostics and evidence stay aligned.
renames = {
    "wlt-033_jrn027_subscription_lifecycle.sql": "wlt-095_jrn027_subscription_lifecycle.sql",
    "wlt-034_jrn_028_promotion_funding_audit_integrity.sql": "wlt-096_jrn_028_promotion_funding_audit_integrity.sql",
    "wlt-038_cod_custody_evidence_reconciliation.sql": "wlt-097_cod_custody_evidence_reconciliation.sql",
    "wlt-091_jrn037_payout_destination_governance.sql": "wlt-098_jrn037_payout_destination_governance.sql",
    "wlt-092_jrn037_request_hash_scope.sql": "wlt-099_jrn037_request_hash_scope.sql",
    "wlt-093_jrn037_payout_destination_reference.sql": "wlt-100_jrn037_payout_destination_reference.sql",
    "wlt-094_jrn037_reconciliation_single_claim.sql": "wlt-101_jrn037_reconciliation_single_claim.sql",
}
text_suffixes = {".json", ".md", ".mjs", ".js", ".ts", ".tsx", ".ps1", ".py", ".sql", ".yaml", ".yml", ".txt"}
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or "node_modules" in path.parts:
        continue
    if path.suffix.lower() not in text_suffixes and path.name not in {"package.json", "pnpm-lock.yaml"}:
        continue
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    updated = content
    for old_name, new_name in renames.items():
        updated = updated.replace(old_name, new_name)
    if updated != content:
        path.write_text(updated, encoding="utf-8")

migration_dir = ROOT / "services/wlt/database/migrations"
comment_numbers = {
    "wlt-095_jrn027_subscription_lifecycle.sql": ("WLT-033", "WLT-095"),
    "wlt-096_jrn_028_promotion_funding_audit_integrity.sql": ("WLT-034", "WLT-096"),
    "wlt-098_jrn037_payout_destination_governance.sql": ("WLT-091", "WLT-098"),
    "wlt-099_jrn037_request_hash_scope.sql": ("WLT-092", "WLT-099"),
    "wlt-100_jrn037_payout_destination_reference.sql": ("WLT-093", "WLT-100"),
    "wlt-101_jrn037_reconciliation_single_claim.sql": ("WLT-094", "WLT-101"),
}
for old_name, new_name in renames.items():
    old_path = migration_dir / old_name
    new_path = migration_dir / new_name
    if old_path.exists() and not new_path.exists():
        old_path.rename(new_path)
    elif not new_path.exists():
        raise RuntimeError(f"migration rename source and target are both missing: {old_name}")
for filename, (old_number, new_number) in comment_numbers.items():
    path = migration_dir / filename
    path.write_text(path.read_text(encoding="utf-8").replace(old_number, new_number), encoding="utf-8")

probe_path = "infra/docker/scripts/wlt-migration-probes.ps1"
probe_anchor = """  \"wlt-093_jrn036_mutation_receipts.sql\" = \"to_regclass('public.wlt_jrn036_mutation_receipts') IS NOT NULL AND to_regclass('public.wlt_jrn036_mutation_receipts_aggregate_idx') IS NOT NULL AND to_regclass('public.wlt_jrn036_mutation_receipts_request_hash_idx') IS NOT NULL\"
"""
probe_replacement = probe_anchor + """  \"wlt-095_jrn027_subscription_lifecycle.sql\" = \"to_regclass('public.wlt_subscription_lifecycle_events') IS NOT NULL AND to_regclass('public.wlt_subscription_compensations') IS NOT NULL\"
  \"wlt-096_jrn_028_promotion_funding_audit_integrity.sql\" = \"EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_promotion_funding_events' AND column_name = 'transaction_id') AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wlt_require_promotion_funding_transition_event' AND NOT tgisinternal)\"
  \"wlt-097_cod_custody_evidence_reconciliation.sql\" = \"to_regclass('public.wlt_cod_custody_evidence') IS NOT NULL AND to_regclass('public.wlt_cod_reconciliation_cases') IS NOT NULL AND to_regclass('public.wlt_cod_reconciliation_audit_events') IS NOT NULL\"
  \"wlt-098_jrn037_payout_destination_governance.sql\" = \"to_regclass('public.wlt_jrn037_payout_audit_events') IS NOT NULL AND to_regclass('public.wlt_jrn037_payout_outbox') IS NOT NULL AND to_regclass('public.wlt_jrn037_payout_reconciliations') IS NOT NULL\"
  \"wlt-099_jrn037_request_hash_scope.sql\" = \"to_regclass('public.wlt_payout_requests_request_hash_idx') IS NOT NULL\"
  \"wlt-100_jrn037_payout_destination_reference.sql\" = \"EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wlt_payout_requests_destination_fk')\"
  \"wlt-101_jrn037_reconciliation_single_claim.sql\" = \"EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wlt_jrn037_single_reconciliation_claim_trigger' AND NOT tgisinternal)\"
"""
replace_once(probe_path, probe_anchor, probe_replacement)

# Remove all one-shot diagnostic/apply surfaces before governance validation and
# before the resulting commit is pushed. The branch returns to one canonical CI.
temporary_paths = [
    ".github/workflows/saas-diagnostic.yml",
    ".github/workflows/lian-remediation-diagnostics.yml",
    ".github/workflows/lian-route-inventory.yml",
    ".github/workflows/lian-remediation-apply.yml",
    "governance/github/lian-remediation-diagnostics.trigger.json",
    "governance/github/lian-route-inventory.trigger.json",
]
for relative in temporary_paths:
    (ROOT / relative).unlink(missing_ok=True)

Path(__file__).unlink(missing_ok=True)
print("Lian remediation patch applied; temporary execution surfaces removed.")
