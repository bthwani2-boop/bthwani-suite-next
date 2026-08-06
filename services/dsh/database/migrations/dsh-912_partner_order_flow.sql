-- J056, J057, J058: Partner Order Flow (Inbox, Decisions, Preparation)
BEGIN;

-- 1. Add server-side deadline to dsh_orders
ALTER TABLE dsh_orders
  ADD COLUMN IF NOT EXISTS partner_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_partner_inbox_cursor BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint;

-- Create an index for the partner inbox and timeout sweeping
CREATE INDEX IF NOT EXISTS idx_dsh_orders_partner_deadline ON dsh_orders(partner_deadline_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dsh_orders_store_cursor ON dsh_orders(store_id, latest_partner_inbox_cursor DESC);

-- 2. Create the unified decisions table (J057)
CREATE TABLE IF NOT EXISTS dsh_partner_order_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES dsh_orders(id),
    store_id TEXT NOT NULL REFERENCES dsh_stores(id),
    actor_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('accept', 'reject')),
    reason_code TEXT,
    reason_note TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_partner_order_decision UNIQUE (order_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_order_decision_idempotency ON dsh_partner_order_decisions(store_id, idempotency_key);

-- 3. Create preparation replacements table for partial changes (J058)
CREATE TABLE IF NOT EXISTS dsh_order_preparation_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES dsh_order_preparation_issues(id),
    original_item_id UUID NOT NULL REFERENCES dsh_order_items(id),
    proposed_product_id TEXT NOT NULL,
    proposed_product_name TEXT NOT NULL,
    proposed_quantity INTEGER NOT NULL CHECK (proposed_quantity > 0),
    proposed_unit_price NUMERIC(12,2) NOT NULL CHECK (proposed_unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WLT financial adjustments for replacements (J058)
CREATE TABLE IF NOT EXISTS dsh_order_wlt_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES dsh_orders(id),
    store_id TEXT NOT NULL REFERENCES dsh_stores(id),
    issue_id UUID NOT NULL REFERENCES dsh_order_preparation_issues(id),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('refund_partial', 'charge_additional')),
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    currency TEXT NOT NULL,
    wlt_outbox_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
