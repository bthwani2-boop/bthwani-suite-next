-- DSH-134: Partner Suspension and Termination Support
-- Extends the activation_status enum to explicitly support `partner_suspended`
-- and `partner_terminated` as opposed to the legacy `partner_deactivated`.

ALTER TABLE dsh_partners
    DROP CONSTRAINT dsh_partners_activation_status_check;

ALTER TABLE dsh_partners
    ADD CONSTRAINT dsh_partners_activation_status_check
    CHECK (activation_status IN (
        'draft',
        'submitted',
        'field_visit_scheduled',
        'field_visit_completed',
        'documents_missing',
        'documents_uploaded',
        'documents_verified',
        'catalog_not_ready',
        'catalog_ready',
        'delivery_modes_not_ready',
        'delivery_modes_ready',
        'ops_review',
        'ops_approved',
        'ops_rejected',
        'partner_active',
        'partner_deactivated',
        'partner_suspended',
        'partner_terminated',
        'client_visible',
        'client_hidden'
    ));

-- Migrate existing partner_deactivated to partner_terminated to align with J021 default behavior.
UPDATE dsh_partners
SET activation_status = 'partner_terminated'
WHERE activation_status = 'partner_deactivated';

-- Do the same for activation events historical records if needed (we'll leave them as is since they are an audit log).
