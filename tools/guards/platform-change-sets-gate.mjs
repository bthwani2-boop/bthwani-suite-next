import fs from "node:fs";

const validationMigrationFile = "core/platform-control/database/migrations/platform-005_change_set_validation.sql";
const sensitiveBoundaryMigrationFile = "core/platform-control/database/migrations/platform-006_sensitive_change_boundary.sql";
const contractFile = "core/platform-control/contracts/platform-change-sets.openapi.yaml";
const generatedClientFile = "core/platform-control/clients/generated/platform-control-api.ts";
const generatedBundleFile = "core/platform-control/contracts/generated/platform-control.bundle.openapi.yaml";
const typecheckFile = "services/dsh/tsconfig.platform-change-sets.json";
const visualizationProofFile = "services/dsh/tests/platform-governance-visualization.test.mjs";
const strictBoundaryProofFile = "core/platform-control/backend/internal/platformcontrol/change_set_strict_boundary_test.go";
const databaseProofFile = "core/platform-control/backend/internal/platformcontrol/change_set_database_sensitive_guard_test.go";
const httpProofFile = "core/platform-control/backend/internal/http/change_set_workflow_handlers_test.go";
const legacyDshRemovalMigrationFile = "services/dsh/database/migrations/dsh-1013_remove_legacy_platform_change_sets.sql";
const legacyDshAuthorityFiles = [
  "services/dsh/backend/internal/platform/changeset/changeset.go",
  "services/dsh/backend/internal/http/platform_changesets_routes.go",
];
const callerWorkflowFile = ".github/workflows/ci-check.yml";
const verificationWorkflowFile = ".github/workflows/ci-node-verification.yml";
const requiredFiles = [
  validationMigrationFile,
  sensitiveBoundaryMigrationFile,
  "core/platform-control/backend/internal/platformcontrol/change_set_read_create.go",
  "core/platform-control/backend/internal/platformcontrol/change_set_workflow.go",
  "core/platform-control/backend/internal/platformcontrol/change_set_apply_rollback.go",
  "core/platform-control/backend/internal/platformcontrol/change_set_governance_test.go",
  strictBoundaryProofFile,
  databaseProofFile,
  "core/platform-control/backend/internal/platformcontrol/repository_integration_test.go",
  "core/platform-control/backend/internal/http/workflow_handlers.go",
  httpProofFile,
  contractFile,
  generatedBundleFile,
  generatedClientFile,
  typecheckFile,
  "services/dsh/frontend/shared/platform/platform-control.api.ts",
  "services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx",
  "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx",
  visualizationProofFile,
  callerWorkflowFile,
  verificationWorkflowFile,
  legacyDshRemovalMigrationFile,
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing:${file}`);
}
for (const file of legacyDshAuthorityFiles) {
  if (fs.existsSync(file)) failures.push(`legacy-dsh-authority-present:${file}`);
}

function requireText(file, tokens) {
  const content = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`missing-token:${file}:${token}`);
  }
}

function forbidText(file, tokens) {
  const content = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (content.includes(token)) failures.push(`forbidden-token:${file}:${token}`);
  }
}

if (failures.length === 0) {
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
  requireText(legacyDshRemovalMigrationFile, [
    "DROP TABLE IF EXISTS dsh_platform_change_sets",
    "Platform Control is the sole canonical owner",
  ]);
  forbidText("services/dsh/backend/internal/http/server.go", [
    "/dsh/operator/platform/change-sets",
    "handleCreateChangeSet",
    "handleApplyChangeSet",
  ]);
  forbidText("services/dsh/contracts/dsh.openapi.yaml", [
    "/dsh/operator/platform/change-sets",
    "DshChangeSet",
  ]);
  forbidText("services/dsh/contracts/dsh.platform-policies.openapi.yaml", [
    "/dsh/operator/platform/change-sets",
    "DshChangeSet",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_workflow.go", [
    "ensureNoActiveTargetConflict",
    "verifyGovernedPreconditions",
    "ErrMakerCheckerReview",
    "pg_advisory_xact_lock",
    "RejectChangeSet",
    "maxGovernedTextLength",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_apply_rollback.go", [
    "RollbackChangeSet",
    "ErrRollbackReason",
    "variableStateSnapshot",
    "featureFlagStateSnapshot",
    "maxGovernedTextLength",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/change_set_read_create.go", [
    "CreateChangeSet",
    "ErrSensitiveValue",
    "ensureGovernedTargetIsNotSensitive",
    "proposedValueContainsSecret",
    "valuesRedacted",
    "maxGovernedChangeSetItems",
    "maxGovernedTextLength",
    "isSensitiveClassification",
    "confidential",
    "restricted",
  ]);
  requireText("core/platform-control/backend/internal/platformcontrol/service.go", [
    "CreateChangeSet",
    "RejectChangeSet",
    "RollbackChangeSet",
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
    "platform: ${{ needs.context.outputs.platform }}",
  ]);
  requireText(verificationWorkflowFile, [
    "platform: {type: string, required: true}",
    "name: Verify Platform contract and generated client when affected",
    "pnpm --dir services/dsh exec tsc -p tsconfig.platform-change-sets.json --noEmit --pretty false",
    "git diff --exit-code --",
    generatedBundleFile,
    generatedClientFile,
    "node tools/guards/platform-change-sets-gate.mjs",
  ]);
  forbidText(verificationWorkflowFile, [
    "openapi-typescript ../../core/platform-control/contracts/generated/platform-control.bundle.openapi.yaml",
  ]);
}

if (failures.length > 0) {
  console.error("Platform change-set gate failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Platform change-set gate passed");
