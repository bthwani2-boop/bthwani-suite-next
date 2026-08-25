import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED = "true";

const calls = [];
let responseMode = "ok";
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, init });
  if (responseMode === "network") throw new Error("network down");
  if (responseMode === "not-found") {
    return new Response(JSON.stringify({ code: "NOT_FOUND" }), { status: 404 });
  }
  if (responseMode === "unauthorized") {
    return new Response(JSON.stringify({ code: "AUTH_MISSING" }), { status: 401 });
  }
  if (url.includes("payout-destination/deactivate")) return new Response(null, { status: 204 });
  if (url.includes("payout-destination")) {
    return Response.json({
      payoutDestination: {
        id: "destination-1",
        ownerActorId: "actor-1",
        ownerActorType: "partner",
        beneficiaryName: "Partner",
        officialWalletProviderKey: "provider",
        destinationMethod: "official_wallet",
        maskedDestinationReference: "***1234",
        destinationVerificationStatus: "verified",
        destinationVersion: 2,
        active: true,
        updatedAt: "2026-08-12T00:00:00Z",
      },
    });
  }
  if (url.includes("payout-requests")) {
    return Response.json({ payoutRequests: [{ id: "payout-1", status: "pending" }] });
  }
  if (url.includes("financial-summary")) return Response.json({ financialSummary: { total: 1 } });
  if (url.includes("ledger/entries")) return Response.json({ ledgerEntries: [{ id: "ledger-1" }] });
  if (url.includes("refunds")) return Response.json({ refunds: [{ id: "refund-1" }] });
  if (url.includes("settlements")) return Response.json({ settlements: [] });
  return Response.json({});
};

const payout = await import("../../dsh/frontend/wlt/payouts/payout.api.ts");
const operator = await import("../../dsh/frontend/wlt/payouts/payout-operator.api.ts");
const finance = await import("../../dsh/frontend/wlt/finance/finance-hub-runtime.api.ts");

test("payout boundary executes verified, missing and mutation paths", async () => {
  const destination = await payout.fetchOwnPayoutDestination("partner");
  assert.equal(payout.isVerifiedPayoutDestination(destination), true);
  assert.equal(payout.isVerifiedPayoutDestination({ ...destination, active: false }), false);
  assert.deepEqual(await payout.fetchOwnPayoutRequests("partner"), [{ id: "payout-1", status: "pending" }]);
  await payout.createOwnPayoutRequest("partner", "SPECIFIED", 100, "YER", "payout-key");

  responseMode = "not-found";
  assert.equal(await payout.fetchOwnPayoutDestination("partner"), null);
  responseMode = "ok";
});

test("finance runtime boundary covers successful readback and fail-closed errors", async () => {
  const result = await finance.loadDshFinanceRuntimeReadModel();
  assert.equal(result.state, "runtime");
  assert.equal(result.data.ledgerEntries.length, 1);
  assert.equal((await finance.approvePayoutRequest("payout-1")).ok, true);
  assert.equal((await finance.rejectPayoutRequest("payout-1")).ok, true);
  assert.equal((await finance.completePayoutRequest("payout-1")).ok, true);
  assert.equal((await finance.transitionPayoutRequest("payout-1", "process")).ok, true);
  assert.equal((await finance.upsertSettlementPolicy({
    partnerId: "partner-1", feeBasisPoints: 100, currency: "YER", status: "active",
    cycleDays: 7, minimumNetMinorUnits: 1, changeReason: "test",
  })).ok, true);
  assert.equal((await finance.createSettlementFromDeliveredOrders({
    partnerId: "partner-1", periodStart: "2026-08-01", periodEnd: "2026-08-12",
  })).ok, true);

  responseMode = "network";
  const blocked = await finance.loadDshFinanceRuntimeReadModel();
  assert.equal(blocked.state, "blocked");
  responseMode = "ok";
});

test("payout operator boundary returns explicit HTTP error codes", async () => {
  responseMode = "unauthorized";
  await assert.rejects(() => operator.fetchPayoutAudit("payout-1"));
  responseMode = "ok";
  assert.ok(calls.length > 0);
});
