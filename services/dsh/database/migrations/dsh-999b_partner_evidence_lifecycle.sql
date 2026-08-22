-- U006: keep field-visit media separate from legal partner documents and
-- separate upload state from the server-owned review decision.

CREATE TABLE IF NOT EXISTS dsh_partner_document_taxonomy (
    document_type       TEXT PRIMARY KEY,
    document_family     TEXT NOT NULL DEFAULT 'legal'
                            CHECK (document_family = 'legal'),
    label_ar            TEXT NOT NULL,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    expires             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dsh_partner_document_taxonomy (document_type, label_ar, expires)
VALUES
    ('national_id', 'الهوية الوطنية', FALSE),
    ('commercial_register', 'السجل التجاري', TRUE),
    ('freelancer_certificate', 'وثيقة العمل الحر', TRUE),
    ('lease_agreement', 'عقد الإيجار أو الملكية', TRUE),
    ('health_certificate', 'الشهادة الصحية أو الترخيص', TRUE)
ON CONFLICT (document_type) DO UPDATE SET
    label_ar = EXCLUDED.label_ar,
    expires = EXCLUDED.expires,
    updated_at = NOW();

ALTER TABLE dsh_partner_documents DROP CONSTRAINT IF EXISTS dsh_partner_documents_document_type_check;
ALTER TABLE dsh_partner_documents ADD CONSTRAINT dsh_partner_documents_document_type_check
    CHECK (document_type IN (
        'national_id', 'commercial_register', 'freelancer_certificate',
        'lease_agreement', 'health_certificate', 'store_photo', 'owner_photo', 'other'
    ));

ALTER TABLE dsh_partner_documents
    ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'uploaded',
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS reviewed_by_actor_id TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_review_reason TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS supersedes_document_id TEXT REFERENCES dsh_partner_documents(id) ON DELETE SET NULL;

ALTER TABLE dsh_partner_documents DROP CONSTRAINT IF EXISTS dsh_partner_documents_upload_status_check;
ALTER TABLE dsh_partner_documents ADD CONSTRAINT dsh_partner_documents_upload_status_check
    CHECK (upload_status IN ('uploaded'));

ALTER TABLE dsh_partner_documents DROP CONSTRAINT IF EXISTS dsh_partner_documents_review_status_check;
ALTER TABLE dsh_partner_documents ADD CONSTRAINT dsh_partner_documents_review_status_check
    CHECK (review_status IN ('pending', 'under_review', 'verified', 'rejected', 'reupload_required'));

UPDATE dsh_partner_documents
SET review_status = CASE document_status
        WHEN 'approved' THEN 'verified'
        WHEN 'under_review' THEN 'under_review'
        WHEN 'rejected' THEN 'rejected'
        ELSE 'pending'
    END
WHERE review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_partner_documents_latest_type
    ON dsh_partner_documents(partner_id, document_type, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_partner_field_visit_media (
    id                  TEXT PRIMARY KEY DEFAULT 'pfvm_' || replace(gen_random_uuid()::text, '-', ''),
    partner_id          TEXT NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    visit_id            TEXT NOT NULL REFERENCES dsh_partner_field_visits(id) ON DELETE CASCADE,
    store_id            TEXT REFERENCES dsh_stores(id) ON DELETE SET NULL,
    media_ref           TEXT NOT NULL REFERENCES dsh_media_refs(media_ref) ON DELETE RESTRICT,
    source              TEXT NOT NULL DEFAULT 'field_capture'
                            CHECK (source IN ('field_capture', 'field_library')),
    captured_by_actor_id TEXT NOT NULL,
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context             TEXT NOT NULL DEFAULT 'storefront',
    status              TEXT NOT NULL DEFAULT 'uploaded'
                            CHECK (status IN ('uploaded', 'replaced', 'deleted')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (visit_id, media_ref)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visit_media_visit
    ON dsh_partner_field_visit_media(visit_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visit_media_partner
    ON dsh_partner_field_visit_media(partner_id, created_at DESC);

INSERT INTO dsh_partner_field_visit_media
    (partner_id, visit_id, store_id, media_ref, captured_by_actor_id, context)
SELECT v.partner_id, v.id, v.store_id, refs.media_ref, v.field_actor_id, 'legacy_visit_evidence'
FROM dsh_partner_field_visits v
CROSS JOIN LATERAL unnest(v.evidence_media_refs) AS refs(media_ref)
JOIN dsh_media_refs m ON m.media_ref = refs.media_ref
WHERE m.purpose = 'field_readiness_evidence'
ON CONFLICT (visit_id, media_ref) DO NOTHING;

COMMENT ON COLUMN dsh_partner_documents.document_status IS
    'Deprecated compatibility projection. Use upload_status and review_status for new reads.';
COMMENT ON COLUMN dsh_partner_field_visits.evidence_media_refs IS
    'Deprecated compatibility projection. dsh_partner_field_visit_media is canonical.';
