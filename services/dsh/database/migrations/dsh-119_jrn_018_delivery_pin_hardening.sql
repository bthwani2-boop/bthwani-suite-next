-- JRN-018 hardening: bcrypt PIN hashes, invalidation of legacy fast hashes,
-- and one open manual-review proof per assignment.

ALTER TABLE dsh_delivery_verification_challenges
    DROP CONSTRAINT IF EXISTS dsh_delivery_verification_challenges_pin_hash_check;

ALTER TABLE dsh_delivery_verification_challenges
    ADD CONSTRAINT dsh_delivery_verification_challenges_pin_hash_check
    CHECK (length(pin_hash) BETWEEN 59 AND 72 AND pin_hash LIKE '$2%');

-- Any challenge issued by an earlier code revision used a fast deterministic
-- hash. Expire it instead of attempting an unsafe compatibility fallback.
UPDATE dsh_delivery_verification_challenges
SET pin_expires_at = LEAST(pin_expires_at, NOW()),
    updated_at = NOW(),
    version = version + 1
WHERE pin_hash NOT LIKE '$2%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_delivery_proofs_one_open_assignment
    ON dsh_delivery_proofs(assignment_id)
    WHERE status IN ('submitted', 'pending_review');
