import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const serviceRoot = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(serviceRoot, relative), "utf8");

test("WLT reference transport authenticates both browser and native callers", () => {
  const transport = read("frontend/shared/dsh/wlt-dsh-http-request.ts");
  assert.match(transport, /getIdentityAccessToken/);
  assert.match(transport, /const cookieMode = isRelativeWltUrl\(url\)/);
  assert.match(transport, /credentials:\s*"include"/);
  assert.match(transport, /Authorization: `Bearer \$\{token\}`/);
  assert.match(transport, /status:\s*401/);
  assert.doesNotMatch(transport, /public reference/);
  assert.doesNotMatch(transport, /unauthenticated by design/);
});

test("WLT SaaS reference contract declares Identity or trusted DSH authentication", () => {
  const overlay = read("contracts/wlt.saas-reference-auth.overlay.yaml");
  const manifest = read("service.manifest.ts");
  for (const operation of [
    "payment-status",
    "settlement-status",
    "refund-status",
    "wallet-status",
  ]) {
    assert.match(overlay, new RegExp(operation));
  }
  assert.match(overlay, /BearerIdentity/);
  assert.match(overlay, /DshServiceBearer/);
  assert.match(overlay, /DshServiceCaller/);
  assert.match(overlay, /TenantContext/);
  assert.match(manifest, /wlt\.saas-reference-auth\.overlay\.yaml/);
  assert.match(manifest, /saasReferenceAuthenticationReady:\s*true/);
});
