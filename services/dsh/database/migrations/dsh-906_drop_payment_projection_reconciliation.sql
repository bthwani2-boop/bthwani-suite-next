-- DSH-906: Drop legacy payment projection polling table
-- We have migrated to an event-driven outbox pattern in WLT.
-- WLT now explicitly pushes `payment-session-events` to DSH, eliminating the need
-- for this polling reconciliation table.

DROP TABLE IF EXISTS dsh_order_payment_projection_reconciliation;
