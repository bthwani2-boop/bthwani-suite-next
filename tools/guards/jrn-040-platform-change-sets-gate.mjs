import fs from "node:fs";

const contractFile = "core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml";
const generatedClientFile = "core/platform-control/clients/generated/jrn-040-platform-change-sets-api.ts";
const requiredFiles = [
  "governance/product/contracts/jrn-040-platform-change-sets.product-truth.json",
  "core/platform-control/database/migrations/platform-005_jrn040_change_set_validation.sql",
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_read_create.go",
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_workflow.go",
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_apply_rollback.go",
  contractFile,
  generatedClientFile,
  "services/dsh/frontend/shared/platform/platform-control.api.ts",
  "services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx",
  "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing:${file}`);
}

function requireText(file, tokens) {
  const content = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`missing-token:${file}:${token}`);
  }
}

if (failures.length === 0) {
  const truth = JSON.parse(fs.readFileSync(requiredFiles[0], "utf8"));
  if (truth.journeyId !== "JRN-040") failures.push("product-truth:journeyId");
  if (truth.status !== "PENDING_INDEPENDENT_APPROVAL") failures.push("product-truth:status");
  for (const invariant of [
    "approve_or_reject_own_change_set",
    "apply_stale_or_conflicting_change_set",
    "rollback_without_reason",
    "store_secret_or_credential_values_in_change_sets",
  ]) {
    if (!truth.forbiddenActions.includes(invariant)) failures.push(`product-truth:forbidden:${invariant}`);
  }

  requireText("core/platform-control/database/migrations/platform-005_jrn040_change_set_validation.sql", [
    "validated_value_json",
    "validated_revision",
    "validated_at",
    "idx_platform_change_set_items_target_reservation",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/jrn040_change_set_workflow.go", [
    "ensureNoActiveTargetConflict",
    "verifyGovernedPreconditions",
    "ErrMakerCheckerReview",
    "pg_advisory_xact_lock",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/jrn040_change_set_apply_rollback.go", [
    "RollbackChangeSetGoverned",
    "ErrRollbackReason",
    "variableStateSnapshot",
    "featureFlagStateSnapshot",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/jrn040_change_set_read_create.go", [
    "ErrSensitiveValue",
    "proposedValueContainsSecret",
    "valuesRedacted",
    "maxGovernedChangeSetItems",
  ]);
  requireText("core/platform-control/backend/internal/http/workflow_handlers.go", [
    "RollbackChangeSetInput",
    "PLATFORM_TARGET_CONFLICT",
    "PLATFORM_SENSITIVE_VALUE_FORBIDDEN",
    "PLATFORM_ROLLBACK_REASON_REQUIRED",
  ]);
  requireText(contractFile, [
    "RollbackPlatformChangeSetInput",
    "preconditionSnapshot",
    "validatedRevision",
    "itemValidatedAt",
    "maxItems: 50",
  ]);
  requireText(generatedClientFile, [
    "RollbackPlatformChangeSetInput",
    "preconditionSnapshot",
    "validatedRevision",
    "itemValidatedAt",
    "CreatePlatformChangeSetItemInput",
  ]);
  requireText("services/dsh/frontend/shared/platform/platform-control.api.ts", [
    "RollbackPlatformChangeSetInput",
    "rollbackPlatformChangeSet",
    "body: input",
  ]);
  requireText("services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx", [
    "تفاصيل الطلب والفرق المتوقع",
    "سبب التراجع الإلزامي",
    "preconditionSnapshot",
    "proposedValue",
    "draftItems",
  ]);
}

if (failures.length > 0) {
  console.error("JRN-040 gate failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("JRN-040 platform change-set gate passed");
