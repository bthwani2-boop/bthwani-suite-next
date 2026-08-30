import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fieldCreateSource = readFileSync(
  "services/dsh/frontend/control-panel/hr/FieldAgentCreateView.tsx",
  "utf8",
);
const captainCreateSource = readFileSync(
  "services/dsh/frontend/control-panel/hr/CaptainCreateView.tsx",
  "utf8",
);
const employeeCreateSource = readFileSync(
  "services/dsh/frontend/control-panel/hr/EmployeeCreateView.tsx",
  "utf8",
);

test("workforce create buttons invoke their canonical submit actions", () => {
  assert.match(fieldCreateSource, /onClick=\{handleSubmit\}/);
  assert.doesNotMatch(fieldCreateSource, /onClick=\{\(\) => void handleSubmit\}/);

  assert.match(captainCreateSource, /onClick=\{handleSubmit\}/);
  assert.match(employeeCreateSource, /void controller\.submit\(\{/);
});
