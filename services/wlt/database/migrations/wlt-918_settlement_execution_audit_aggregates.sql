-- WLT-915: Allow the settlement-execution audit trail to be written.
--
-- wlt_finance_audit_events.aggregate_type only permitted the settlement and
-- commission aggregates. Every settlement-execution write therefore violated
-- the check constraint and rolled back its whole transaction:
--
--   settlement/manual_batch.go   -> 'settlement_batch' (batch_created, batch_frozen)
--   settlement/daily_close.go    -> 'daily_close'      (finance_day_closed)
--
-- Those code paths could never commit, which is why creating a settlement
-- batch, freezing it and closing a business date were all unreachable. The
-- audit trail is append-only governed evidence, so the fix is to admit the
-- aggregates the finance journey actually produces rather than to stop
-- auditing them.

BEGIN;

ALTER TABLE wlt_finance_audit_events
    DROP CONSTRAINT IF EXISTS wlt_audit_events_aggregate_type_check;

ALTER TABLE wlt_finance_audit_events
    ADD CONSTRAINT wlt_audit_events_aggregate_type_check CHECK (
        aggregate_type = ANY (ARRAY[
            'settlement_policy',
            'settlement',
            'settlement_batch',
            'manual_transfer_evidence',
            'daily_close',
            'commission_policy',
            'commission',
            'commission_adjustment'
        ])
    );

COMMIT;
