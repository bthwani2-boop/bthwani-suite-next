-- : governed proof of delivery recipient mapping.

ALTER TABLE dsh_delivery_proofs
    ADD COLUMN IF NOT EXISTS recipient_relationship TEXT NOT NULL DEFAULT 'customer',
    ADD COLUMN IF NOT EXISTS recipient_name TEXT;

ALTER TABLE dsh_delivery_proofs DROP CONSTRAINT IF EXISTS dsh_delivery_proofs_recipient_relationship_check;
ALTER TABLE dsh_delivery_proofs ADD CONSTRAINT dsh_delivery_proofs_recipient_relationship_check
    CHECK (recipient_relationship IN ('customer', 'reception', 'neighbor', 'family_member', 'other'));

ALTER TABLE dsh_delivery_proofs DROP CONSTRAINT IF EXISTS dsh_delivery_proofs_recipient_name_check;
ALTER TABLE dsh_delivery_proofs ADD CONSTRAINT dsh_delivery_proofs_recipient_name_check
    CHECK (recipient_relationship = 'customer' OR (recipient_name IS NOT NULL AND length(trim(recipient_name)) > 0));
