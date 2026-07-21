import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const truth = JSON.parse(read("governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json"));
const lifecycleRoutes = read("services/dsh/backend/internal/http/partner_lifecycle_routes.go");
const dshHandlers = read("services/dsh/backend/internal/partner/onboarding_integrity_handlers.go");
const dshRepository = read("services/dsh/backend/internal/partner/onboarding_integrity_repository.go");
const dshClient = read("services/dsh/backend/internal/wlt/payout_destination.go");
const dshMigration = read("services/dsh/database/migrations/dsh-098_partner_onboarding_integrity.sql");
const wltServer = read("services/wlt/backend/internal/http/server.go");
const wltHandler = read("services/wlt/backend/internal/payout/upsert_governed.go");
const wltMigration = read("services/wlt/database/migrations/wlt-034_payout_destination_idempotency.sql");

assert.ok(truth.invariants.business.includes("WLT is the sole owner of raw payout destination data."));
assert.ok(truth.invariants.negative.includes("DSH cannot persist raw account number, IBAN, or payout mobile data after binding a WLT reference."));

assert.match(lifecycleRoutes, /handleGovernedFieldUpdatePartnerDraft/);
assert.doesNotMatch(lifecycleRoutes, /PATCH \/dsh\/field\/partners\/\{partnerId\}"\s*,\s*protected\.handleFieldUpdatePartnerDraft/);
assert.match(dshHandlers, /wltClient\.UpsertPayoutDestination/);
assert.match(dshHandlers, /input\.PayoutDestinationID = ref\.ID/);
assert.match(dshHandlers, /input\.MaskedAccountNumber = ref\.MaskedAccountNumber/);
assert.match(dshHandlers, /input\.BankAccountNumber = ""/);
assert.match(dshHandlers, /input\.BankIBAN = ""/);
assert.match(dshHandlers, /input\.PayoutMobileNumber = ""/);

assert.match(dshRepository, /bank_account_number = ''/);
assert.match(dshRepository, /bank_iban = ''/);
assert.match(dshRepository, /payout_mobile_number = ''/);
assert.match(dshRepository, /payout_destination_id = \$15/);
assert.match(dshRepository, /masked_account_number = \$16/);
assert.match(dshMigration, /dsh_partner_wlt_reference_excludes_raw_payout/);

assert.match(dshClient, /PUT|http\.MethodPut/);
assert.match(dshClient, /\/wlt\/payout-destinations\//);
assert.match(dshClient, /Idempotency-Key|setRequiredMutationHeaders/);
assert.doesNotMatch(dshClient, /WLT_FINANCIAL_PROVIDER_BASE_URL|wiremock-financial-provider|financial\/common/);

assert.match(wltServer, /payout\.HandleUpsertPayoutDestinationGoverned\(db\)/);
assert.match(wltHandler, /pgp_sym_encrypt/);
assert.match(wltHandler, /payoutDestinationRequestHash/);
assert.match(wltHandler, /IDEMPOTENCY_KEY_REUSED/);
assert.match(wltHandler, /shared\.SendJSON\(w, http\.StatusCreated, toRef\(destination\)\)/);
assert.doesNotMatch(wltHandler, /json:"accountNumber"[\s\S]*PayoutDestinationRef/);
assert.match(wltMigration, /wlt_payout_destination_requests/);
assert.match(wltMigration, /wlt_payout_destinations_one_active_partner_idx/);

console.log("JRN-001 FS-04 DSH/WLT truth ownership verified");
