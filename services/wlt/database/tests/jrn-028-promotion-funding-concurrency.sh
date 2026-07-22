#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=wlt_jrn_028}"
: "${PGPASSWORD:=postgres}"
export PGPASSWORD

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE")

fail() {
  printf 'JRN-028 concurrency proof failed: %s\n' "$1" >&2
  exit 1
}

"${PSQL[@]}" <<'SQL'
INSERT INTO wlt_promotion_funding_reservations (
  tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
  coupon_id,client_id,platform_funded_minor_units,
  partner_funded_minor_units,total_discount_minor_units,currency,
  status,idempotency_key,correlation_id
) VALUES (
  'jrn-028-concurrency','proof:race','checkout-race','redemption-race',
  'coupon-race','client-race',1000,0,1000,'YER',
  'reserved','proof-reserve-race','proof-correlation-race'
);
SQL

commit_log="$(mktemp)"
competing_log="$(mktemp)"
trap 'rm -f "$commit_log" "$competing_log"' EXIT

# Transaction A acquires the row first and holds it long enough for transaction B
# to compete for the same reserved state.
(
  "${PSQL[@]}" >"$commit_log" 2>&1 <<'SQL'
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
UPDATE wlt_promotion_funding_reservations
   SET status='committed',order_id='order-race',committed_at=NOW(),updated_at=NOW()
 WHERE tenant_id='jrn-028-concurrency'
   AND external_reference='proof:race'
   AND status='reserved';
SELECT pg_sleep(2);
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'committed','reserved','committed','order-race',
       'proof-event-race-commit','proof-correlation-race',''
  FROM wlt_promotion_funding_reservations
 WHERE tenant_id='jrn-028-concurrency'
   AND external_reference='proof:race'
   AND status='committed';
COMMIT;
SQL
) &
commit_pid=$!

sleep 0.5

# Transaction B may either serialize after A and update zero rows, or PostgreSQL
# may reject its stale serializable snapshot. Both outcomes are acceptable; a
# second financial transition or event is not.
if ! "${PSQL[@]}" >"$competing_log" 2>&1 <<'SQL'
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
WITH updated AS (
  UPDATE wlt_promotion_funding_reservations
     SET status='released',released_at=NOW(),release_reason='competing_release',updated_at=NOW()
   WHERE tenant_id='jrn-028-concurrency'
     AND external_reference='proof:race'
     AND status='reserved'
   RETURNING id
)
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'released','reserved','released',NULL,
       'proof-event-race-release','proof-correlation-race','competing_release'
  FROM updated;
COMMIT;
SQL
then
  grep -Eqi 'could not serialize access|serialization failure' "$competing_log" || {
    cat "$competing_log" >&2
    fail "competing transaction failed for an unexpected reason"
  }
fi

if ! wait "$commit_pid"; then
  cat "$commit_log" >&2
  fail "winning committed transaction failed"
fi

status="$("${PSQL[@]}" -Atc "SELECT status FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-concurrency' AND external_reference='proof:race'")"
[[ "$status" == "committed" ]] || fail "concurrent transitions did not preserve the first governed state"

event_count="$("${PSQL[@]}" -Atc "SELECT count(*) FROM wlt_promotion_funding_events e JOIN wlt_promotion_funding_reservations r ON r.id=e.reservation_id WHERE r.tenant_id='jrn-028-concurrency' AND r.external_reference='proof:race' AND e.to_status IN ('committed','released')")"
[[ "$event_count" == "1" ]] || fail "concurrent transitions produced more than one financial event"

printf 'JRN-028 concurrent transition serialization proof passed.\n'
