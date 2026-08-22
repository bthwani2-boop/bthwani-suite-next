import assert from "node:assert/strict";
import test from "node:test";

const routesUrl = new URL(
  "../../../../services/dsh/frontend/app-field/dsh-field.routes.ts",
  import.meta.url,
);

const { dshFieldRouteToPath } = await import(routesUrl.href);

test("field route contract produces canonical Expo Router paths", () => {
  assert.equal(dshFieldRouteToPath({ kind: "stores" }), "/");
  assert.equal(
    dshFieldRouteToPath({ kind: "onboarding", assignmentId: "assignment-1" }),
    "/onboarding/assignments/assignment-1",
  );
  assert.equal(
    dshFieldRouteToPath({ kind: "verification", storeId: "store-1", visitId: "visit-1" }),
    "/stores/store-1/visits/visit-1/verification",
  );
  assert.equal(
    dshFieldRouteToPath({ kind: "escalation", storeId: "store-1", visitId: "visit-1" }),
    "/stores/store-1/escalation?visitId=visit-1",
  );
});
