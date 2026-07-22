-- DSH-101: durable JRN-001 handoff and reconciliation with WLT.
-- No raw account, IBAN, or payout mobile value is stored here. The outbox
-- contains only partner/event identity; reconciliation stores WLT references
-- and masked values safe for operational readback.

CREATE TABLE IF NOT EXISTS dsh_partner_wlt_outbox (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          text NOT NULL REFERENCES dsh_partners(id) ON DELETE RESTRICT,
  activation_event_id text NOT NULL REFERENCES dsh_partner_activation_events(id) ON DELETE RESTRICT,
  event_type          text NOT NULL CHECK (event_type IN ('deactivate_payout_destination')),
  actor_id            text NOT NULL,
  correlation_id      text NOT NULL,
  idempotency_key     text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','processing','retry','delivered','dead_letter')),
  attempt_count       integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error          text NOT NULL DEFAULT '',
  available_at        timestamptz NOT NULL DEFAULT now(),
  delivered_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, activation_event_id),
  UNIQUE (partner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS dsh_partner_wlt_outbox_pending_idx
  ON dsh_partner_wlt_outbox(available_at, created_at)
  WHERE status IN ('pending','retry');

CREATE TABLE IF NOT EXISTS dsh_partner_wlt_reconciliation_cases (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id               text NOT NULL REFERENCES dsh_partners(id) ON DELETE RESTRICT,
  issue_type               text NOT NULL CHECK (issue_type IN (
                             'dsh_reference_missing',
                             'wlt_destination_missing',
                             'reference_mismatch',
                             'masked_readback_mismatch'
                           )),
  dsh_payout_destination_id text NOT NULL DEFAULT '',
  wlt_payout_destination_id text NOT NULL DEFAULT '',
  wlt_masked_account_number text NOT NULL DEFAULT '',
  wlt_masked_iban           text NOT NULL DEFAULT '',
  wlt_masked_mobile_number  text NOT NULL DEFAULT '',
  status                   text NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','resolved','ignored')),
  first_detected_at        timestamptz NOT NULL DEFAULT now(),
  last_detected_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at              timestamptz,
  resolution_note          text NOT NULL DEFAULT '',
  UNIQUE (partner_id, issue_type)
);

CREATE INDEX IF NOT EXISTS dsh_partner_wlt_reconciliation_open_idx
  ON dsh_partner_wlt_reconciliation_cases(last_detected_at DESC)
  WHERE status = 'open';

CREATE OR REPLACE FUNCTION dsh_enqueue_partner_wlt_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.to_status = 'partner_deactivated' THEN
    INSERT INTO dsh_partner_wlt_outbox (
      partner_id,
      activation_event_id,
      event_type,
      actor_id,
      correlation_id,
      idempotency_key
    ) VALUES (
      NEW.partner_id,
      NEW.id,
      'deactivate_payout_destination',
      NEW.actor_id,
      COALESCE(NULLIF(NEW.correlation_id,''), 'partner-deactivation-' || NEW.id),
      'partner-payout-deactivate-' || NEW.id
    )
    ON CONFLICT (event_type, activation_event_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dsh_partner_activation_wlt_outbox_trigger
  ON dsh_partner_activation_events;
CREATE TRIGGER dsh_partner_activation_wlt_outbox_trigger
AFTER INSERT ON dsh_partner_activation_events
FOR EACH ROW
EXECUTE FUNCTION dsh_enqueue_partner_wlt_deactivation();
