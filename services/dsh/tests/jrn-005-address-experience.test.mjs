import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("JRN-005 enforces the OpenAPI address constraints in the shared brain", () => {
  const validation = read("services/dsh/frontend/shared/client-address/client-address.validation.ts");
  const controller = read("services/dsh/frontend/shared/client-address/use-client-address-controller.ts");

  assert.match(validation, /validateClientAddressDraft/);
  assert.match(validation, /labelLength > 80/);
  assert.match(validation, /recipientLength > 160/);
  assert.match(validation, /addressLength > 500/);
  assert.match(validation, /input\.latitude === undefined \|\| input\.longitude === undefined/);
  assert.match(validation, /input\.latitude < -90 \|\| input\.latitude > 90/);
  assert.match(validation, /input\.longitude < -180 \|\| input\.longitude > 180/);
  assert.match(controller, /validateMutationInput/);
  assert.match(controller, /validateClientAddressDraft\(input\)/);
  assert.match(controller, /if \(!validateMutationInput\(input\)\) return false/);
});

test("JRN-005 address form exposes bounded labelled fields and busy states", () => {
  const screen = read("services/dsh/frontend/app-client/account/AddressLocationScreen.tsx");

  for (const id of [
    "client-address-label",
    "client-address-recipient",
    "client-address-phone",
    "client-address-map-query",
    "client-address-line",
    "client-address-building",
    "client-address-floor",
    "client-address-unit",
    "client-address-instructions",
  ]) assert.match(screen, new RegExp(`id=\\"${id}\\"`));

  assert.match(screen, /keyboardShouldPersistTaps="handled"/);
  assert.match(screen, /accessibilityLiveRegion="assertive"/);
  assert.match(screen, /accessibilityLabel=\{`تعديل عنوان \$\{address\.label\}`\}/);
  assert.match(screen, /loading=\{mapController\.state\.kind === "loading"\}/);
  assert.match(screen, /loading=\{capturingLocation\}/);
  assert.match(screen, /loading=\{controller\.mutating\}/);
  assert.match(screen, /يجب اختيار موقع معتمد قبل الحفظ/);
  assert.match(screen, /validateClientAddressDraft\(toInput\(draft\)\)/);
});
