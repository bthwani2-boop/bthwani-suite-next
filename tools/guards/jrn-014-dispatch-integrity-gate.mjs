import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  const absolute = resolve(repositoryRoot, path);
  if (!existsSync(absolute)) {
    fail(`missing required file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function requireMarkers(path, markers) {
  const content = read(path);
  for (const marker of markers) {
    if (!content.includes(marker)) fail(`${path} missing marker: ${marker}`);
  }
}

function walk(directory) {
  const absolute = resolve(repositoryRoot, directory);
  if (!existsSync(absolute)) return [];
  const files = [];
  for (const entry of readdirSync(absolute)) {
    const child = join(absolute, entry);
    const stats = statSync(child);
    if (stats.isDirectory()) files.push(...walk(relative(repositoryRoot, child)));
    else files.push(relative(repositoryRoot, child).replaceAll('\\', '/'));
  }
  return files;
}

const requiredFiles = [
  'governance/product/contracts/jrn-014-captain-dispatch.product-truth.json',
  'governance/boundaries/jrn-014-dsh-wlt-dispatch-boundary.md',
  'governance/runbooks/jrn-014-dispatch-operations.md',
  'services/dsh/contracts/dsh.dispatch-governance.openapi.yaml',
  'services/dsh/contracts/jrn-014-dispatch-operation-registry.json',
  'services/dsh/contracts/jrn-014-surface-rbac-registry.json',
  'services/dsh/contracts/jrn-014-dispatch-state-machine.json',
  'services/dsh/contracts/jrn-014-cross-surface-binding.json',
  'services/dsh/contracts/jrn-014-visible-states.json',
  'services/dsh/contracts/jrn-014-security-privacy-registry.json',
  'services/dsh/contracts/jrn-014-experience-quality-registry.json',
  'services/dsh/contracts/jrn-014-observability-slo.json',
  'services/dsh/contracts/jrn-014-legacy-cleanup.json',
  'services/dsh/database/migrations/dsh-079_dispatch_assignment_governance.sql',
  'services/dsh/backend/internal/dispatch/assignment_governance.go',
  'services/dsh/backend/internal/dispatch/assignment_governance_queries.go',
  'services/dsh/backend/internal/http/dispatch_governance_handlers.go',
  'services/dsh/frontend/shared/operations/use-dispatch-captain-options.ts',
  'services/dsh/frontend/shared/operations/use-dispatch-operations.ts',
  'services/dsh/frontend/control-panel/operations/DispatchOperationsPanel.tsx',
  'services/dsh/frontend/app-captain/orders/CaptainAssignmentOfferPanel.tsx',
];
for (const path of requiredFiles) read(path);

requireMarkers('services/dsh/backend/internal/dispatch/assignment_governance.go', [
  'pg_advisory_xact_lock',
  'FOR UPDATE',
  'validateCaptainForAssignmentTx',
  'orderServiceArea != input.ServiceAreaCode',
  'idempotency key belongs to another dispatch request',
  'CAPTAIN_AT_CAPACITY',
  'ReassignGovernedAssignment',
  'insertDispatchDecisionTx',
  'ListOperatorAssignmentsInTenant',
  'ListCaptainAssignmentsInTenant',
]);
requireMarkers('services/dsh/backend/internal/http/dispatch_governance_handlers.go', [
  'requirePermission',
  'requireActor',
  'ListOperatorAssignmentsInTenant',
  'ListCaptainAssignmentsInTenant',
  'writeGovernedDispatchError',
]);
requireMarkers('services/dsh/database/migrations/dsh-079_dispatch_assignment_governance.sql', [
  'uq_dsh_assignments_tenant_idempotency',
  'dsh_captain_dispatch_profiles',
  'dsh_dispatch_decisions',
  'supersedes_assignment_id',
]);
requireMarkers('services/dsh/contracts/dsh.dispatch-governance.openapi.yaml', [
  '/dsh/operator/dispatch/assignments:',
  '/dsh/captain/dispatch/assignments:',
  '/dsh/operator/dispatch/candidates:',
  '/dsh/operator/dispatch/assignments/{assignmentId}/reassign:',
  '/dsh/operator/dispatch/decisions:',
  'DispatchOfferControls:',
]);
requireMarkers('services/dsh/contracts/contract-registry.ts', [
  'dsh-dispatch-governance',
  'contracts/dsh.dispatch-governance.openapi.yaml',
  'frontend/shared/dispatch,frontend/shared/operations',
]);
requireMarkers('services/dsh/frontend/shared/operations/use-dispatch-captain-options.ts', [
  'fetchStoreDetail',
  'fetchCaptainDispatchCandidates',
  '.filter((candidate) => candidate.eligible)',
  'Workforce is joined only for display data',
]);
requireMarkers('services/dsh/frontend/shared/operations/use-dispatch-operations.ts', [
  'fetchDispatchDecisions',
  'expireDispatchAssignments',
  'cancelDispatchAssignment',
  'reassignDispatchAssignment',
  'buildDispatchAssignmentIdempotencyKey',
]);
requireMarkers('services/dsh/frontend/app-captain/orders/CaptainAssignmentOfferPanel.tsx', [
  'responseDeadlineAt',
  'distanceMeters',
  'serviceAreaCode',
  'priority',
  'trimmedReason.length < 3',
]);
requireMarkers('services/dsh/frontend/app-captain/DshCaptainOrderJourneyRenderer.tsx', [
  "activeDeliveryStatus === 'assigned'",
  'لا يمكن بدء الاستلام أو التسليم قبل قبول عرض الإسناد',
]);
requireMarkers('services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts', [
  'createGovernedDispatchAssignment',
  'DshGovernedCreateAssignmentInput',
]);

const codePaths = [
  ...walk('services/dsh/backend/internal'),
  ...walk('services/dsh/database/migrations'),
];
for (const path of codePaths) {
  const base = path.split('/').at(-1) ?? '';
  if (/jrn[-_]?0?14/i.test(base)) fail(`journey-numbered implementation filename is forbidden: ${path}`);
}

const frontendFiles = walk('services/dsh/frontend').filter((path) => ['.ts', '.tsx'].includes(extname(path)));
const fakePatterns = [
  'مطعم حضرموت السعيد',
  'شارع الستين، صنعاء',
  '+967 777 123 456',
  '850 ر.ي',
  '5.3 كم',
];
for (const path of frontendFiles) {
  const content = read(path);
  for (const pattern of fakePatterns) {
    if (content.includes(pattern)) fail(`hardcoded dispatch fixture found in ${path}: ${pattern}`);
  }
  if (path !== 'services/dsh/frontend/shared/dispatch/dispatch.api.ts' && content.includes('createDispatchAssignment(')) {
    fail(`legacy ungoverned assignment consumer found: ${path}`);
  }
}

const domainContent = read('services/dsh/backend/internal/dispatch/assignment_governance.go').toLowerCase();
for (const forbidden of ['wallet balance', 'settlement', 'payout', 'credit wallet', 'debit wallet']) {
  if (domainContent.includes(forbidden)) fail(`financial mutation language found in dispatch domain: ${forbidden}`);
}

const jsonFiles = requiredFiles.filter((path) => path.endsWith('.json'));
for (const path of jsonFiles) {
  try {
    JSON.parse(read(path));
  } catch (error) {
    fail(`invalid JSON ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error('JRN-014 dispatch integrity gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`JRN-014 dispatch integrity gate passed (${requiredFiles.length} required files, ${frontendFiles.length} frontend files scanned).`);
