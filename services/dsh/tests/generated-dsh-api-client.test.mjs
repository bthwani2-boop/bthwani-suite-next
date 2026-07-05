import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { parseOpenApiContract } from "../../../tools/guards/_openapi-utils.mjs";

const source = fs.readFileSync(
  new URL("../clients/generated/dsh-api.ts", import.meta.url),
  "utf8",
);

const operations = parseOpenApiContract("services/dsh/contracts/dsh.openapi.yaml");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pathEntryBlock(apiPath) {
  const marker = `    ${JSON.stringify(apiPath)}: {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `generated paths interface is missing ${apiPath}`);

  const nextEntry = source.indexOf('\n    "/', start + marker.length);
  const interfaceEnd = source.indexOf("\n}\nexport type webhooks", start);
  const end = nextEntry === -1 ? interfaceEnd : nextEntry;
  assert.notEqual(end, -1, `generated paths interface block is unterminated for ${apiPath}`);
  return source.slice(start, end);
}

function operationEntryBlock(operationId) {
  const marker = `    ${operationId}: {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `generated operations interface is missing ${operationId}`);

  const rest = source.slice(start + marker.length);
  const nextOperation = rest.match(/\n    [A-Za-z_$][\w$]*: \{/);
  const interfaceEnd = source.indexOf("\n}\n", start);
  const end = nextOperation ? start + marker.length + nextOperation.index : interfaceEnd;
  assert.notEqual(end, -1, `generated operations interface block is unterminated for ${operationId}`);
  return source.slice(start, end);
}

function assertOperationBinding(operation) {
  assert.ok(operation.operationId, `${operation.method} ${operation.path} is missing operationId`);
  const block = pathEntryBlock(operation.path);
  const method = operation.method.toLowerCase();
  assert.match(
    block,
    new RegExp(`\\b${method}: operations\\["${escapeRegex(operation.operationId)}"\\]`),
    `generated paths interface is missing ${method.toUpperCase()} ${operation.path} -> ${operation.operationId}`,
  );
  assert.match(
    source,
    new RegExp(`\\b${escapeRegex(operation.operationId)}:\\s*\\{`),
    `generated operations interface is missing ${operation.operationId}`,
  );
}

describe("generated DSH API client parity", () => {
  test("binds every OpenAPI operation path and method to the generated operations interface", () => {
    const seen = new Set();

    for (const operation of operations) {
      assertOperationBinding(operation);
      assert.equal(
        seen.has(operation.operationId),
        false,
        `duplicate operationId in DSH OpenAPI: ${operation.operationId}`,
      );
      seen.add(operation.operationId);
    }
  });

  test("keeps OpenAPI path parameters represented in generated path params", () => {
    for (const operation of operations) {
      if (operation.pathParams.length === 0) continue;

      const block = operationEntryBlock(operation.operationId);
      for (const parameter of operation.pathParams) {
        assert.equal(
          parameter.wildcard,
          false,
          `OpenAPI path must not expose Go wildcard capture ${operation.path}`,
        );
        assert.match(
          block,
          new RegExp(`\\b${escapeRegex(parameter.name)}:\\s*`),
          `generated path params are missing ${parameter.name} for ${operation.path}`,
        );
      }
    }
  });

  test("keeps media download as opaque query mediaRef and not wildcard path media", () => {
    assert.match(source, /"\/dsh\/media": \{/);
    assert.doesNotMatch(source, /"\/dsh\/media\/\{mediaRef\}"/);
    assert.doesNotMatch(source, /"\/dsh\/media\/\{mediaRef\.\.\.\}"/);

    const getMedia = operationEntryBlock("getMedia");
    assert.match(getMedia, /\bquery:\s*\{/);
    assert.match(getMedia, /\bmediaRef:\s*string;/);
    assert.match(getMedia, /\bpath\?:\s*never;/);
  });

  test("keeps internal WLT callback guarded by required service headers", () => {
    const callback = operationEntryBlock("reportWltPaymentSessionEvent");
    assert.match(callback, /\bheader:\s*\{/);
    assert.match(callback, /\bAuthorization:\s*string;/);
    assert.match(callback, /"X-Service-Caller":\s*"wlt";/);
    assert.match(callback, /\brequestBody:\s*\{/);
  });

  test("keeps retired marketing banners and promos out of the generated client", () => {
    assert.doesNotMatch(source, /listDshMarketingBanners/);
    assert.doesNotMatch(source, /listDshMarketingPromos/);
    assert.doesNotMatch(source, /DshMarketingBanner/);
    assert.doesNotMatch(source, /DshMarketingPromo/);
  });
});
