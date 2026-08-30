import assert from "node:assert/strict";
import test from "node:test";

const navigation = await import(new URL(
  "../../../../services/dsh/frontend/app-client/client-navigation.ts",
  import.meta.url,
));

const {
  dshClientRouteFromActionUrl,
  dshClientRouteToPath,
} = navigation;

test("client action routes round-trip through the canonical path contract", () => {
  const routes = [
    { kind: "home" },
    { kind: "stores" },
    { kind: "store", storeId: "store one" },
    { kind: "orders" },
    { kind: "order", orderId: "order-1" },
    { kind: "order-pickup", orderId: "order-1" },
    { kind: "order-chat", orderId: "order-1", fulfillmentMode: "pickup" },
    { kind: "notifications" },
    { kind: "special-requests" },
    { kind: "special-request-shein" },
    { kind: "special-request-awnak" },
    { kind: "wallet" },
    { kind: "cart" },
    { kind: "cart", storeId: "store-1" },
    { kind: "profile" },
    { kind: "profile-commercial" },
    { kind: "profile-addresses" },
    { kind: "profile-addresses", returnStoreId: "store-1" },
    { kind: "profile-identity" },
    { kind: "profile-benefits" },
    { kind: "profile-preferences" },
    { kind: "support" },
    { kind: "support", orderId: "order-1" },
    { kind: "support-ticket", ticketId: "ticket-1" },
  ];

  for (const route of routes) {
    const path = dshClientRouteToPath(route);
    assert.deepEqual(dshClientRouteFromActionUrl(path), route, path);
  }
});

test("client action route decoding rejects malformed or non-canonical input", () => {
  assert.deepEqual(dshClientRouteFromActionUrl("/orders/pickup"), { kind: "orders" });
  assert.equal(dshClientRouteFromActionUrl("/orders/%E0%A4%A"), null);
  assert.equal(dshClientRouteFromActionUrl("/orders/order%2Fone"), null);
  assert.equal(dshClientRouteFromActionUrl("https://example.com/orders/order-1"), null);
  assert.equal(dshClientRouteFromActionUrl("//orders/order-1"), null);
  assert.equal(dshClientRouteFromActionUrl("/orders/order-1?unexpected=yes"), null);
  assert.equal(dshClientRouteFromActionUrl("/cart?storeId="), null);
});

test("special-request notification paths remain list-scoped until a detail route exists", () => {
  assert.deepEqual(
    dshClientRouteFromActionUrl("/special-requests/request-1"),
    { kind: "special-requests" },
  );
});
