import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  composeContext,
  repositoryRoot,
} from "../../../tools/scripts/openapi-context-composer.mjs";
import {
  assertNoUnresolvedLocalOpenApiReferences,
} from "../../../tools/scripts/openapi-composition-integrity.mjs";

const contractsDirectory = path.join(repositoryRoot, "services/dsh/contracts");
const entryContractPath = path.join(contractsDirectory, "dsh.openapi.yaml");
const partnerSchemasPath = path.join(
  contractsDirectory,
  "components/schemas/partner.schemas.yaml",
);
const catalogPathsPath = path.join(contractsDirectory, "paths/catalog.paths.yaml");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

test("DSH sovereign OpenAPI entry remains modular and structurally valid", async () => {
  const entry = read(entryContractPath);
  const composed = await composeContext("dsh", { write: false });

  assert.match(entry, /x-bthwani-contract-layout:\s*MODULAR/);
  assert.match(entry, /x-bthwani-bundle:\s*\.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.match(entry, /\$ref:\s*["']\.\/paths\//);
  assert.match(entry, /\$ref:\s*["']\.\/components\//);
  assert.ok(entry.split(/\r?\n/).length < 4000);
  assert.ok(composed.pathCount > 0);
  assert.ok(composed.operationIds.length > 0);
  assert.equal(new Set(composed.operationIds).size, composed.operationIds.length);
  assert.doesNotThrow(() =>
    assertNoUnresolvedLocalOpenApiReferences(composed.bundle, composed));
});

test("generated bundle composition is deterministic and self-contained", async () => {
  const first = await composeContext("dsh", { write: false });
  const second = await composeContext("dsh", { write: false });

  assert.equal(first.bundle, second.bundle);
  assert.equal(first.sourceDigest, second.sourceDigest);
  assert.doesNotThrow(() =>
    assertNoUnresolvedLocalOpenApiReferences(first.bundle, first));
  assert.match(first.bundle, /operationId:\s*getDshHealth/);
  assert.match(first.bundle, /operationId:\s*getDshPartnerOrderWorkboard/);
});

test("partner draft request matches domain identity and server-owned metadata", () => {
  const schemas = read(partnerSchemasPath);
  const createRequest = schemas.match(
    /DshCreatePartnerRequest:[\s\S]*?\nDshPartnerTransitionRequest:/,
  );
  assert.ok(createRequest, "DshCreatePartnerRequest schema is missing");
  const identityTypeLine = createRequest[0].match(
    /legalIdentityType:\s*\{[^\n]+\}/,
  );
  assert.ok(identityTypeLine, "legalIdentityType schema is missing");
  assert.match(
    identityTypeLine[0],
    /enum: \[commercial_register, national_id, freelancer_certificate\]/,
  );
  assert.doesNotMatch(identityTypeLine[0], /commercial_registration|\bother\b/);
  assert.match(createRequest[0], /ownerActorId:\s*\{/);
  assert.match(createRequest[0], /notes:\s*\{/);
  assert.doesNotMatch(
    createRequest[0],
    /\n\s+(?:createdBy|assignedFieldAgent|idempotencyKey):/,
  );
});

test("catalog asset link contract exposes atomic primary store media binding", () => {
  const catalogPaths = read(catalogPathsPath);
  const linkPath = catalogPaths.match(
    /\/dsh\/operator\/catalog\/assets\/\{assetId\}\/link:[\s\S]*?\n\/dsh\/operator\/catalog\/assets\/\{assetId\}\/links\/\{linkId\}:/,
  );
  assert.ok(linkPath, "catalog asset link path is missing");
  assert.match(linkPath[0], /required: \[entityType, entityId, role\]/);
  assert.match(linkPath[0], /isPrimary:[\s\S]*type: boolean/);
  assert.match(linkPath[0], /Replaces the current primary link atomically/);
  assert.match(linkPath[0], /additionalProperties: false/);
});

test("composition integrity fails closed on unresolved local references", () => {
  const invalidBundle = `
openapi: 3.1.0
info:
  title: Invalid local reference fixture
  version: 1.0.0
paths:
  /broken:
    get:
      operationId: getBroken
      responses:
        "200":
          description: broken
          content:
            application/json:
              schema:
                $ref: ../components/missing.yaml#/components/schemas/Missing
`;

  assert.throws(
    () => assertNoUnresolvedLocalOpenApiReferences(invalidBundle, {
      context: "fixture",
      bundlePath: "generated/fixture.openapi.yaml",
    }),
    /retains unresolved local OpenAPI references/,
  );
});

test("composition integrity permits internal and remote references", () => {
  const validBundle = `
openapi: 3.1.0
info:
  title: Valid reference fixture
  version: 1.0.0
paths:
  /internal:
    get:
      operationId: getInternal
      responses:
        "200":
          $ref: "#/components/responses/Ok"
  /remote:
    get:
      operationId: getRemote
      responses:
        "200":
          $ref: "https://contracts.example.test/common.yaml#/components/responses/Ok"
  /protocol-relative-remote:
    get:
      operationId: getProtocolRelativeRemote
      responses:
        "200":
          $ref: "//contracts.example.test/common.yaml#/components/responses/Ok"
components:
  responses:
    Ok:
      description: ok
`;

  assert.doesNotThrow(() =>
    assertNoUnresolvedLocalOpenApiReferences(validBundle, {
      context: "fixture",
      bundlePath: "generated/fixture.openapi.yaml",
    }));
});

test("entry contract owns references while generated artifacts stay separated", () => {
  const entry = read(entryContractPath);

  assert.match(entry, /x-bthwani-contract-layout:\s*MODULAR/);
  assert.match(entry, /x-bthwani-bundle:\s*\.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.match(entry, /\$ref:\s*["']\.\/paths\//);
  assert.match(entry, /\$ref:\s*["']\.\/components\//);
  assert.doesNotMatch(entry, /^\s{4}operationId:/m);

  assert.equal(
    fs.existsSync(path.join(contractsDirectory, "fragments/order-preparation-handoff.fragment.yaml")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(contractsDirectory, "fragments/pickup-recovery.fragment.yaml")),
    false,
  );
});
