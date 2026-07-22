import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const checks = [
  {
    slice: "field-lifecycle",
    file: "services/dsh/frontend/control-panel/hr/FieldAgentDetailView.tsx",
    needles: ["useFieldAgentDetailController", "ProviderActivationWorkspace", "appendProviderDocument", "WorkforceScopeManager"],
  },
  {
    slice: "captain-lifecycle",
    file: "services/dsh/frontend/control-panel/hr/CaptainDetailView.tsx",
    needles: ["useCaptainDetailController", "licenseStatus", "appendProviderDocument", "WorkforceScopeManager"],
  },
  {
    slice: "employee-lifecycle",
    file: "services/dsh/frontend/control-panel/hr/EmployeeDetailView.tsx",
    needles: ["useEmployeeDetailController", "suspend", "reactivate", "uploadEmployeeMedia"],
  },
  {
    slice: "human-job-profile",
    file: "services/dsh/frontend/shared/workforce/workforce.types.ts",
    needles: ["workforceCode", "engagementType", "engagementStatus", "WorkforceEmployeeProfile"],
  },
  {
    slice: "documents-photo-license",
    file: "core/workforce/backend/internal/workforce/journey003_documents.go",
    needles: ["AppendProviderDocument", "document_media_refs", "provider.document_linked"],
  },
  {
    slice: "city-zone-supervisor-shift",
    file: "services/dsh/frontend/control-panel/hr/WorkforceReferenceView.tsx",
    needles: ["createWorkforceCity", "updateWorkforceCity", "createWorkforceShift", "updateWorkforceShift"],
  },
  {
    slice: "shift-management",
    file: "core/workforce/backend/internal/http/journey003_mutation_middleware.go",
    needles: ["/workforce/reference/cities", "reference:manage", "AppendProviderDocument"],
  },
  {
    slice: "supervisor-hierarchy",
    file: "services/dsh/frontend/control-panel/hr/EmployeeCreateView.tsx",
    needles: ["SupervisorPicker", "kind=\"employee\"", "supervisorActorId"],
  },
  {
    slice: "activation-identity",
    file: "services/dsh/frontend/control-panel/shared/ProviderActivationWorkspace.tsx",
    needles: ["issueCode", "revokeCode", "suspend", "reactivate"],
  },
  {
    slice: "workforce-me",
    file: "services/dsh/frontend/shared/workforce/WorkforceAccessGate.tsx",
    needles: ["profileComplete", "engagementStatus", "expectedKind"],
  },
  {
    slice: "dsh-actor-scopes",
    file: "services/dsh/backend/internal/http/journey003_workforce_scopes.go",
    needles: ["dsh_store_actor_scopes", "dsh_actor_service_area_scopes", "actor_id", "service_area_code"],
  },
];

const failures = [];
for (const check of checks) {
  let content;
  try {
    content = read(check.file);
  } catch {
    failures.push(`${check.slice}: missing ${check.file}`);
    continue;
  }
  for (const needle of check.needles) {
    if (!content.includes(needle)) failures.push(`${check.slice}: ${check.file} missing ${needle}`);
  }
}

const workforceContract = read("core/workforce/contracts/workforce.jrn-003.openapi.yaml");
const dshContract = read("services/dsh/contracts/dsh.jrn-003-workforce-scopes.openapi.yaml");
for (const operationId of ["createWorkforceCity", "updateWorkforceCity", "appendWorkforceProviderDocument"]) {
  if (!workforceContract.includes(operationId)) failures.push(`workforce contract missing ${operationId}`);
}
for (const operationId of ["getWorkforceActorScopes", "replaceWorkforceActorScopes", "uploadWorkforceEmployeeMedia"]) {
  if (!dshContract.includes(operationId)) failures.push(`dsh contract missing ${operationId}`);
}

if (failures.length > 0) {
  console.error("JRN-003 slice closure failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`JRN-003 slice closure passed: ${checks.length}/11 slices and both contract supplements are present.`);
