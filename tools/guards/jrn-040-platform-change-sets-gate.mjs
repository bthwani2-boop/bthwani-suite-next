import fs from "node:fs";

const productTruthFile = "governance/product/contracts/jrn-040-platform-change-sets.product-truth.json";
const validationMigrationFile = "core/platform-control/database/migrations/platform-005_jrn040_change_set_validation.sql";
const sensitiveBoundaryMigrationFile = "core/platform-control/database/migrations/platform-006_jrn040_sensitive_change_boundary.sql";
const contractFile = "core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml";
const generatedClientFile = "core/platform-control/clients/generated/jrn-040-platform-change-sets-api.ts";
const strictBoundaryFile = "core/platform-control/backend/internal/platformcontrol/jrn040_strict_boundary.go";
const strictBoundaryProofFile = "core/platform-control/backend/internal/platformcontrol/jrn040_strict_boundary_test.go";
const databaseProofFile = "core/platform-control/backend/internal/platformcontrol/jrn040_database_sensitive_guard_test.go";
const httpProofFile = "core/platform-control/backend/internal/http/jrn040_workflow_handlers_test.go";
const workflowFile = ".github/workflows/jrn-040-platform-change-sets-verification.yml";
const requiredFiles = [
  productTruthFile,
  validationMigrationFile,
  sensitiveBoundaryMigrationFile,
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_read_create.go",
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_workflow.go",
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_apply_rollback.go",
  strictBoundaryFile,
  "core/platform-control/backend/internal/platformcontrol/jrn040_change_set_governance_test.go",
  strictBoundaryProofFile,
  databaseProofFile,
  "core/platform-control/backend/internal/platformcontrol/repository_integration_test.go",
  "core/platform-control/backend/internal/http/workflow_handlers.go",
  httpProofFile,
  contractFile,
  generatedClientFile,
  "services/dsh/frontend/shared/platform/platform-control.api.ts",
  "services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx",
  "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx",
  workflowFile,
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
  const truth = JSON.parse(fs.readFileSync(productTruthFile, "utf8"));
  const evidenceReferences = new Set(truth.problem?.evidenceReferences ?? []);
  const forbiddenActions = new Set((truth.actors ?? []).flatMap((actor) => actor.forbiddenActions ?? []));
  if (truth.capabilityId !== "JRN_040_PLATFORM_CHANGE_SETS") failures.push("product-truth:capabilityId");
  if (truth.state !== "DISCOVERY") failures.push("product-truth:state");
  if (truth.owners?.productManagerApproval !== "PENDING") failures.push("product-truth:productManagerApproval");
  if (truth.owners?.productOwnerApproval !== "PENDING") failures.push("product-truth:productOwnerApproval");
  if (!evidenceReferences.has(contractFile)) failures.push("product-truth:authoritativeOpenApi");
  if (!evidenceReferences.has(generatedClientFile)) failures.push("product-truth:generatedClient");
  for (const invariant of [
    "approve_or_reject_own_change_set",
    "apply_stale_or_conflicting_change_set",
    "rollback_without_reason",
    "store_secret_or_credential_values_in_change_sets",
    "snapshot_existing_sensitive_target_values",
  ]) {
    if (!forbiddenActions.has(invariant)) failures.push(`product-truth:forbidden:${invariant}`);
  }

  requireText(validationMigrationFile, [
    "validated_value_json",
    "validated_revision",
    "validated_at",
    "idx_platform_change_set_items_target_reservation",
  ]);
  requireText(sensitiveBoundaryMigrationFile, [
    "platform_jrn040_reject_sensitive_change_set_item",
    "sensitive",
    "confidential",
    "existing sensitive platform variable cannot enter a change set",
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
    "ensureGovernedTargetIsNotSensitive",
    "proposedValueContainsSecret",
    "valuesRedacted",
    "maxGovernedChangeSetItems",
  ]);
  requireText(strictBoundaryFile, [
    "CreateChangeSetStrict",
    "RejectChangeSetStrict",
    "RollbackChangeSetStrict",
    "confidential",
    "maxGovernedTextLength",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/service.go", [
    "CreateChangeSetStrict",
    "RejectChangeSetStrict",
    "RollbackChangeSetStrict",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/jrn040_change_set_governance_test.go", [
    "ErrTargetConflict",
    "ErrVersionConflict",
    "ErrSensitiveValue",
    "restore legacy metadata",
  ]);
  requireText(strictBoundaryProofFile, [
    "sensitive",
    "confidential",
    "restricted",
    "maxGovernedTextLength+1",
  ]);
  requireText(databaseProofFile, [
    "expected database to reject a sensitive change-set classification",
    "expected database to reject an existing confidential target",
  ]);
  requireText("core/platform-control/backend/internal/http/workflow_handlers.go", [
    "RollbackChangeSetInput",
    "PLATFORM_TARGET_CONFLICT",
    "PLATFORM_SENSITIVE_VALUE_FORBIDDEN",
    "PLATFORM_ROLLBACK_REASON_REQUIRED",
  ]);
  requireText(httpProofFile, [
    "PLATFORM_ROLLBACK_REASON_REQUIRED",
    "PLATFORM_SENSITIVE_VALUE_FORBIDDEN",
    "PLATFORM_TARGET_CONFLICT",
    "PLATFORM_MAKER_CHECKER_VIOLATION",
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
  requireText(workflowFile, [
    "group: jrn-040-${{ github.sha }}",
    "cancel-in-progress: false",
    "jrn040_strict_boundary.go",
    "jrn040_strict_boundary_test.go",
    "jrn040_database_sensitive_guard_test.go",
    "platform-006_jrn040_sensitive_change_boundary.sql",
    "Run targeted Go tests",
    "Typecheck generated contract and control-panel binding",
    "Verify JRN-040 contract and binding gate",
  ]);
}

if (failures.length > 0) {
  console.error("JRN-040 gate failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("JRN-040 platform change-set gate passed");
