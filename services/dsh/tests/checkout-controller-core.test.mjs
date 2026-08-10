import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  resolveCheckoutReloadSuccess,
  resolveCheckoutSubmitError,
  resolveCheckoutSubmitSuccess,
  resolveOperatorCheckoutLoadState,
} = await import("../dist/services/dsh/frontend/shared/checkout/checkout.controller-core.js");
const {
  checkoutIntentHasWltSession,
} = await import("../dist/services/dsh/frontend/shared/checkout/checkout.view-model.js");

const intent = (overrides = {}) => ({
  id: "intent-1",
  clientId: "client-1",
  cartId: "cart-1",
  storeId: "store-1",
  fulfillmentMode: "bthwani_delivery",
  state: "confirming",
  paymentMethod: "cod",
  wltPaymentSessionId: "",
  deliveryAddress: "",
  note: "",
  version: 1,
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
  ...overrides,
});

describe("checkout controller core", () => {
  test("keeps empty WLT session as confirming reference", () => {
    assert.equal(checkoutIntentHasWltSession(intent()), false);
    assert.equal(resolveCheckoutSubmitSuccess(intent()).kind, "confirming");
    assert.equal(
      resolveCheckoutSubmitSuccess(intent({ state: "confirmed", wltPaymentSessionId: "wlt-1" })).kind,
      "success",
    );
  });

  test("reload treats cancelled and expired intents as terminal", () => {
    assert.equal(resolveCheckoutReloadSuccess(intent({ state: "cancelled" })).kind, "terminal");
    assert.equal(resolveCheckoutReloadSuccess(intent({ state: "expired" })).kind, "terminal");
  });

  test("maps submit errors and operator list state", () => {
    assert.equal(resolveCheckoutSubmitError({ kind: "permission_denied" }).kind, "error");
    assert.equal(resolveCheckoutSubmitError({ kind: "offline" }).kind, "error");
    assert.equal(resolveOperatorCheckoutLoadState([]), "empty");
    assert.equal(resolveOperatorCheckoutLoadState([intent()]), "success");
  });
});

describe("checkout controller core: non-COD payment confirmation", () => {
  test("wallet/mixed/official_wallet intents stay confirming until WLT confirms", () => {
    const walletIntent = intent({ paymentMethod: "wallet", wltPaymentSessionId: "wlt-1" });
    assert.equal(resolveCheckoutSubmitSuccess(walletIntent).kind, "confirming");
  });

  test("confirmed is success regardless of payment method", () => {
    const confirmed = intent({ paymentMethod: "wallet", state: "confirmed", wltPaymentSessionId: "wlt-1" });
    assert.equal(resolveCheckoutSubmitSuccess(confirmed).kind, "success");
  });

  test("payment_failed maps to blocked state", () => {
    const failed = intent({ paymentMethod: "mixed", state: "blocked", wltPaymentSessionId: "wlt-1" });
    assert.equal(resolveCheckoutSubmitSuccess(failed).kind, "blocked");
  });
});
