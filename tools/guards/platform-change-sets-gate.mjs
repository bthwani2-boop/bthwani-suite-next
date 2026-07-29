import fs from "node:fs";
import path from "node:path";

const governanceCapabilityId = "PLATFORM_CHANGE_SETS";
const productTruthFile = "governance/product/contracts/platform-change-sets.product-truth.json";
const validationMigrationFile = "core/platform-control/database/migrations/platform-005_change_set_validation.sql";
const sensitiveBoundaryMigrationFile = "core/platform-control/database/migrations/platform-006_sensitive_change_boundary.sql";
const contractFile = "core/platform-control/contracts/platform-change-sets.openapi.yaml";
const generatedClientFile = "core/platform-control/clients/generated/platform-control-api.ts";
const typecheckFile = "services/dsh/tsconfig.platform-change-sets.json";
const visualizationProofFile = "services/dsh/tests/platform-governance-visualization.test.mjs";
const strictBoundaryFile = "core/platform-control/backend/internal/platformcontrol/change_set_strict_boundary.go";
const strictBoundaryProofFile = "core/platform-control/backend/internal/platformcontrol/change_set_strict_boundary_test.go";
const databaseProofFile = "core/platform-control/backend/internal/platformcontrol/change_set_database_sensitive_guard_test.go";
const httpProofFile = "core/platform-control/backend/internal/http/change_set_workflow_handlers_test.go";
const callerWorkflowFile = ".github/workflows/ci.yml";
const verificationWorkflowFile = ".github/workflows/ci-node-verification.yml";
const requiredFiles = [
  productTruthFile,
  validationMigrationFile,
  sensitiveBoundaryMigrationFile,
  "core/platform-control/backend/internal/platformcontrol/change_set_read_create.go",
  "core/platform-control/backend/internal/platformcontrol/change_set_workflow.go",
  "core/platform-control/backend/internal/platformcontrol/change_set_apply_rollback.go",
  strictBoundaryFile,
  "core/platform-control/backend/internal/platformcontrol/change_set_governance_test.go",
  strictBoundaryProofFile,
  databaseProofFile,
  "core/platform-control/backend/internal/platformcontrol/repository_integration_test.go",
  "core/platform-control/backend/internal/http/workflow_handlers.go",
  httpProofFile,
  contractFile,
  generatedClientFile,
  typecheckFile,
  "services/dsh/frontend/shared/platform/platform-control.api.ts",
  "services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx",
  "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx",
  visualizationProofFile,
  callerWorkflowFile,
  verificationWorkflowFile,
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
  if (truth.capabilityId !== governanceCapabilityId) failures.push("product-truth:capabilityId");
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
    "platform_reject_sensitive_change_set_item",
    "sensitive",
    "confidential",
    "existing sensitive platform variable cannot enter a change set",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_workflow.go", [
    "ensureNoActiveTargetConflict",
    "verifyGovernedPreconditions",
    "ErrMakerCheckerReview",
    "pg_advisory_xact_lock",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_apply_rollback.go", [
    "RollbackChangeSetGoverned",
    "ErrRollbackReason",
    "variableStateSnapshot",
    "featureFlagStateSnapshot",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_read_create.go", [
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
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_governance_test.go", [
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
    "operationId: listPlatformChangeSets",
  ]);
  requireText(generatedClientFile, [
    "RollbackPlatformChangeSetInput",
    "preconditionSnapshot",
    "validatedRevision",
    "itemValidatedAt",
    "CreatePlatformChangeSetItemInput",
  ]);
  requireText(typecheckFile, [
    "platform-control-api.ts",
    "PlatformChangeWorkflowPanel.tsx",
    "dist-platform-change-sets",
  ]);
  requireText("services/dsh/frontend/shared/platform/platform-control.api.ts", [
    "RollbackPlatformChangeSetInput",
    "rollbackPlatformChangeSet",
    "body: input",
    "@bthwani/core-platform-control",
  ]);
  requireText("services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx", [
    "تفاصيل الطلب والفرق المتوقع",
    "سبب التراجع الإلزامي",
    "preconditionSnapshot",
    "proposedValue",
    "draftItems",
  ]);
  requireText(visualizationProofFile, [
    "platform governance renders the live visualization",
    "platform governance exposes the complete governed lifecycle",
  ]);
  requireText(callerWorkflowFile, [
    "uses: ./.github/workflows/ci-node-verification.yml",
    "platform_change_sets: ${{ needs.context.outputs.platform_change_sets }}",
  ]);
  requireText(verificationWorkflowFile, [
    "platform_change_sets:",
    "name: Verify platform change-set binding",
    "pnpm --dir services/dsh exec tsc -p tsconfig.platform-change-sets.json --noEmit --pretty false",
    "openapi-typescript ../../core/platform-control/contracts/platform-change-sets.openapi.yaml",
    "node tools/guards/platform-change-sets-gate.mjs",
  ]);
}

if (failures.length > 0) {
  console.error("Platform change-set gate failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Platform change-set gate passed");
