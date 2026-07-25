from pathlib import Path
import json
import re
import textwrap


def load_json(path):
    return json.loads(Path(path).read_text())


def save_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def slice_by_id(document, slice_id):
    return next(item for item in document["slices"] if item["id"] == slice_id)


# JRN-011: dedicated workflow was superseded by contextual CI.
path = Path("services/dsh/tests/jrn-011-slice-closure.test.mjs")
text = path.read_text()
replacement = '''test("JRN-011 CI executes contextual journey, Go, PostgreSQL, TypeScript and lifecycle gates", async () => {
  const evidence = [
    await readRepo(".github/workflows/ci.yml"),
    await readRepo(".github/workflows/ci-node-verification.yml"),
    await readRepo(".github/workflows/ci-backends.yml"),
    await readRepo("tools/scripts/run-journey-gate.ps1"),
    await readRepo("services/dsh/backend/internal/orders/order_truth_db_test.go"),
    await readRepo("services/dsh/backend/internal/orders/order_truth_payment_projection_db_test.go"),
  ].join("\\n");
  for (const marker of [
    "BThwani Contextual CI",
    "Run detected journey gates",
    "run-journey-gate.ps1",
    "go test ./... -count=1",
    "TestCreateOrderTruthLifecycleDBIntegration",
    "TestJRN011PaymentProjectionDBIntegration",
    "RESULT: PASS",
  ]) {
    assert.ok(evidence.includes(marker), `contextual CI evidence is missing required gate ${marker}`);
  }
});'''
text, count = re.subn(r'test\("JRN-011 CI is required[\s\S]*?\n\}\);\s*$', replacement, text)
if count != 1:
    raise SystemExit("unable to update JRN-011 CI assertion")
path.write_text(text + "\n")

manifest = load_json("services/dsh/contracts/jrn-011-slice-closure.json")
fs17 = slice_by_id(manifest, "FS-17")
fs17["requiredFiles"] = [
    ".github/workflows/ci.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-backends.yml",
    "tools/scripts/run-journey-gate.ps1",
    "services/dsh/backend/internal/orders/order_truth_db_test.go",
    "services/dsh/backend/internal/orders/order_truth_payment_projection_db_test.go",
    "services/dsh/tsconfig.jrn-011.json",
]
fs17["requiredMarkers"] = [
    "BThwani Contextual CI",
    "Run detected journey gates",
    "run-journey-gate.ps1",
    "go test ./... -count=1",
    "TestCreateOrderTruthLifecycleDBIntegration",
    "TestJRN011PaymentProjectionDBIntegration",
    '"noEmit"',
]
save_json("services/dsh/contracts/jrn-011-slice-closure.json", manifest)

# JRN-012: contract truth now lives in modular path/schema modules.
path = Path("services/dsh/tests/jrn-012-order-preparation-closure.test.mjs")
text = path.read_text()
old = '  const contract = readDsh("contracts/fragments/order-preparation-handoff.fragment.yaml");'
new = '''  const paths = readDsh("contracts/paths/preparation-handoff.paths.yaml");
  const schemas = readDsh("contracts/components/schemas/preparation-handoff.schemas.yaml");
  const contract = `${paths}\\n${schemas}`;'''
if old not in text:
    raise SystemExit("unable to locate stale JRN-012 fragment assertion")
path.write_text(text.replace(old, new).replace('"preparation OpenAPI fragment"', '"preparation OpenAPI modules"'))

manifest = load_json("services/dsh/contracts/jrn-012-slice-closure.json")
fs06 = slice_by_id(manifest, "FS-06")
fs06["requiredFiles"] = [
    "services/dsh/contracts/paths/preparation-handoff.paths.yaml",
    "services/dsh/contracts/components/schemas/preparation-handoff.schemas.yaml",
    "services/dsh/contracts/dsh.openapi.yaml",
    "tools/scripts/dsh-openapi-modular-lib.mjs",
    ".github/workflows/ci-node-diagnostics.yml",
]
fs06["requiredMarkers"] = [
    "decideDshClientOrderPreparationIssue",
    "refreshDshOperatorOrderPreparationAlerts",
    "DshPreparationIssueCustomerDecision",
    "DshPreparationAlert",
    "preparation-handoff",
    "Verify OpenAPI contracts and generated types without warnings",
]
fs16 = slice_by_id(manifest, "FS-16")
fs16["requiredFiles"] = [
    "services/dsh/frontend/shared/partner/partner.adapters.ts",
    "tools/scripts/dsh-openapi-modular-lib.mjs",
    "services/dsh/contracts/dsh.modular.manifest.json",
    "services/dsh/tests/jrn-012-order-preparation-closure.test.mjs",
]
fs16["requiredMarkers"] = [
    "No compatibility projection for legacy rows",
    "classifyPath",
    "preparation-handoff",
    "contains forbidden",
    "missing immutable order items",
]
fs17 = slice_by_id(manifest, "FS-17")
fs17["requiredFiles"] = [
    "services/dsh/tests/jrn-012-order-preparation-closure.test.mjs",
    "services/dsh/tests/jrn-012-slice-closure.test.mjs",
    "services/dsh/backend/internal/http/partner_order_workboard_test.go",
    "services/dsh/database/tests/dsh-912_jrn012_order_preparation_invariants.sql",
    "services/dsh/tsconfig.jrn-012.json",
    ".github/workflows/ci.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-backends.yml",
    "tools/scripts/run-journey-gate.ps1",
]
fs17["requiredMarkers"] = [
    "Run detected journey gates",
    "run-journey-gate.ps1",
    "pnpm exec nx affected -t test",
    "go test ./... -count=1",
    "forbidden_financial_columns",
    '"noEmit"',
    "RESULT: PASS",
]
fs18 = slice_by_id(manifest, "FS-18")
fs18["requiredFiles"] = [
    "governance/product/contracts/jrn-012-order-preparation-readiness.product-truth.json",
    "services/dsh/contracts/jrn-012-slice-closure.json",
    ".github/workflows/ci.yml",
    ".github/workflows/ci-node-verification.yml",
    "tools/scripts/run-journey-gate.ps1",
]
fs18["requiredMarkers"] = [
    "READY_FOR_INDEPENDENT_REVIEW",
    "PENDING_INDEPENDENT_APPROVALS",
    "independentReviewPending",
    "rollback",
    "Run detected journey gates",
    "RESULT: PASS",
]
manifest["remainingReleaseGates"][0] = "same-commit BThwani Contextual CI and detected JRN-012 journey gate must be success"
save_json("services/dsh/contracts/jrn-012-slice-closure.json", manifest)

# JRN-013: enums moved to the common schema module; CI is contextual.
Path("services/dsh/tests/jrn-013-primary-contract-sync.test.mjs").write_text(textwrap.dedent('''\
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('JRN-013 handoff reasons remain aligned across modular contract and generated client', () => {
  const rootContract = read('services/dsh/contracts/dsh.openapi.yaml');
  const commonSchemas = read('services/dsh/contracts/components/schemas/common.schemas.yaml');
  const client = read('services/dsh/clients/generated/dsh-api.ts');
  const synchronizer = read('tools/contracts/sync-jrn-013-handoff-reasons.mjs');

  assert.match(rootContract, /DshDeliveryExceptionReasonCode:/);
  assert.match(rootContract, /common\\.schemas\\.yaml#\\/DshDeliveryExceptionReasonCode/);
  const schemaStart = commonSchemas.indexOf('DshDeliveryExceptionReasonCode:');
  const schemaEnd = commonSchemas.indexOf('DshDeliveryExceptionStatus:', schemaStart);
  assert.ok(schemaStart >= 0 && schemaEnd > schemaStart, 'modular reason schema is missing');
  const reasonSchema = commonSchemas.slice(schemaStart, schemaEnd);
  assert.match(reasonSchema, /    - handoff_shortage/);
  assert.match(reasonSchema, /    - handoff_mismatch/);
  assert.match(
    client,
    /DshDeliveryExceptionReasonCode: .*"handoff_shortage" \\| "handoff_mismatch" \\| "other";/,
  );
  assert.match(synchronizer, /--write/);
  assert.match(synchronizer, /contract artifacts and closure assertion are synchronized/);
});
'''))

manifest = load_json("services/dsh/contracts/jrn-013-slice-closure.json")
fs16 = slice_by_id(manifest, "FS-16")
if "services/dsh/frontend/shared/dispatch/dispatch.api.ts" not in fs16["requiredFiles"]:
    fs16["requiredFiles"].append("services/dsh/frontend/shared/dispatch/dispatch.api.ts")
fs18 = slice_by_id(manifest, "FS-18")
fs18["requiredFiles"] = [
    "services/dsh/tests/store-captain-handoff-closure.test.mjs",
    "services/dsh/tests/jrn-013-slice-closure.test.mjs",
    ".github/workflows/ci.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-backends.yml",
    "tools/scripts/run-journey-gate.ps1",
]
fs18["requiredMarkers"] = [
    "custody database truth has dual confirmation",
    "registers exactly FS-01 through FS-18",
    "Run detected journey gates",
    "run-journey-gate.ps1",
    "go test ./... -count=1",
    "RESULT: PASS",
]
save_json("services/dsh/contracts/jrn-013-slice-closure.json", manifest)

# JRN-014 registry now declares one canonical shared adapter owner.
path = Path("tools/guards/jrn-014-dispatch-integrity-gate.mjs")
text = path.read_text()
old = "  'frontend/shared/dispatch,frontend/shared/operations',"
new = "  'adapterOwner: \\\"frontend/shared/dispatch\\\"',"
if old not in text:
    raise SystemExit("unable to locate stale JRN-014 adapter marker")
path.write_text(text.replace(old, new))

# JRN-015: pickup recovery was moved into operator paths and order schemas.
path = Path("services/dsh/tests/jrn-015-pickup-closure.test.mjs")
text = path.read_text()
replacement = '''test('JRN-015 composes the governed reschedule route and lifecycle projection', () => {
  const paths = source('services/dsh/contracts/paths/operator.paths.yaml');
  const schemas = source('services/dsh/contracts/components/schemas/orders.schemas.yaml');
  const rootContract = source('services/dsh/contracts/dsh.openapi.yaml');

  assert.match(paths, /\\/dsh\\/operator\\/pickups\\/\\{orderId\\}\\/reschedule:/);
  assert.match(paths, /operationId: rescheduleDshPickupWindow/);
  assert.match(paths, /DshReschedulePickupWindowRequest/);
  assert.match(schemas, /DshReschedulePickupWindowRequest:/);
  assert.match(schemas, /customerNotifiedAt:/);
  assert.match(schemas, /customerArrivedAt:/);
  assert.match(schemas, /noShowReason:/);
  assert.match(schemas, /rescheduledAt:/);
  assert.match(rootContract, /x-bthwani-contract-layout: MODULAR/);
  assert.match(rootContract, /paths\\/operator\\.paths\\.yaml/);
  assert.match(rootContract, /components\\/schemas\\/orders\\.schemas\\.yaml/);
});'''
text, count = re.subn(
    r"test\('JRN-015 composes the governed reschedule route and lifecycle projection'[\s\S]*?\n\}\);\n\n(?=test\('JRN-015 guards)",
    replacement + "\n\n",
    text,
)
if count != 1:
    raise SystemExit("unable to update JRN-015 modular contract assertion")
path.write_text(text)
