import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("U002 canonical Field provider creation", () => {
  test("Control Panel submits business identity inputs to Workforce", () => {
    const view = read("services/dsh/frontend/control-panel/hr/FieldAgentCreateView.tsx");
    const controller = read("services/dsh/frontend/shared/workforce/use-field-agent-create-controller.ts");
    const types = read("services/dsh/frontend/shared/workforce/workforce.types.ts");

    assert.match(view, /useCanonicalFieldAgentCreateController/);
    assert.match(view, /ZonePicker/);
    assert.match(view, /SupervisorPicker/);
    assert.doesNotMatch(view, /useFieldAgentCreateAndActivationController|provisioning-cases|officeLocation|engagementType:\s*"employee"/);
    assert.match(controller, /createFieldAgent\(/);
    assert.doesNotMatch(controller, /startProvisioningCase|resumeProvisioningCase/);
    assert.match(types, /readonly username: string/);
    assert.match(types, /readonly phoneE164: string/);
    assert.doesNotMatch(types, /export type CreateFieldAgentInput[\s\S]{0,300}readonly actorId/);
  });

  test("Workforce contract owns actor creation and excludes Field shifts", () => {
    const contract = read("core/workforce/contracts/workforce.openapi.yaml");
    const fieldRequest = contract.slice(contract.indexOf("CreateFieldAgentRequest:"), contract.indexOf("UpdateFieldAgentRequest:"));

    assert.match(fieldRequest, /required: \[ username, phoneE164, fullNameAr, serviceZoneId \]/);
    assert.doesNotMatch(fieldRequest, /actorId:|shiftCode:/);
    assert.match(fieldRequest, /enum: \[ independent_contractor \]/);

    const fieldUpdateRequest = contract.slice(contract.indexOf("UpdateFieldAgentRequest:"), contract.indexOf("CreateCaptainRequest:"));
    assert.match(fieldUpdateRequest, /engagementType:[\s\S]*enum: \[ independent_contractor \]/);
    assert.doesNotMatch(fieldUpdateRequest, /shiftCode:/);
  });

  test("Local Field provisioning uses the same Workforce-owned saga", () => {
    const provisioning = read("tools/dev/local-workforce-provisioning.mjs");
    const fieldBranch = provisioning.slice(provisioning.indexOf("if (kind === 'field')"), provisioning.indexOf("} else {", provisioning.indexOf("if (kind === 'field')")));

    assert.match(fieldBranch, /fieldCreatePayload\(zone\.id\)/);
    assert.doesNotMatch(fieldBranch, /provisionIdentityActor|fieldCreatePayload\(zone\.id, actorId\)/);
  });
});
