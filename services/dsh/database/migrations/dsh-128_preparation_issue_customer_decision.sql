-- DSH-128: customer decision lifecycle for substitution preparation issues.
-- The decision records operational consent only. Price, refund, capture, wallet,
-- ledger, and settlement truth remain owned by WLT.

BEGIN;

ALTER TABLE dsh_order_preparation_issues
    ADD COLUMN IF NOT EXISTS customer_decision TEXT NOT NULL DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS customer_decided_by_actor_id TEXT,
    ADD COLUMN IF NOT EXISTS customer_decision_note TEXT,
    ADD COLUMN IF NOT EXISTS customer_decided_at TIMESTAMPTZ;

UPDATE dsh_order_preparation_issues
SET customer_decision = 'pending'
WHERE issue_kind = 'substitution_required'
  AND customer_decision = 'not_required';

ALTER TABLE dsh_order_preparation_issues
    DROP CONSTRAINT IF EXISTS dsh_order_preparation_issues_customer_decision_check,
    DROP CONSTRAINT IF EXISTS dsh_order_preparation_issues_customer_decision_shape_check;

ALTER TABLE dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_customer_decision_check CHECK (
        (issue_kind = 'substitution_required' AND customer_decision IN ('pending', 'approved', 'rejected'))
        OR
        (issue_kind <> 'substitution_required' AND customer_decision = 'not_required')
    ),
    ADD CONSTRAINT dsh_order_preparation_issues_customer_decision_shape_check CHECK (
        (customer_decision IN ('not_required', 'pending')
            AND customer_decided_by_actor_id IS NULL
            AND customer_decision_note IS NULL
            AND customer_decided_at IS NULL)
        OR
        (customer_decision IN ('approved', 'rejected')
            AND customer_decided_by_actor_id IS NOT NULL
            AND length(btrim(COALESCE(customer_decision_note, ''))) <= 500
            AND customer_decided_at IS NOT NULL)
    );

ALTER TABLE dsh_order_preparation_issue_events
    DROP CONSTRAINT IF EXISTS dsh_order_preparation_issue_events_event_type_check;

ALTER TABLE dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_event_type_check CHECK (
        event_type IN ('opened', 'customer_decision', 'resolved')
    );

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_issues_customer_decision
    ON dsh_order_preparation_issues (order_id, customer_decision, updated_at DESC)
    WHERE issue_kind = 'substitution_required' AND status = 'open';

COMMIT;
