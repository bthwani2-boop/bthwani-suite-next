-- WLT-914: Manual settlement execution and independent verification.
--
-- Before this migration the payout state machine had no reachable terminal
-- state: provider submission was disabled unconditionally, and completion
-- required status='processing' which no writer produced. Approved payouts
-- stayed approved forever with their funds held. Manual transfer evidence was
-- written as a leaf record that never advanced the payout, and it stamped
-- verified_by_operator_id at submission time, which made the daily-close
-- "unverified evidence" gate structurally unable to fire.
--
-- This migration introduces the executed -> verified -> completed states and
-- separates the executor from the independent verifier.

BEGIN;

-- 1. Payout request execution/verification facts ----------------------------

ALTER TABLE wlt_payout_requests
    ADD COLUMN IF NOT EXISTS executed_at timestamptz,
    ADD COLUMN IF NOT EXISTS executed_by_operator_id text,
    ADD COLUMN IF NOT EXISTS verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS verified_by_operator_id text;

ALTER TABLE wlt_payout_requests
    DROP CONSTRAINT IF EXISTS wlt_payout_requests_status_chk;

-- 'provider_pending', 'processing' and 'provider_result_unknown' are retained
-- for historical rows only. No current writer produces them; the current
-- production Cash-Out model is governed manual external settlement.
ALTER TABLE wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_status_chk CHECK (
        status IN (
            'pending',
            'approved',
            'rejected',
            'executed',
            'verified',
            'completed',
            'failed',
            'provider_pending',
            'processing',
            'provider_result_unknown'
        )
    );

-- Separation of duties is a stored invariant, not only an application check.
ALTER TABLE wlt_payout_requests
    DROP CONSTRAINT IF EXISTS wlt_payout_requests_execution_sod_chk;

ALTER TABLE wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_execution_sod_chk CHECK (
        verified_by_operator_id IS NULL
        OR (
            verified_by_operator_id <> COALESCE(executed_by_operator_id, '')
            AND verified_by_operator_id <> COALESCE(approved_by_operator_id, '')
        )
    );

COMMENT ON COLUMN wlt_payout_requests.executed_at IS
    'When the external official-wallet transfer was recorded by the executor.';
COMMENT ON COLUMN wlt_payout_requests.verified_by_operator_id IS
    'Independent verifier of the external transfer; must differ from the executor and the approver.';

-- 2. Manual transfer evidence: execution and verification are distinct -------

ALTER TABLE wlt_manual_transfer_evidence
    ADD COLUMN IF NOT EXISTS operator_context_id text,
    ADD COLUMN IF NOT EXISTS executed_by_operator_id text,
    ADD COLUMN IF NOT EXISTS executed_at timestamptz,
    ADD COLUMN IF NOT EXISTS verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS evidence_reference text;

-- Backfill historical rows. Pre-migration rows recorded the submitter in
-- verified_by_operator_id; that operator was the executor, so move the value
-- and leave verification genuinely outstanding.
UPDATE wlt_manual_transfer_evidence e
SET operator_context_id = b.operator_context_id
FROM wlt_settlement_batches b
WHERE b.id = e.batch_id
  AND e.operator_context_id IS NULL;

UPDATE wlt_manual_transfer_evidence
SET executed_by_operator_id = verified_by_operator_id,
    executed_at = created_at
WHERE executed_by_operator_id IS NULL;

UPDATE wlt_manual_transfer_evidence
SET verified_by_operator_id = NULL
WHERE verified_at IS NULL;

ALTER TABLE wlt_manual_transfer_evidence
    ALTER COLUMN verified_by_operator_id DROP NOT NULL;

ALTER TABLE wlt_manual_transfer_evidence
    ALTER COLUMN operator_context_id SET NOT NULL,
    ALTER COLUMN executed_by_operator_id SET NOT NULL,
    ALTER COLUMN executed_at SET NOT NULL;

ALTER TABLE wlt_manual_transfer_evidence
    ALTER COLUMN executed_at SET DEFAULT now();

ALTER TABLE wlt_manual_transfer_evidence
    DROP CONSTRAINT IF EXISTS wlt_manual_transfer_evidence_verification_chk;

ALTER TABLE wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_verification_chk CHECK (
        (verified_by_operator_id IS NULL AND verified_at IS NULL)
        OR (
            verified_by_operator_id IS NOT NULL
            AND verified_at IS NOT NULL
            AND verified_by_operator_id <> executed_by_operator_id
        )
    );

CREATE INDEX IF NOT EXISTS wlt_manual_transfer_evidence_unverified_idx
    ON wlt_manual_transfer_evidence (operator_context_id)
    WHERE verified_at IS NULL;

COMMENT ON TABLE wlt_manual_transfer_evidence IS
    'External official-wallet transfer execution evidence. Execution and independent verification are separate governed acts.';

-- 3. Settlement batch execution lifecycle ------------------------------------

ALTER TABLE wlt_settlement_batches
    DROP CONSTRAINT IF EXISTS wlt_settlement_batches_status_check;

ALTER TABLE wlt_settlement_batches
    ADD CONSTRAINT wlt_settlement_batches_status_check CHECK (
        status IN ('open', 'frozen', 'execution_in_progress', 'awaiting_verification', 'cancelled', 'completed')
    );

COMMIT;
