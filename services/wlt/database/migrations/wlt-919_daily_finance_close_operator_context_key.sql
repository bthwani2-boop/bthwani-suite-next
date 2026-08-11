-- WLT-916: Key the daily finance close by operator context as well as date.
--
-- wlt_daily_finance_close had a primary key on business_date alone, so the
-- first operator context to close a business date permanently prevented every
-- other operator context from closing that same date. The application-level
-- duplicate check already scoped itself correctly
-- (WHERE business_date = $1 AND operator_context_id = $2), so the mismatch
-- surfaced as a raw unique-violation instead of the governed
-- "business date is already closed" response.
--
-- Financial close is per operator context: each context has its own ledger
-- accounts, payouts and settlement batches.

BEGIN;

ALTER TABLE wlt_daily_finance_close
    DROP CONSTRAINT IF EXISTS wlt_daily_finance_close_pkey;

ALTER TABLE wlt_daily_finance_close
    ADD CONSTRAINT wlt_daily_finance_close_pkey
    PRIMARY KEY (operator_context_id, business_date);

COMMIT;
