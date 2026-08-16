-- DSH-1010: make COD reservation release a durable financial closure event.
-- Assignment terminal transitions and reservation-release intent must survive
-- a WLT outage; the existing checkout finance outbox supplies the durable
-- retry/claim/idempotency machinery.

ALTER TABLE dsh_checkout_financial_closure_outbox
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_event_type_check;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_event_type_check
  CHECK (event_type IN ('expire_session', 'cancel_for_order', 'release_cod_reservation'));
