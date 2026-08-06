-- : governed exceptions policy actions and proofs

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS proof_media_ref TEXT,
    ADD COLUMN IF NOT EXISTS policy_next_action TEXT NOT NULL DEFAULT 'review';

ALTER TABLE dsh_delivery_exceptions DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_policy_next_action_check;
ALTER TABLE dsh_delivery_exceptions ADD CONSTRAINT dsh_delivery_exceptions_policy_next_action_check
    CHECK (policy_next_action IN ('retry', 'wait', 'return', 'rescue', 'review'));

ALTER TABLE dsh_delivery_exceptions DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_proof_requirement_check;
ALTER TABLE dsh_delivery_exceptions ADD CONSTRAINT dsh_delivery_exceptions_proof_requirement_check
    CHECK (
        (reason_code NOT IN ('damaged_order', 'vehicle_breakdown', 'accident', 'unsafe_location')) 
        OR (proof_media_ref IS NOT NULL AND proof_media_ref != '')
    );
