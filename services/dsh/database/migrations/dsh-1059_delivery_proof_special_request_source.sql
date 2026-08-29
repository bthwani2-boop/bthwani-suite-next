-- : extend the canonical Captain delivery-proof source to special requests.
-- A proof belongs to exactly one dispatch source: order or special request.

BEGIN;

ALTER TABLE dsh_media_refs
    ADD COLUMN IF NOT EXISTS special_request_id UUID REFERENCES dsh_special_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_media_refs_special_request_id
    ON dsh_media_refs(special_request_id)
    WHERE special_request_id IS NOT NULL;

ALTER TABLE dsh_delivery_proofs
    ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE dsh_delivery_proofs
    ADD COLUMN IF NOT EXISTS special_request_id UUID REFERENCES dsh_special_requests(id) ON DELETE CASCADE;

ALTER TABLE dsh_delivery_proofs DROP CONSTRAINT IF EXISTS chk_delivery_proof_source;
ALTER TABLE dsh_delivery_proofs ADD CONSTRAINT chk_delivery_proof_source CHECK (
    (order_id IS NOT NULL) <> (special_request_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_proofs_special_request
    ON dsh_delivery_proofs(special_request_id, created_at DESC)
    WHERE special_request_id IS NOT NULL;

COMMIT;
