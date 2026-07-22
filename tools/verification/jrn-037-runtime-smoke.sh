#!/usr/bin/env bash
set -euo pipefail

WLT_BASE_URL="${WLT_BASE_URL:-http://127.0.0.1:58083}"
WLT_SERVICE_TOKEN="${WLT_SERVICE_TOKEN:-jrn037-ci-service-token}"
ACTOR_ID="captain-jrn037-${GITHUB_RUN_ID:-local}-$$"
OTHER_ACTOR_ID="captain-other-jrn037-${GITHUB_RUN_ID:-local}-$$"
DESTINATION_CORRELATION="jrn037-destination-${GITHUB_RUN_ID:-local}-$$"
REQUEST_KEY="jrn037-request-${GITHUB_RUN_ID:-local}-$$"
UNKNOWN_KEY="jrn037-unknown-${GITHUB_RUN_ID:-local}-$$"

json_field() {
  local field="$1"
  node -e 'const fs=require("fs"); const value=JSON.parse(fs.readFileSync(0,"utf8")); const path=process.argv[1].split("."); let current=value; for(const key of path){ current=current?.[key]; } if(current===undefined||current===null){ process.exit(2); } process.stdout.write(String(current));' "$field"
}

api() {
  local method="$1"
  local path="$2"
  local correlation="$3"
  local idempotency="$4"
  local body="${5:-}"
  local args=(
    --silent --show-error --fail-with-body
    --request "$method"
    "$WLT_BASE_URL$path"
    --header "Accept: application/json"
    --header "Authorization: Bearer $WLT_SERVICE_TOKEN"
    --header "X-Service-Caller: dsh"
    --header "X-Correlation-ID: $correlation"
    --header "Idempotency-Key: $idempotency"
  )
  if [[ -n "$body" ]]; then
    args+=(--header "Content-Type: application/json" --data "$body")
  fi
  curl "${args[@]}"
}

for attempt in $(seq 1 60); do
  if curl --silent --fail "$WLT_BASE_URL/wlt/health" >/dev/null; then
    break
  fi
  if [[ "$attempt" = 60 ]]; then
    echo "WLT health did not become ready" >&2
    exit 1
  fi
  sleep 1
done

psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO wlt_wallets (
  actor_id, actor_type, status, currency,
  available_balance_minor_units, pending_balance_minor_units,
  held_balance_minor_units, earned_total_minor_units, paid_total_minor_units
)
VALUES ('$ACTOR_ID', 'captain', 'active', 'YER', 10000, 0, 0, 10000, 0)
ON CONFLICT (actor_type, actor_id)
DO UPDATE SET
  status = 'active',
  currency = 'YER',
  available_balance_minor_units = 10000,
  pending_balance_minor_units = 0,
  held_balance_minor_units = 0,
  earned_total_minor_units = GREATEST(wlt_wallets.earned_total_minor_units, 10000),
  paid_total_minor_units = 0,
  updated_at = now();
SQL

DESTINATION_BODY=$(cat <<JSON
{
  "beneficiaryName": "Captain JRN037",
  "bankName": "Runtime Bank",
  "bankBranch": "Sanaa",
  "accountNumber": "1234567890123456",
  "iban": "YE00JRN0371234567890123456",
  "payoutMobileNumber": "",
  "settlementPreference": "bank",
  "bankAccountHolderMatchesOwner": true,
  "bankNotes": "runtime governed destination",
  "operatorId": "$ACTOR_ID"
}
JSON
)
DESTINATION_JSON=$(api PUT "/wlt/payout-destinations/captain/$ACTOR_ID" "$DESTINATION_CORRELATION" "$DESTINATION_CORRELATION" "$DESTINATION_BODY")
DESTINATION_ID=$(printf '%s' "$DESTINATION_JSON" | json_field payoutDestination.id)
MASKED_ACCOUNT=$(printf '%s' "$DESTINATION_JSON" | json_field payoutDestination.maskedAccountNumber)
[[ -n "$DESTINATION_ID" && "$MASKED_ACCOUNT" != "1234567890123456" ]]

RAW_STORAGE=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT (account_number = '')::text || '|' || (octet_length(account_number_encrypted) > 0)::text FROM wlt_payout_destinations WHERE id = '$DESTINATION_ID';")
[[ "$RAW_STORAGE" = "true|true" ]]

CREATE_BODY=$(cat <<JSON
{
  "beneficiaryActorId": "$ACTOR_ID",
  "beneficiaryActorType": "captain",
  "payoutDestinationId": "$DESTINATION_ID",
  "amountMinorUnits": 2500,
  "currency": "YER",
  "idempotencyKey": "$REQUEST_KEY"
}
JSON
)
CREATED=$(api POST "/wlt/payout-requests" "$REQUEST_KEY" "$REQUEST_KEY" "$CREATE_BODY")
PAYOUT_ID=$(printf '%s' "$CREATED" | json_field payoutRequest.id)
[[ "$(printf '%s' "$CREATED" | json_field payoutRequest.status)" = "pending" ]]

REPLAY=$(api POST "/wlt/payout-requests" "$REQUEST_KEY-replay" "$REQUEST_KEY-replay" "$CREATE_BODY")
[[ "$(printf '%s' "$REPLAY" | json_field payoutRequest.id)" = "$PAYOUT_ID" ]]
[[ "$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT available_balance_minor_units || '|' || held_balance_minor_units FROM wlt_wallets WHERE actor_id = '$ACTOR_ID' AND actor_type = 'captain';")" = "7500|2500" ]]

CONFLICT_BODY=${CREATE_BODY/2500/2600}
CONFLICT_STATUS=$(curl --silent --show-error --output /tmp/jrn037-conflict.json --write-out '%{http_code}' \
  --request POST "$WLT_BASE_URL/wlt/payout-requests" \
  --header "Authorization: Bearer $WLT_SERVICE_TOKEN" \
  --header "X-Service-Caller: dsh" \
  --header "X-Correlation-ID: $REQUEST_KEY-conflict" \
  --header "Idempotency-Key: $REQUEST_KEY-conflict" \
  --header "Content-Type: application/json" \
  --data "$CONFLICT_BODY")
[[ "$CONFLICT_STATUS" = "409" ]]

echo '{"operatorId":"finance-maker-1"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/approve" "$REQUEST_KEY-approve" "$REQUEST_KEY-approve" "$(cat)" >/tmp/jrn037-approved.json
echo '{"operatorId":"finance-processor-2"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/process" "$REQUEST_KEY-process" "$REQUEST_KEY-process" "$(cat)" >/tmp/jrn037-processed.json
echo '{"operatorId":"finance-checker-3"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/complete" "$REQUEST_KEY-complete" "$REQUEST_KEY-complete" "$(cat)" >/tmp/jrn037-completed.json
[[ "$(cat /tmp/jrn037-completed.json | json_field payoutRequest.status)" = "completed" ]]

CROSS_BODY=$(cat <<JSON
{
  "beneficiaryActorId": "$OTHER_ACTOR_ID",
  "beneficiaryActorType": "captain",
  "payoutDestinationId": "$DESTINATION_ID",
  "amountMinorUnits": 100,
  "currency": "YER",
  "idempotencyKey": "cross-$REQUEST_KEY"
}
JSON
)
CROSS_STATUS=$(curl --silent --show-error --output /tmp/jrn037-cross.json --write-out '%{http_code}' \
  --request POST "$WLT_BASE_URL/wlt/payout-requests" \
  --header "Authorization: Bearer $WLT_SERVICE_TOKEN" \
  --header "X-Service-Caller: dsh" \
  --header "X-Correlation-ID: cross-$REQUEST_KEY" \
  --header "Idempotency-Key: cross-$REQUEST_KEY" \
  --header "Content-Type: application/json" \
  --data "$CROSS_BODY")
[[ "$CROSS_STATUS" = "403" ]]

UNKNOWN_BODY=$(cat <<JSON
{
  "beneficiaryActorId": "$ACTOR_ID",
  "beneficiaryActorType": "captain",
  "payoutDestinationId": "$DESTINATION_ID",
  "amountMinorUnits": 1700,
  "currency": "YER",
  "idempotencyKey": "$UNKNOWN_KEY"
}
JSON
)
UNKNOWN_CREATED=$(api POST "/wlt/payout-requests" "$UNKNOWN_KEY" "$UNKNOWN_KEY" "$UNKNOWN_BODY")
UNKNOWN_ID=$(printf '%s' "$UNKNOWN_CREATED" | json_field payoutRequest.id)
api POST "/wlt/payout-requests/$UNKNOWN_ID/approve" "$UNKNOWN_KEY-approve" "$UNKNOWN_KEY-approve" '{"operatorId":"finance-maker-4"}' >/dev/null
psql -v ON_ERROR_STOP=1 <<SQL
UPDATE wlt_payout_requests
SET status = 'provider_pending', processed_by_operator_id = 'finance-processor-5', operator_id = 'finance-processor-5'
WHERE id = '$UNKNOWN_ID' AND status = 'approved';
UPDATE wlt_payout_requests
SET status = 'provider_result_unknown', provider_status = 'unknown',
    failure_reason = 'runtime simulated ambiguous provider result', reconciliation_status = 'required'
WHERE id = '$UNKNOWN_ID' AND status = 'provider_pending';
SQL
RECONCILED=$(api POST "/wlt/payout-requests/$UNKNOWN_ID/reconcile" "$UNKNOWN_KEY-reconcile" "$UNKNOWN_KEY-reconcile" '{"operatorId":"finance-reconciler-6"}')
[[ "$(printf '%s' "$RECONCILED" | json_field payoutRequest.status)" = "processing" ]]
UNKNOWN_COMPLETED=$(api POST "/wlt/payout-requests/$UNKNOWN_ID/complete" "$UNKNOWN_KEY-complete" "$UNKNOWN_KEY-complete" '{"operatorId":"finance-checker-7"}')
[[ "$(printf '%s' "$UNKNOWN_COMPLETED" | json_field payoutRequest.status)" = "completed" ]]

WALLET_READBACK=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT available_balance_minor_units || '|' || held_balance_minor_units || '|' || paid_total_minor_units FROM wlt_wallets WHERE actor_id = '$ACTOR_ID' AND actor_type = 'captain';")
[[ "$WALLET_READBACK" = "5800|0|4200" ]]
JOURNAL_READBACK=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'),0) || '|' || COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'),0) || '|' || COUNT(*) FROM wlt_ledger_transactions t JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id WHERE t.transaction_type = 'payout_completed' AND t.reference_id IN ('$PAYOUT_ID','$UNKNOWN_ID');")
[[ "$JOURNAL_READBACK" = "4200|4200|4" ]]
AUDIT_COUNT=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT COUNT(*) FROM wlt_jrn037_payout_audit_events WHERE aggregate_id IN ('$PAYOUT_ID','$UNKNOWN_ID');")
(( AUDIT_COUNT >= 10 ))
OUTBOX_COUNT=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT COUNT(*) FROM wlt_jrn037_payout_outbox WHERE payout_request_id IN ('$PAYOUT_ID','$UNKNOWN_ID');")
(( OUTBOX_COUNT >= 8 ))
RECONCILIATION_COUNT=$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT COUNT(*) FROM wlt_jrn037_payout_reconciliations WHERE payout_request_id = '$UNKNOWN_ID' AND inquiry_status = 'succeeded' AND resolution_action = 'confirmed_success';")
[[ "$RECONCILIATION_COUNT" = "1" ]]

printf 'JRN-037 runtime smoke passed\n'
printf 'destination=%s\npayout=%s\nreconciled_payout=%s\nwallet=%s\njournal=%s\naudit_events=%s\noutbox_events=%s\n' \
  "$DESTINATION_ID" "$PAYOUT_ID" "$UNKNOWN_ID" "$WALLET_READBACK" "$JOURNAL_READBACK" "$AUDIT_COUNT" "$OUTBOX_COUNT"
