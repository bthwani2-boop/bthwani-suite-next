#!/usr/bin/env bash
set -euo pipefail

base_url="${WLT_BASE_URL:-http://127.0.0.1:58083}"
service_token="${WLT_SERVICE_TOKEN:?WLT_SERVICE_TOKEN is required}"
database_url="${DATABASE_URL:?DATABASE_URL is required}"

auth_headers=(
  -H "Authorization: Bearer ${service_token}"
  -H "X-Service-Caller: dsh"
  -H "Content-Type: application/json"
)

json_request() {
  local method="$1"
  local path="$2"
  local correlation_id="$3"
  local idempotency_key="$4"
  local body="$5"
  local extra_headers=(-H "X-Correlation-ID: ${correlation_id}")
  if [[ -n "${idempotency_key}" ]]; then
    extra_headers+=( -H "Idempotency-Key: ${idempotency_key}" )
  fi
  curl --fail-with-body --silent --show-error \
    -X "${method}" \
    "${auth_headers[@]}" \
    "${extra_headers[@]}" \
    --data "${body}" \
    "${base_url}${path}"
}

for _ in $(seq 1 60); do
  if curl --fail --silent "${base_url}/wlt/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl --fail --silent "${base_url}/wlt/health" >/dev/null

payment_body='{
  "checkoutIntentId":"checkout-jrn036-ci",
  "specialRequestId":"",
  "subscriptionPurchaseId":"",
  "commercialProductReference":"",
  "tenantId":"tenant-jrn036-ci",
  "clientId":"client-jrn036-ci",
  "storeId":"store-jrn036-ci",
  "paymentMethod":"wallet",
  "amountMinorUnits":10000,
  "currency":"YER",
  "cartSnapshotHash":"cart-hash-jrn036-ci"
}'
payment_response=$(curl --fail-with-body --silent --show-error \
  -X POST \
  "${auth_headers[@]}" \
  -H "X-Tenant-ID: tenant-jrn036-ci" \
  -H "X-Correlation-ID: corr-payment-jrn036-ci" \
  -H "Idempotency-Key: idem-payment-jrn036-ci" \
  --data "${payment_body}" \
  "${base_url}/wlt/payment-sessions")
payment_session_id=$(jq -er '.paymentSession.id' <<<"${payment_response}")

psql "${database_url}" -v ON_ERROR_STOP=1 -v session_id="${payment_session_id}" <<'SQL'
UPDATE wlt_payment_sessions
SET status = 'captured', captured_at = NOW(), updated_at = NOW()
WHERE id = :'session_id';

INSERT INTO wlt_refunds (
  payment_session_id, order_id, client_id, amount_minor_units, currency,
  reason, status, resolved_at, tenant_id, requested_by_operator_id,
  eligibility_reference, idempotency_key, provider_idempotency_key
) VALUES (
  :'session_id', 'order-jrn036-ci', 'client-jrn036-ci', 1500, 'YER',
  'JRN-036 refund-aware settlement smoke', 'completed', NOW(),
  'tenant-jrn036-ci', 'operator-jrn036-ci', 'eligibility-jrn036-ci',
  'refund-jrn036-ci', 'provider-refund-jrn036-ci'
);
SQL

settlement_policy_body='{
  "feeBasisPoints":1000,
  "currency":"YER",
  "status":"active",
  "cycleDays":7,
  "minimumNetMinorUnits":1,
  "changeReason":"JRN-036 runtime verification",
  "operatorId":"operator-jrn036-ci"
}'
json_request PUT "/wlt/settlement-policies/partner-jrn036-ci" \
  "corr-settlement-policy-jrn036-ci" "" "${settlement_policy_body}" \
  | jq -e '.settlementPolicy.version == 1 and .settlementPolicy.status == "active"' >/dev/null

settlement_body='{
  "partnerId":"partner-jrn036-ci",
  "periodStart":"2026-07-01",
  "periodEnd":"2026-07-31",
  "orderSources":[{
    "orderId":"order-jrn036-ci",
    "grossAmountMinorUnits":10000,
    "currency":"YER",
    "deliveredAt":"2026-07-20T10:00:00Z",
    "pricingSnapshotHash":"pricing-hash-jrn036-ci",
    "completionEventId":"completion-event-jrn036-ci",
    "completionEvidenceHash":"completion-hash-jrn036-ci",
    "cancellationStatus":"not_cancelled"
  }],
  "operatorId":"operator-jrn036-ci",
  "idempotencyKey":"settlement-jrn036-ci"
}'
settlement_response=$(json_request POST "/wlt/settlements" \
  "corr-settlement-jrn036-ci" "settlement-jrn036-ci" "${settlement_body}")
settlement_id=$(jq -er '.settlement.id' <<<"${settlement_response}")
jq -e '
  .settlement.grossAmount == 8500 and
  .settlement.platformFee == 850 and
  .settlement.netAmount == 7650 and
  .settlement.orderCount == 1
' <<<"${settlement_response}" >/dev/null

settlement_repeat=$(json_request POST "/wlt/settlements" \
  "corr-settlement-repeat-jrn036-ci" "settlement-jrn036-ci" "${settlement_body}")
test "$(jq -er '.settlement.id' <<<"${settlement_repeat}")" = "${settlement_id}"

settlement_evidence=$(curl --fail-with-body --silent --show-error \
  "${auth_headers[@]}" \
  -H "X-Correlation-ID: corr-settlement-evidence-jrn036-ci" \
  "${base_url}/wlt/settlements/${settlement_id}/evidence")
jq -e '
  .evidence | length == 1 and
  .[0].originalGrossMinorUnits == 10000 and
  .[0].completedRefundMinorUnits == 1500 and
  .[0].settlementBasisMinorUnits == 8500 and
  .[0].cancellationStatus == "not_cancelled"
' <<<"${settlement_evidence}" >/dev/null

conflicting_settlement_body=${settlement_body/10000/11000}
conflict_status=$(curl --silent --show-error \
  --output /tmp/jrn036-settlement-conflict.json \
  --write-out '%{http_code}' \
  -X POST \
  "${auth_headers[@]}" \
  -H "X-Correlation-ID: corr-settlement-conflict-jrn036-ci" \
  -H "Idempotency-Key: settlement-jrn036-ci" \
  --data "${conflicting_settlement_body}" \
  "${base_url}/wlt/settlements")
test "${conflict_status}" = "409"
jq -e '.code == "IDEMPOTENCY_CONFLICT"' /tmp/jrn036-settlement-conflict.json >/dev/null

commission_policy_body='{
  "policyId":"field-visit-jrn036-ci",
  "commissionType":"field_visit_fee",
  "sourceType":"field_visit",
  "beneficiaryActorType":"field",
  "calculationType":"fixed",
  "fixedAmountMinorUnits":2000,
  "basisPoints":0,
  "minimumAmountMinorUnits":2000,
  "maximumAmountMinorUnits":2000,
  "currency":"YER",
  "status":"active",
  "changeReason":"JRN-036 runtime verification",
  "operatorId":"operator-jrn036-ci"
}'
json_request PUT "/wlt/commission-policies" \
  "corr-commission-policy-jrn036-ci" "" "${commission_policy_body}" \
  | jq -e '.commissionPolicy.version == 1 and .commissionPolicy.fixedAmountMinorUnits == 2000' >/dev/null

# The governed route must reject any caller-supplied financial result. The
# source may provide evidence and a gross basis only; WLT owns the amount.
caller_amount_body='{
  "beneficiaryActorId":"field-jrn036-rejected",
  "beneficiaryActorType":"field",
  "sourceType":"field_visit",
  "sourceId":"visit-jrn036-rejected",
  "commissionType":"field_visit_fee",
  "grossBasisMinorUnits":0,
  "currency":"YER",
  "amountMinorUnits":999999,
  "idempotencyKey":"commission-jrn036-rejected"
}'
caller_amount_status=$(curl --silent --show-error \
  --output /tmp/jrn036-caller-amount.json \
  --write-out '%{http_code}' \
  -X POST \
  "${auth_headers[@]}" \
  -H "X-Correlation-ID: corr-caller-amount-jrn036-ci" \
  -H "Idempotency-Key: commission-jrn036-rejected" \
  --data "${caller_amount_body}" \
  "${base_url}/wlt/commissions")
test "${caller_amount_status}" = "400"
jq -e '.code == "INVALID_REQUEST"' /tmp/jrn036-caller-amount.json >/dev/null

commission_body='{
  "beneficiaryActorId":"field-jrn036-ci",
  "beneficiaryActorType":"field",
  "sourceType":"field_visit",
  "sourceId":"visit-jrn036-ci",
  "commissionType":"field_visit_fee",
  "grossBasisMinorUnits":0,
  "currency":"YER",
  "idempotencyKey":"commission-jrn036-ci"
}'
commission_response=$(json_request POST "/wlt/commissions" \
  "corr-commission-jrn036-ci" "commission-jrn036-ci" "${commission_body}")
commission_id=$(jq -er '.commission.id' <<<"${commission_response}")
jq -e '.commission.amountMinorUnits == 2000 and .commission.status == "pending"' \
  <<<"${commission_response}" >/dev/null

commission_repeat=$(json_request POST "/wlt/commissions" \
  "corr-commission-repeat-jrn036-ci" "commission-jrn036-ci" "${commission_body}")
test "$(jq -er '.commission.id' <<<"${commission_repeat}")" = "${commission_id}"

adjustment_body='{
  "deltaMinorUnits":500,
  "reason":"verified quality bonus",
  "operatorId":"operator-jrn036-ci",
  "idempotencyKey":"adjustment-jrn036-ci-a"
}'
json_request POST "/wlt/commissions/${commission_id}/adjust" \
  "corr-adjustment-a-jrn036-ci" "adjustment-jrn036-ci-a" "${adjustment_body}" \
  | jq -e '.commission.amountMinorUnits == 2500 and .commission.status == "pending"' >/dev/null

# Exact retry with the same idempotency key must not move the wallet twice.
json_request POST "/wlt/commissions/${commission_id}/adjust" \
  "corr-adjustment-a-repeat-jrn036-ci" "adjustment-jrn036-ci-a" "${adjustment_body}" \
  | jq -e '.commission.amountMinorUnits == 2500 and .commission.status == "pending"' >/dev/null

# A later, legitimate adjustment may have the same delta/reason/operator but a
# new idempotency identity. It must create a second ledger transaction rather
# than colliding with the first adjustment's financial reference.
adjustment_body_b=${adjustment_body/adjustment-jrn036-ci-a/adjustment-jrn036-ci-b}
json_request POST "/wlt/commissions/${commission_id}/adjust" \
  "corr-adjustment-b-jrn036-ci" "adjustment-jrn036-ci-b" "${adjustment_body_b}" \
  | jq -e '.commission.amountMinorUnits == 3000 and .commission.status == "pending"' >/dev/null

json_request POST "/wlt/commissions/${commission_id}/confirm" \
  "corr-confirm-jrn036-ci" "" '{"operatorId":"operator-jrn036-ci"}' \
  | jq -e '.commission.status == "confirmed"' >/dev/null

json_request POST "/wlt/commissions/${commission_id}/settle" \
  "corr-settle-jrn036-ci" "" '{"operatorId":"operator-jrn036-ci"}' \
  | jq -e '.commission.status == "settled"' >/dev/null

json_request POST "/wlt/commissions/${commission_id}/reverse" \
  "corr-reverse-jrn036-ci" "" \
  '{"operatorId":"operator-jrn036-ci","reason":"runtime reversal proof"}' \
  | jq -e '.commission.status == "reversed" and .commission.resolutionNote == "runtime reversal proof"' >/dev/null

commission_detail=$(curl --fail-with-body --silent --show-error \
  "${auth_headers[@]}" \
  -H "X-Correlation-ID: corr-commission-detail-jrn036-ci" \
  "${base_url}/wlt/commissions/${commission_id}")
jq -e '
  .commission.status == "reversed" and
  .commission.amountMinorUnits == 3000 and
  .evidence.policyVersion == 1 and
  .evidence.calculatedAmountMinorUnits == 2000 and
  (.adjustments | length) == 2 and
  .adjustments[0].deltaMinorUnits == 500 and
  .adjustments[1].deltaMinorUnits == 500 and
  .adjustments[0].id != .adjustments[1].id
' <<<"${commission_detail}" >/dev/null

wallet_response=$(curl --fail-with-body --silent --show-error \
  "${auth_headers[@]}" \
  -H "X-Correlation-ID: corr-wallet-jrn036-ci" \
  "${base_url}/wlt/wallets/field/field-jrn036-ci")
jq -e '
  .wallet.pendingBalanceMinorUnits == 0 and
  .wallet.availableBalanceMinorUnits == 0 and
  .wallet.settledTotalMinorUnits == 0
' <<<"${wallet_response}" >/dev/null

psql "${database_url}" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  unbalanced_count bigint;
  audit_count bigint;
  adjustment_ledger_count bigint;
BEGIN
  SELECT COUNT(*) INTO unbalanced_count
  FROM (
    SELECT ledger_transaction_id
    FROM wlt_ledger_lines
    GROUP BY ledger_transaction_id
    HAVING SUM(
      CASE
        WHEN debit_credit = 'debit' THEN amount_minor_units
        ELSE -amount_minor_units
      END
    ) <> 0
  ) AS unbalanced;
  IF unbalanced_count <> 0 THEN
    RAISE EXCEPTION 'found % unbalanced ledger transactions', unbalanced_count;
  END IF;

  SELECT COUNT(*) INTO adjustment_ledger_count
  FROM wlt_ledger_transactions
  WHERE reference_type = 'commission_adjustment';
  IF adjustment_ledger_count <> 2 THEN
    RAISE EXCEPTION 'expected 2 independent adjustment ledger transactions, found %', adjustment_ledger_count;
  END IF;

  SELECT COUNT(*) INTO audit_count
  FROM wlt_jrn036_audit_events
  WHERE correlation_id LIKE 'corr-%-jrn036-ci';
  IF audit_count < 8 THEN
    RAISE EXCEPTION 'expected at least 8 JRN-036 audit events, found %', audit_count;
  END IF;
END $$;
SQL

echo "JRN-036 live WLT settlement and commission smoke passed"
