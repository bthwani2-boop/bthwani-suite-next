import assert from "node:assert";
import { parseOpenApiContractContent } from "./_openapi-utils.mjs";

const testYaml = `
paths:
  /test/endpoint/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string }
    get:
      operationId: getTestWithId
      x-bthwani-mutation-approved: false
      x-bthwani-default-enabled: true
      security:
        - bearerAuth: []
      parameters:
        - name: Authorization
          in: header
          required: true
          schema: { type: string }
        - $ref: "#/components/parameters/TestParam"
      responses:
        "200":
          description: OK
        "400":
          $ref: "#/components/responses/BadRequest"

components:
  parameters:
    TestParam:
      name: X-Service-Caller
      in: header
      required: true
`;

function testParser() {
  console.log("Running _openapi-utils.mjs parser tests...");
  
  const operations = parseOpenApiContractContent(testYaml, "test.yaml");
  
  assert.strictEqual(operations.length, 1, "Should parse exactly one operation");
  
  const op = operations[0];
  assert.strictEqual(op.path, "/test/endpoint/{id}");
  assert.strictEqual(op.method, "GET");
  assert.strictEqual(op.operationId, "getTestWithId");
  
  // Extensions
  assert.strictEqual(op.extensions.get("x-bthwani-mutation-approved"), false);
  assert.strictEqual(op.extensions.get("x-bthwani-default-enabled"), true);
  
  // Security
  assert.strictEqual(op.hasSecurity, true);
  
  // Responses
  assert.ok(op.responses.has("200"));
  assert.ok(op.responses.has("400"));
  
  // Parameters (path-level parameter "id", inline parameter "Authorization", component ref "X-Service-Caller")
  const paramNames = op.parameters.map(p => p.name);
  assert.ok(paramNames.includes("id"), "Should collect path-level parameter");
  assert.ok(paramNames.includes("Authorization"), "Should collect operation-level parameter");
  assert.ok(paramNames.includes("X-Service-Caller"), "Should collect component ref parameter");
  
  const idParam = op.parameters.find(p => p.name === "id");
  assert.strictEqual(idParam.in, "path");
  assert.strictEqual(idParam.required, true);
  
  const authParam = op.parameters.find(p => p.name === "Authorization");
  assert.strictEqual(authParam.in, "header");
  assert.strictEqual(authParam.required, true);
  
  const callerParam = op.parameters.find(p => p.name === "X-Service-Caller");
  assert.strictEqual(callerParam.in, "header");
  assert.strictEqual(callerParam.required, true);

  console.log("All parser tests PASSED!");
}

testParser();
