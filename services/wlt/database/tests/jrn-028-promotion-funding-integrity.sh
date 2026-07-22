#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=wlt_jrn_028}"
: "${PGPASSWORD:=postgres}"
export PGPASSWORD

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE")

fail() {
  printf 'JRN-028 database proof failed: %s\n' "$1" >&2
  exit 1
}

scalar() {
  "${PSQL[@]}" -Atc "$1"
}

# Audited commit: a governed partner-funded split commits only with its matching
# append-only event in the same PostgreSQL transaction.
"${PSQL[@]}" <<'SQL'
INSERT INTO wlt_promotion_funding_reservations (
  tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
  coupon_id,client_id,partner_id,platform_funded_minor_units,
  partner_funded_minor_units,total_discount_minor_units,currency,
  status,idempotency_key,correlation_id
) VALUES (
  'jrn-028-proof','proof:commit','checkout-commit','redemption-commit',
  'coupon-proof','client-proof','partner-proof',600,400,1000,'YER',
  'reserved','proof-reserve-commit','proof-correlation-commit'
);
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='committed',order_id='order-proof',committed_at=NOW(),updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit';
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'committed','reserved','committed','order-proof',
       'proof-event-commit','proof-correlation-commit',''
  FROM wlt_promotion_funding_reservations
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit';
COMMIT;
SQL

[[ "$(scalar "SELECT status FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit'")" == "committed" ]] || fail "audited commit did not persist"
[[ "$(scalar "SELECT count(*) FROM wlt_promotion_funding_events e JOIN wlt_promotion_funding_reservations r ON r.id=e.reservation_id WHERE r.tenant_id='jrn-028-proof' AND r.external_reference='proof:commit' AND e.event_type='committed'")" == "1" ]] || fail "audited commit event missing"

# Audited release from reserved.
"${PSQL[@]}" <<'SQL'
INSERT INTO wlt_promotion_funding_reservations (
  tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
  coupon_id,client_id,platform_funded_minor_units,
  partner_funded_minor_units,total_discount_minor_units,currency,
  status,idempotency_key,correlation_id
) VALUES (
  'jrn-028-proof','proof:release','checkout-release','redemption-release',
  'coupon-proof','client-proof',1000,0,1000,'YER',
  'reserved','proof-reserve-release','proof-correlation-release'
);
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='released',released_at=NOW(),release_reason='checkout_cancelled',updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:release';
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'released','reserved','released',NULL,
       'proof-event-release','proof-correlation-release','checkout_cancelled'
  FROM wlt_promotion_funding_reservations
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:release';
COMMIT;
SQL

[[ "$(scalar "SELECT status || ':' || release_reason FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:release'")" == "released:checkout_cancelled" ]] || fail "audited release did not persist"

# Audited reverse from committed, tied to the original order and a governed reason.
"${PSQL[@]}" <<'SQL'
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='reversed',reversed_at=NOW(),reversal_reason='refund_approved',updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit';
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'reversed','committed','reversed','order-proof',
       'proof-event-reverse','proof-correlation-reverse','refund_approved'
  FROM wlt_promotion_funding_reservations
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit';
COMMIT;
SQL

[[ "$(scalar "SELECT status || ':' || reversal_reason FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit'")" == "reversed:refund_approved" ]] || fail "audited reverse did not persist"

# An unaudited transition must fail at the deferred constraint and roll back.
"${PSQL[@]}" <<'SQL'
INSERT INTO wlt_promotion_funding_reservations (
  tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
  coupon_id,client_id,platform_funded_minor_units,
  partner_funded_minor_units,total_discount_minor_units,currency,
  status,idempotency_key,correlation_id
) VALUES (
  'jrn-028-proof','proof:unaudited','checkout-unaudited','redemption-unaudited',
  'coupon-proof','client-proof',1000,0,1000,'YER',
  'reserved','proof-reserve-unaudited','proof-correlation-unaudited'
);
SQL

if "${PSQL[@]}" <<'SQL'
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='committed',order_id='order-unaudited',committed_at=NOW(),updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:unaudited';
COMMIT;
SQL
then
  fail "unaudited transition was accepted"
fi
[[ "$(scalar "SELECT status FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:unaudited'")" == "reserved" ]] || fail "unaudited transition was not rolled back"

# A stale event created in an earlier transaction cannot authorize a later update.
"${PSQL[@]}" <<'SQL'
INSERT INTO wlt_promotion_funding_reservations (
  tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
  coupon_id,client_id,platform_funded_minor_units,
  partner_funded_minor_units,total_discount_minor_units,currency,
  status,idempotency_key,correlation_id
) VALUES (
  'jrn-028-proof','proof:stale','checkout-stale','redemption-stale',
  'coupon-proof','client-proof',1000,0,1000,'YER',
  'reserved','proof-reserve-stale','proof-correlation-stale'
);
INSERT INTO wlt_promotion_funding_events (
  reservation_id,event_type,from_status,to_status,order_id,
  idempotency_key,correlation_id,reason
)
SELECT id,'committed','reserved','committed','order-stale',
       'proof-event-stale','proof-correlation-stale',''
  FROM wlt_promotion_funding_reservations
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:stale';
SQL

if "${PSQL[@]}" <<'SQL'
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='committed',order_id='order-stale',committed_at=NOW(),updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:stale';
COMMIT;
SQL
then
  fail "stale event authorized a later transition"
fi
[[ "$(scalar "SELECT status FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:stale'")" == "reserved" ]] || fail "stale-event transition was not rolled back"

# Monetary split cannot exceed or differ from the governed total.
if "${PSQL[@]}" -c "INSERT INTO wlt_promotion_funding_reservations (tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,coupon_id,client_id,partner_id,platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,currency,status,idempotency_key,correlation_id) VALUES ('jrn-028-proof','proof:split-mismatch','checkout-split','redemption-split','coupon-proof','client-proof','partner-proof',700,400,1000,'YER','reserved','proof-reserve-split','proof-correlation-split')"; then
  fail "split mismatch was accepted"
fi

# Partner-funded money always requires the governed partner identity.
if "${PSQL[@]}" -c "INSERT INTO wlt_promotion_funding_reservations (tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,coupon_id,client_id,platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,currency,status,idempotency_key,correlation_id) VALUES ('jrn-028-proof','proof:missing-partner','checkout-missing-partner','redemption-missing-partner','coupon-proof','client-proof',600,400,1000,'YER','reserved','proof-reserve-missing-partner','proof-correlation-missing-partner')"; then
  fail "partner-funded reservation without partner identity was accepted"
fi

# Tenant-scoped idempotency keys cannot be replayed with a different financial identity.
"${PSQL[@]}" -c "INSERT INTO wlt_promotion_funding_reservations (tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,coupon_id,client_id,platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,currency,status,idempotency_key,correlation_id) VALUES ('jrn-028-proof','proof:idempotency-a','checkout-idempotency-a','redemption-idempotency-a','coupon-proof','client-proof',1000,0,1000,'YER','reserved','proof-shared-idempotency','proof-correlation-idempotency-a')"
if "${PSQL[@]}" -c "INSERT INTO wlt_promotion_funding_reservations (tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,coupon_id,client_id,platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,currency,status,idempotency_key,correlation_id) VALUES ('jrn-028-proof','proof:idempotency-b','checkout-idempotency-b','redemption-idempotency-b','coupon-proof','client-proof',900,0,900,'YER','reserved','proof-shared-idempotency','proof-correlation-idempotency-b')"; then
  fail "conflicting idempotency replay was accepted"
fi

# Terminal financial states remain immutable.
if "${PSQL[@]}" <<'SQL'
BEGIN;
UPDATE wlt_promotion_funding_reservations
   SET status='released',released_at=NOW(),release_reason='illegal_terminal_change',updated_at=NOW()
 WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit';
COMMIT;
SQL
then
  fail "terminal reversed reservation transitioned again"
fi
[[ "$(scalar "SELECT status FROM wlt_promotion_funding_reservations WHERE tenant_id='jrn-028-proof' AND external_reference='proof:commit'")" == "reversed" ]] || fail "terminal state changed after rejected transition"

printf 'JRN-028 PostgreSQL lifecycle and negative-invariant proof passed.\n'
