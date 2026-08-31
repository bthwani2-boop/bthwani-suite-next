import assert from "node:assert/strict";
import test from "node:test";

import {validateSonarAnalysisTask} from "./validate-sonar-analysis-task.mjs";

const validTask = `projectKey=bthwani2-boop_bthwani-suite-next
serverUrl=https://sonarcloud.io
dashboardUrl=https://sonarcloud.io/dashboard?id=bthwani2-boop_bthwani-suite-next&pullRequest=349
ceTaskId=task-349
ceTaskUrl=https://sonarcloud.io/api/ce/task?id=task-349
`;

test("Sonar analysis task accepts the exact SonarCloud task identity", () => {
  const result = validateSonarAnalysisTask(validTask, {
    projectKey: "bthwani2-boop_bthwani-suite-next",
    prNumber: "349",
  });
  assert.equal(result.valid, true);
  assert.equal(result.properties.ceTaskId, "task-349");
});

test("Sonar analysis task rejects malformed properties and duplicate keys", () => {
  const result = validateSonarAnalysisTask(`${validTask}ceTaskId=other\nnot-a-property`, {
    projectKey: "bthwani2-boop_bthwani-suite-next",
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicate property ceTaskId/u);
  assert.match(result.errors.join("\n"), /expected key=value/u);
});

test("Sonar analysis task rejects cross-project and cross-PR identity", () => {
  const result = validateSonarAnalysisTask(validTask
    .replaceAll("bthwani2-boop_bthwani-suite-next", "other-project")
    .replace("pullRequest=349", "pullRequest=348"), {
    projectKey: "bthwani2-boop_bthwani-suite-next",
    prNumber: "349",
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /projectKey/u);
  assert.match(result.errors.join("\n"), /pull request/u);
});

test("Sonar analysis task rejects non-SonarCloud and mismatched task URLs", () => {
  const result = validateSonarAnalysisTask(validTask
    .replace("serverUrl=https://sonarcloud.io", "serverUrl=https://attacker.invalid")
    .replace("id=task-349", "id=task-other"), {
    projectKey: "bthwani2-boop_bthwani-suite-next",
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /origin/u);
  assert.match(result.errors.join("\n"), /task id/u);
});
