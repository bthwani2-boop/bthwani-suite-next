-- DSH-1058: make proposal duplicate-candidate identity enforceable.
--
-- Proposal transitions use (proposal_id, candidate_master_product_id) as the
-- durable duplicate-candidate identity. Remove any legacy duplicates before
-- installing the database constraint that the transition source relies on.
BEGIN;

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY proposal_id, candidate_master_product_id
            ORDER BY created_at ASC, id ASC
        ) AS duplicate_rank
    FROM dsh_product_duplicate_candidates
    WHERE proposal_id IS NOT NULL
      AND candidate_master_product_id IS NOT NULL
)
DELETE FROM dsh_product_duplicate_candidates candidate
USING ranked
WHERE candidate.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_product_duplicate_candidates_identity
    ON dsh_product_duplicate_candidates (proposal_id, candidate_master_product_id);

COMMIT;
