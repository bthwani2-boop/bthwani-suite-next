-- DSH-1019: remove the obsolete partner_deactivated runtime state.
-- Existing rows were migrated to partner_terminated by DSH-134. Historical
-- activation events remain immutable audit records and are not runtime state.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM dsh_partners WHERE activation_status = 'partner_deactivated'
  ) THEN
    RAISE EXCEPTION 'cannot remove partner_deactivated: current partner rows still require reconciliation';
  END IF;
END
$$;

ALTER TABLE dsh_partners
  DROP CONSTRAINT IF EXISTS dsh_partners_activation_status_check;

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
    'partner_suspended',
    'partner_terminated',
    'client_visible',
    'client_hidden'
  ));

CREATE OR REPLACE FUNCTION dsh_enqueue_partner_wlt_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.to_status = 'partner_terminated' THEN
    INSERT INTO dsh_partner_wlt_outbox (
      partner_id, activation_event_id, event_type, actor_id,
      correlation_id, idempotency_key
    ) VALUES (
      NEW.partner_id, NEW.id, 'deactivate_payout_destination', NEW.actor_id,
      COALESCE(NULLIF(NEW.correlation_id,''), 'partner-termination-' || NEW.id),
      'partner-payout-deactivate-' || NEW.id
    )
    ON CONFLICT (event_type, activation_event_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
