-- JRN-011 / FS-15: redacted operational audit used by diagnostics and alerts.
BEGIN;

CREATE TABLE IF NOT EXISTS dsh_order_truth_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT 'system',
  order_id UUID REFERENCES dsh_orders(id) ON DELETE SET NULL,
  checkout_intent_id UUID REFERENCES dsh_checkout_intents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  result_code TEXT NOT NULL,
  correlation_id TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_type IN (
    'order.create_succeeded',
    'order.create_replayed',
    'order.create_conflict',
    'order.idempotency_conflict',
    'order.snapshot_write_blocked',
    'order.read_denied',
    'order.outbox_dead_letter'
  ))
);

CREATE INDEX IF NOT EXISTS idx_dsh_order_truth_audit_tenant_created
  ON dsh_order_truth_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_order_truth_audit_tenant_type_created
  ON dsh_order_truth_audit(tenant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_order_truth_audit_correlation
  ON dsh_order_truth_audit(tenant_id, correlation_id)
  WHERE correlation_id <> '';

-- Audit metadata must remain redacted. Address, token, idempotency key, payment
-- provider payload, wallet balance and full request/response bodies are forbidden.
CREATE OR REPLACE FUNCTION dsh_jrn011_validate_audit_metadata()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  serialized TEXT;
BEGIN
  serialized := LOWER(NEW.metadata::text);
  IF serialized ~ '(authorization|bearer|idempotency.?key|delivery.?address|wallet.?balance|provider.?payload)' THEN
    RAISE EXCEPTION 'JRN-011 audit metadata contains a forbidden sensitive key';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_validate_audit_metadata ON dsh_order_truth_audit;
CREATE TRIGGER trg_dsh_jrn011_validate_audit_metadata
BEFORE INSERT OR UPDATE ON dsh_order_truth_audit
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_validate_audit_metadata();

COMMIT;
