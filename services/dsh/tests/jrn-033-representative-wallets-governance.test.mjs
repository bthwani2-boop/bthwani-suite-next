import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function assertIncludesAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

const representativeTypes = ["client", "partner", "captain", "field"];

test("JRN-033 product truth keeps WLT ownership and independent acceptance pending", () => {
  const truth = JSON.parse(read("governance/product/contracts/jrn-033-representative-wallets.product-truth.json"));
  assert.equal(truth.schemaVersion, 1);
  assert.equal(truth.capabilityId, "JRN_033_REPRESENTATIVE_WALLETS_REFERENCE_FINANCE");
  assert.equal(truth.state, "DISCOVERY");
  assert.equal(truth.owners.productManagerApproval, "PENDING");
  assert.equal(truth.owners.productOwnerApproval, "PENDING");
  assert.equal(truth.owners.productAcceptanceDecision, "PENDING");
  assert.ok(truth.invariants.business.includes("WLT is the sole owner of wallet and ledger truth."));
  assert.ok(truth.invariants.negative.includes("No DSH table or handler mutates representative wallet balances."));
  assert.ok(truth.acceptance.runtimeEvidenceRequired);
  assert.ok(truth.acceptance.visualEvidenceRequired);
});

test("JRN-033 WLT accepts only supported representative wallet actors", () => {
  const handler = read("services/wlt/backend/internal/wallet/handler.go");
  const proxy = read("services/dsh/backend/internal/wlt/finance_proxy.go");
  for (const actorType of representativeTypes) {
    assert.ok(handler.includes(`"${actorType}":`), `WLT handler is missing ${actorType}`);
    assert.ok(proxy.includes(`"${actorType}":`), `DSH finance proxy is missing ${actorType}`);
  }
  assert.ok(!handler.includes('"operator": {}'), "operator must not own a representative wallet");
  assert.ok(!proxy.includes('"operator": {}'), "operator must not be proxied as a representative wallet owner");
  assertIncludesAll(proxy, [
    "url.PathEscape(actorType)",
    "url.PathEscape(actorID)",
    "len(actorID) > 200",
    "financeWritePathAllowed",
  ], "DSH WLT finance boundary");
});

test("JRN-033 self-service routes derive actor identity and operator routes pin actor scope", () => {
  const routes = read("services/dsh/backend/internal/http/representative_finance_routes.go");
  const registrar = read("services/dsh/backend/internal/http/catalog_unified_routes.go");
  assertIncludesAll(registrar, ["registerRepresentativeFinanceRoutes(mux, s)"], "protected route registrar");
  assertIncludesAll(routes, [
    "s.requireActor(w, r, actorType)",
    '"actorId":   {actor.ID}',
    '"actorType": {actorType}',
    'GET /dsh/client/me/finance/wallet',
    'GET /dsh/client/me/finance/ledger-entries',
    'GET /dsh/partner/me/finance/wallet',
    'GET /dsh/partner/me/finance/ledger-entries',
    'GET /dsh/captain/me/finance/wallet',
    'GET /dsh/captain/me/finance/ledger-entries',
    'GET /dsh/field/me/finance/wallet',
    'GET /dsh/field/me/finance/ledger-entries',
    'GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}',
    'GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}/ledger-entries',
    'resolveControlPanelRepresentativeActor',
    'FinancePermissionRead',
    'Cache-Control", "private, no-store',
  ], "representative finance routes");

  for (const line of routes.split("\n")) {
    if (line.includes("/me/finance/")) {
      assert.ok(!line.includes("{actorId}"), `self-service route must not accept actor id: ${line}`);
    }
  }
});

test("JRN-033 shared actor wallet brain uses canonical DSH routes only", () => {
  const api = read("services/dsh/frontend/shared/finance-wlt-link/actor-wallet/actor-wallet.api.ts");
  const controller = read("services/dsh/frontend/shared/finance-wlt-link/actor-wallet/use-actor-wallet-controller.ts");
  const panel = read("services/dsh/frontend/shared/finance-wlt-link/actor-wallet/ActorWalletPanel.tsx");
  assertIncludesAll(api, [
    'type RepresentativeActorType = "client" | "partner" | "captain" | "field"',
    '`/dsh/${actorType}/me/finance`',
    'fetchOwnRepresentativeWallet',
    'fetchOwnRepresentativeLedger',
  ], "shared actor wallet API");
  assert.ok(!api.includes("/wlt/"), "frontend must not call WLT directly");
  assertIncludesAll(controller, ["Promise.allSettled", "ledgerError", "fetchOwnRepresentativeWallet"], "shared actor wallet controller");
  assertIncludesAll(panel, [
    "availableBalanceMinorUnits",
    "pendingBalanceMinorUnits",
    "heldBalanceMinorUnits",
    "earnedTotalMinorUnits",
    "settledTotalMinorUnits",
    "paidTotalMinorUnits",
    "دفتر الحركة المرجعي",
    "إعادة المحاولة",
  ], "shared actor wallet panel");
});

test("JRN-033 client partner captain and field surfaces bind wallet truth", () => {
  const client = read("services/dsh/frontend/app-client/account/MySpaceScreen.tsx");
  const partner = read("services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx");
  const captain = read("services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx");
  const field = read("services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx");
  const fieldApi = read("services/dsh/frontend/shared/finance-wlt-link/field-finance/field-finance.api.ts");
  assert.ok(client.includes('<ActorWalletPanel actorType="client"'));
  assert.ok(partner.includes('<ActorWalletPanel actorType="partner"'));
  assert.ok(captain.includes('<ActorWalletPanel actorType="captain"'));
  assert.ok(fieldApi.includes("/dsh/field/me/finance/ledger-entries?limit=30"));
  assert.ok(field.includes("دفتر الحركة المرجعي"));
  assert.ok(!partner.includes("partner_123"), "partner wallet must not use a hardcoded actor fallback");
  assert.ok(!partner.includes("pendingAmountLabel"), "settlement pending amount must not be rendered as wallet available balance");
});

test("JRN-033 control panel lookup loads a permission-scoped wallet and matching ledger", () => {
  const lookup = read("services/dsh/frontend/control-panel/finance/RepresentativeWalletLookup.tsx");
  const page = read("apps/control-panel/runtime/src/app/dsh/finance/page.tsx");
  assertIncludesAll(lookup, [
    "const representativeBase = `/dsh/control-panel/finance/wallets/${actorType}/${encodedActorId}`",
    "`${representativeBase}/ledger-entries?limit=50`",
    "Promise.allSettled",
    "ledgerEntries",
    "ledgerError",
    "دفتر الممثل المرجعي",
    "قراءة فقط",
    "finance.read",
    "availableBalanceMinorUnits",
    "heldBalanceMinorUnits",
  ], "control-panel wallet lookup");
  assert.ok(page.includes("<RepresentativeWalletLookup />"), "finance page must bind representative wallet lookup");
  assert.ok(!lookup.includes("method: \"POST\""), "wallet lookup must remain read-only");
  assert.ok(!lookup.includes("/wlt/"), "control panel must not call WLT directly");
});

test("JRN-033 focused contract declares every wallet and ledger operation", () => {
  const contract = read("services/dsh/contracts/jrn-033-representative-finance.openapi.yaml");
  assertIncludesAll(contract, [
    "operationId: getDshClientOwnWallet",
    "operationId: listDshClientOwnLedgerEntries",
    "operationId: getDshPartnerOwnWallet",
    "operationId: listDshPartnerOwnLedgerEntries",
    "operationId: getDshCaptainOwnWallet",
    "operationId: listDshCaptainOwnLedgerEntries",
    "operationId: getDshFieldOwnWallet",
    "operationId: listDshFieldOwnLedgerEntries",
    "operationId: getDshRepresentativeWallet",
    "operationId: listDshRepresentativeLedgerEntries",
    "/dsh/control-panel/finance/wallets/{actorType}/{actorId}/ledger-entries:",
    "enum: [client, partner, captain, field]",
    "private, no-store",
  ], "JRN-033 OpenAPI contract");
});

test("JRN-033 contains no representative balance mutation route in the new boundary", () => {
  const routes = read("services/dsh/backend/internal/http/representative_finance_routes.go");
  const api = read("services/dsh/frontend/shared/finance-wlt-link/actor-wallet/actor-wallet.api.ts");
  const lookup = read("services/dsh/frontend/control-panel/finance/RepresentativeWalletLookup.tsx");
  for (const forbidden of ["UpdateWallet", "SetBalance", "AdjustBalance", "AppendLedger", "POST /dsh/client/me/finance/wallet", "PATCH /dsh/control-panel/finance/wallets"]) {
    assert.ok(!routes.includes(forbidden), `new DSH finance boundary contains forbidden mutation token ${forbidden}`);
    assert.ok(!api.includes(forbidden), `shared actor wallet API contains forbidden mutation token ${forbidden}`);
    assert.ok(!lookup.includes(forbidden), `operator wallet lookup contains forbidden mutation token ${forbidden}`);
  }
});
