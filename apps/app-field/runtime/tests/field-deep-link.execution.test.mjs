import assert from "node:assert/strict";
import test from "node:test";

const parserUrl = new URL("../src/navigation/field-deep-link.ts", import.meta.url);
const { FIELD_APP_SCHEME, parseFieldDeepLink } = await import(parserUrl.href);

test("field deep links resolve canonical routes and identifiers", () => {
  assert.equal(FIELD_APP_SCHEME, "bthwani-field-next");
  assert.deepEqual(
    parseFieldDeepLink(
      "bthwani-field-next://visit?storeId=store-1&visitId=visit-2&partnerId=partner-3",
      101,
    ),
    {
      token: 101,
      target: "visit",
      storeId: "store-1",
      visitId: "visit-2",
      partnerId: "partner-3",
    },
  );
  assert.deepEqual(
    parseFieldDeepLink("bthwani-field-next://products?partnerId=partner%20one", 102),
    { token: 102, target: "products-upload", partnerId: "partner one" },
  );
  assert.deepEqual(
    parseFieldDeepLink("bthwani-field-next://work-queue", 103),
    { token: 103, target: "work-queue" },
  );
});

test("field deep links reject foreign, malformed, and unknown routes", () => {
  assert.equal(parseFieldDeepLink("", 1), null);
  assert.equal(parseFieldDeepLink("https://visit?storeId=store-1", 1), null);
  assert.equal(parseFieldDeepLink("bthwani-field-next://unknown?storeId=store-1", 1), null);
  assert.equal(parseFieldDeepLink("bthwani-field-next://visit?storeId=%E0%A4%A", 1), null);
});

test("field deep links ignore fragments and decode plus-separated query values", () => {
  assert.deepEqual(
    parseFieldDeepLink("bthwani-field-next://escalation?storeId=store+one&visitId=visit%202#ignored", 104),
    { token: 104, target: "escalation", storeId: "store one", visitId: "visit 2" },
  );
});
