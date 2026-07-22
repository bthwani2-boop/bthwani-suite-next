import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const contractsRoot = path.join(repositoryRoot, "services/dsh/contracts");
const rootPath = path.join(contractsRoot, "dsh.openapi.yaml");
const pathsPath = path.join(contractsRoot, "paths/platform-policies.paths.yaml");
const schemasPath = path.join(contractsRoot, "components/schemas/platform-policies.schemas.yaml");
const focusedContractPath = path.join(contractsRoot, "dsh.jrn-029.openapi.yaml");

const pathRefs = `  /dsh/operator/platform/operational-profiles/{zoneId}:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1operator~1platform~1operational-profiles~1{zoneId}"
  /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1operator~1platform~1operational-profiles~1{zoneId}~1delivery-modes"
  /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1operator~1platform~1operational-profiles~1{zoneId}~1delivery-modes~1{fulfillmentMode}"
  /dsh/platform/operational-policy/evaluate:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1platform~1operational-policy~1evaluate"
  /dsh/operator/platform/operational-policy/audit:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1operator~1platform~1operational-policy~1audit"
  /dsh/operator/platform/operational-policy/audit/{eventId}/rollback:
    $ref: "./paths/platform-policies.paths.yaml#/~1dsh~1operator~1platform~1operational-policy~1audit~1{eventId}~1rollback"
`;

const schemaNames = [
  "DshOperationalPolicyFulfillmentMode",
  "DshOperationalPolicySla",
  "DshOperationalPolicyCapacity",
  "DshOperationalPolicyProfile",
  "DshOperationalPolicyProfileMutation",
  "DshOperationalPolicyDeliveryMode",
  "DshOperationalPolicyDeliveryModeMutation",
  "DshOperationalPolicyEvaluationInput",
  "DshOperationalPolicyEffects",
  "DshOperationalPolicyDecision",
  "DshOperationalPolicyAuditEvent",
  "DshOperationalPolicyRollbackRequest",
  "DshOperationalPolicyRollbackResult",
  "DshOperationalPolicyProfileResponse",
  "DshOperationalPolicyDeliveryModesResponse",
  "DshOperationalPolicyDeliveryModeResponse",
  "DshOperationalPolicyDecisionResponse",
  "DshOperationalPolicyAuditResponse",
  "DshOperationalPolicyRollbackResponse",
];

const schemaRefs = schemaNames
  .map((name) => `    ${name}:\n      $ref: "./components/schemas/platform-policies.schemas.yaml#/${name}"`)
  .join("\n") + "\n";

const pathsModule = `# BThwani DSH OpenAPI path-items module: platform-policies.
# Source of truth. Referenced by ../dsh.openapi.yaml; do not add an openapi root here.

/dsh/operator/platform/operational-profiles/{zoneId}:
  parameters:
    - name: zoneId
      in: path
      required: true
      schema: { type: string, format: uuid }
  get:
    operationId: getDshOperationalProfile
    summary: Read the canonical SLA and capacity profile for a zone.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: category
        in: query
        schema: { type: string, default: default, maxLength: 120 }
    responses:
      "200":
        description: Canonical operational profile.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyProfileResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
  put:
    operationId: upsertDshOperationalProfile
    summary: Upsert assignment, preparation, delivery SLA and capacity pause state.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyProfileMutation" }
    responses:
      "200":
        description: Versioned operational profile.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyProfileResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }

/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes:
  parameters:
    - name: zoneId
      in: path
      required: true
      schema: { type: string, format: uuid }
  get:
    operationId: listDshOperationalDeliveryModes
    summary: List the three canonical fulfillment-mode policies for a zone.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    responses:
      "200":
        description: Zone delivery-mode policies.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryModesResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }

/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}:
  parameters:
    - name: zoneId
      in: path
      required: true
      schema: { type: string, format: uuid }
    - name: fulfillmentMode
      in: path
      required: true
      schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyFulfillmentMode" }
  put:
    operationId: upsertDshOperationalDeliveryMode
    summary: Enable or disable one canonical fulfillment mode for a zone.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryModeMutation" }
    responses:
      "200":
        description: Versioned delivery-mode policy.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryModeResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }

/dsh/platform/operational-policy/evaluate:
  post:
    operationId: evaluateDshOperationalPolicy
    summary: Evaluate one fail-closed operational decision across affected surfaces.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyEvaluationInput" }
    responses:
      "200":
        description: Canonical operational decision and workflow effects.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDecisionResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }

/dsh/operator/platform/operational-policy/audit:
  get:
    operationId: listDshOperationalPolicyAudit
    summary: List append-only operational-policy audit events.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: aggregateType
        in: query
        schema: { type: string }
      - name: aggregateId
        in: query
        schema: { type: string }
      - name: limit
        in: query
        schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
    responses:
      "200":
        description: Operational-policy audit timeline.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyAuditResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }

/dsh/operator/platform/operational-policy/audit/{eventId}/rollback:
  parameters:
    - name: eventId
      in: path
      required: true
      schema: { type: string, format: uuid }
  post:
    operationId: rollbackDshOperationalPolicy
    summary: Restore an audited snapshot as a new version of the same aggregate.
    tags: [DshPlatformPolicies]
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyRollbackRequest" }
    responses:
      "200":
        description: Rollback result applied as a new audited version.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyRollbackResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
`;

const schemasModule = `# ── JRN-029 Operational Policy Schemas ────────────────────────────

DshOperationalPolicyFulfillmentMode:
  type: string
  enum: [bthwani_delivery, partner_delivery, client_pickup]

DshOperationalPolicySla:
  type: object
  additionalProperties: false
  required: [configured]
  properties:
    configured: { type: boolean }
    ruleId: { type: string, format: uuid }
    category: { type: string }
    maxPrepMins: { type: integer, minimum: 1, maximum: 1440 }
    maxAssignmentMins: { type: integer, minimum: 1, maximum: 1440 }
    maxDeliveryMins: { type: integer, minimum: 1, maximum: 1440 }
    version: { type: integer, minimum: 1 }

DshOperationalPolicyCapacity:
  type: object
  additionalProperties: false
  required: [configured, isPaused]
  properties:
    configured: { type: boolean }
    configId: { type: string, format: uuid }
    maxConcurrentOrders: { type: integer, minimum: 1 }
    maxCaptainsOnline: { type: integer, minimum: 0 }
    throttleThreshold: { type: number, minimum: 0, maximum: 1 }
    isPaused: { type: boolean }
    pauseReason: { type: string, maxLength: 500 }
    version: { type: integer, minimum: 1 }

DshOperationalPolicyProfile:
  type: object
  additionalProperties: false
  required: [zoneId, sla, capacity]
  properties:
    zoneId: { type: string, format: uuid }
    sla: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicySla" }
    capacity: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyCapacity" }

DshOperationalPolicyProfileMutation:
  type: object
  additionalProperties: false
  required: [slaCategory, maxPrepMins, maxAssignmentMins, maxDeliveryMins, expectedSlaVersion, maxConcurrentOrders, maxCaptainsOnline, throttleThreshold, isPaused, pauseReason, expectedCapacityVersion, reason]
  properties:
    slaCategory: { type: string, minLength: 1, maxLength: 120 }
    maxPrepMins: { type: integer, minimum: 1, maximum: 1440 }
    maxAssignmentMins: { type: integer, minimum: 1, maximum: 1440 }
    maxDeliveryMins: { type: integer, minimum: 1, maximum: 1440 }
    expectedSlaVersion: { type: integer, minimum: 0 }
    maxConcurrentOrders: { type: integer, minimum: 1 }
    maxCaptainsOnline: { type: integer, minimum: 0 }
    throttleThreshold: { type: number, minimum: 0, maximum: 1 }
    isPaused: { type: boolean }
    pauseReason: { type: string, maxLength: 500 }
    expectedCapacityVersion: { type: integer, minimum: 0 }
    reason: { type: string, minLength: 3, maxLength: 500 }

DshOperationalPolicyDeliveryMode:
  type: object
  additionalProperties: false
  required: [id, zoneId, fulfillmentMode, isEnabled, slaCategory, version, updatedBy, createdAt, updatedAt]
  properties:
    id: { type: string, format: uuid }
    zoneId: { type: string, format: uuid }
    fulfillmentMode: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyFulfillmentMode" }
    isEnabled: { type: boolean }
    slaCategory: { type: string }
    version: { type: integer, minimum: 1 }
    updatedBy: { type: string }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }

DshOperationalPolicyDeliveryModeMutation:
  type: object
  additionalProperties: false
  required: [isEnabled, slaCategory, expectedVersion, reason]
  properties:
    isEnabled: { type: boolean }
    slaCategory: { type: string, minLength: 1, maxLength: 120 }
    expectedVersion: { type: integer, minimum: 0 }
    reason: { type: string, minLength: 3, maxLength: 500 }

DshOperationalPolicyEvaluationInput:
  type: object
  additionalProperties: false
  required: [zoneId, fulfillmentMode, activeOrders, captainsOnline]
  properties:
    zoneId: { type: string, format: uuid }
    serviceAreaCode: { type: string }
    fulfillmentMode: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyFulfillmentMode" }
    slaCategory: { type: string, default: default }
    activeOrders: { type: integer, minimum: 0 }
    captainsOnline: { type: integer, minimum: 0 }

DshOperationalPolicyEffects:
  type: object
  additionalProperties: false
  required: [cartAllowed, checkoutAllowed, orderCreationAllowed, dispatchAllowed, partnerHandoffRequired, clientPickupRequired]
  properties:
    cartAllowed: { type: boolean }
    checkoutAllowed: { type: boolean }
    orderCreationAllowed: { type: boolean }
    dispatchAllowed: { type: boolean }
    partnerHandoffRequired: { type: boolean }
    clientPickupRequired: { type: boolean }

DshOperationalPolicyDecision:
  type: object
  additionalProperties: false
  required: [zoneId, serviceAreaCode, fulfillmentMode, decision, serviceable, reasonCodes, allowedActions, activeStores, pressureRatio, sla, capacity, effects, policyVersions, evaluatedAt]
  properties:
    zoneId: { type: string, format: uuid }
    serviceAreaCode: { type: string }
    fulfillmentMode: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyFulfillmentMode" }
    decision:
      type: string
      enum: [serviceable, unserviceable, policy_incomplete, paused, mode_disabled, capacity_exhausted, throttled]
    serviceable: { type: boolean }
    reasonCodes: { type: array, items: { type: string } }
    allowedActions: { type: array, items: { type: string } }
    activeStores: { type: integer, minimum: 0 }
    pressureRatio: { type: number, minimum: 0 }
    sla: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicySla" }
    capacity: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyCapacity" }
    modePolicy: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryMode" }
    effects: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyEffects" }
    policyVersions:
      type: object
      additionalProperties: { type: integer }
    evaluatedAt: { type: string, format: date-time }

DshOperationalPolicyAuditEvent:
  type: object
  additionalProperties: false
  required: [id, aggregateType, aggregateId, action, actorId, actorSurface, reason, toVersion, payload, createdAt]
  properties:
    id: { type: string, format: uuid }
    aggregateType: { type: string, enum: [zone, sla_rule, capacity_config, delivery_mode, store_onboarding_fee] }
    aggregateId: { type: string }
    action: { type: string, enum: [created, updated, activated, deactivated, rolled_back] }
    actorId: { type: string }
    actorSurface: { type: string }
    correlationId: { type: string }
    reason: { type: string }
    fromVersion: { type: integer }
    toVersion: { type: integer }
    payload: { type: object, additionalProperties: true }
    createdAt: { type: string, format: date-time }

DshOperationalPolicyRollbackRequest:
  type: object
  additionalProperties: false
  required: [expectedCurrentVersion, reason]
  properties:
    expectedCurrentVersion: { type: integer, minimum: 1 }
    reason: { type: string, minLength: 3, maxLength: 500 }

DshOperationalPolicyRollbackResult:
  type: object
  additionalProperties: false
  required: [targetEventId, aggregateType, aggregateId, fromVersion, toVersion]
  properties:
    targetEventId: { type: string, format: uuid }
    aggregateType: { type: string }
    aggregateId: { type: string }
    fromVersion: { type: integer, minimum: 1 }
    toVersion: { type: integer, minimum: 1 }

DshOperationalPolicyProfileResponse:
  type: object
  additionalProperties: false
  required: [profile]
  properties:
    profile: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyProfile" }

DshOperationalPolicyDeliveryModesResponse:
  type: object
  additionalProperties: false
  required: [deliveryModes]
  properties:
    deliveryModes:
      type: array
      items: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryMode" }

DshOperationalPolicyDeliveryModeResponse:
  type: object
  additionalProperties: false
  required: [deliveryMode]
  properties:
    deliveryMode: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDeliveryMode" }

DshOperationalPolicyDecisionResponse:
  type: object
  additionalProperties: false
  required: [decision]
  properties:
    decision: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyDecision" }

DshOperationalPolicyAuditResponse:
  type: object
  additionalProperties: false
  required: [events]
  properties:
    events:
      type: array
      items: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyAuditEvent" }

DshOperationalPolicyRollbackResponse:
  type: object
  additionalProperties: false
  required: [rollback]
  properties:
    rollback: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshOperationalPolicyRollbackResult" }
`;

function insertBlock(source, anchor, block, label) {
  if (source.includes(block.trim())) return source;
  if (!source.includes(anchor)) throw new Error(`${label} anchor was not found`);
  return source.replace(anchor, `${block}${anchor}`);
}

let root = await readFile(rootPath, "utf8");
const expectedPathKeys = [
  "/dsh/operator/platform/operational-profiles/{zoneId}:",
  "/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes:",
  "/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}:",
  "/dsh/platform/operational-policy/evaluate:",
  "/dsh/operator/platform/operational-policy/audit:",
  "/dsh/operator/platform/operational-policy/audit/{eventId}/rollback:",
];
const presentPaths = expectedPathKeys.filter((key) => root.includes(`  ${key}`));
if (presentPaths.length !== 0 && presentPaths.length !== expectedPathKeys.length) {
  throw new Error(`partial JRN-029 root path registration: ${presentPaths.join(", ")}`);
}
if (presentPaths.length === 0) {
  root = insertBlock(
    root,
    "  /dsh/operator/platform/serviceability/{zoneId}:\n",
    pathRefs,
    "JRN-029 path",
  );
}

const presentSchemas = schemaNames.filter((name) => root.includes(`    ${name}:\n`));
if (presentSchemas.length !== 0 && presentSchemas.length !== schemaNames.length) {
  throw new Error(`partial JRN-029 root schema registration: ${presentSchemas.join(", ")}`);
}
if (presentSchemas.length === 0) {
  root = insertBlock(
    root,
    "    DshStoreOnboardingFeePolicy:\n",
    schemaRefs,
    "JRN-029 schema",
  );
}
await writeFile(rootPath, root, "utf8");

await writeFile(pathsPath, pathsModule, "utf8");
let schemas = await readFile(schemasPath, "utf8");
const schemaMarker = "# ── JRN-029 Operational Policy Schemas";
if (!schemas.includes(schemaMarker)) {
  schemas = `${schemas.trimEnd()}\n\n${schemasModule}`;
  await writeFile(schemasPath, schemas, "utf8");
}

if (existsSync(focusedContractPath)) {
  await unlink(focusedContractPath);
}

console.log("JRN-029 is registered in the sovereign modular DSH OpenAPI contract.");
