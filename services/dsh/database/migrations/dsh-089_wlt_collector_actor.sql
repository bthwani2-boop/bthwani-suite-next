-- DSH-089: Persist the physical collection actor independently from the
-- fulfillment implementation and enqueue pickup delivery completion.

ALTER TABLE dsh_wlt_outbox_events
    ADD COLUMN IF NOT EXISTS collector_type TEXT,
    ADD COLUMN IF NOT EXISTS collector_id TEXT;

ALTER TABLE dsh_wlt_outbox_events
    ALTER COLUMN captain_id DROP NOT NULL;

-- Normalize existing delivery events from the governed order mode.
UPDATE dsh_wlt_outbox_events e
SET collector_type = CASE o.fulfillment_mode
        WHEN 'partner_delivery' THEN 'store_courier'
        WHEN 'pickup' THEN 'partner_store'
        ELSE 'captain'
    END,
    collector_id = CASE o.fulfillment_mode
        WHEN 'pickup' THEN s.partner_id
        ELSE COALESCE(NULLIF(e.collector_id, ''), e.captain_id)
    END,
    captain_id = CASE
        WHEN o.fulfillment_mode = 'bthwani_delivery' THEN COALESCE(NULLIF(e.captain_id, ''), e.collector_id)
        ELSE NULL
    END
FROM dsh_orders o
JOIN dsh_stores s ON s.id = o.store_id
WHERE e.event_type = 'delivery_completed'
  AND e.order_id = o.id;

CREATE OR REPLACE FUNCTION dsh_normalize_delivery_collection_actor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_mode TEXT;
    v_partner_id TEXT;
BEGIN
    IF NEW.event_type <> 'delivery_completed' THEN
        NEW.collector_type := NULL;
        NEW.collector_id := NULL;
        RETURN NEW;
    END IF;

    SELECT o.fulfillment_mode, s.partner_id
      INTO v_mode, v_partner_id
      FROM dsh_orders o
      JOIN dsh_stores s ON s.id = o.store_id
     WHERE o.id = NEW.order_id;

    IF v_mode = 'partner_delivery' THEN
        NEW.collector_type := 'store_courier';
        NEW.collector_id := COALESCE(NULLIF(NEW.collector_id, ''), NEW.captain_id);
        NEW.captain_id := NULL;
    ELSIF v_mode = 'pickup' THEN
        NEW.collector_type := 'partner_store';
        NEW.collector_id := v_partner_id;
        NEW.captain_id := NULL;
    ELSE
        NEW.collector_type := 'captain';
        NEW.collector_id := COALESCE(NULLIF(NEW.collector_id, ''), NEW.captain_id);
        NEW.captain_id := NEW.collector_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_normalize_delivery_collection_actor
    ON dsh_wlt_outbox_events;
CREATE TRIGGER trg_dsh_normalize_delivery_collection_actor
BEFORE INSERT OR UPDATE OF event_type, order_id, captain_id, collector_type, collector_id
ON dsh_wlt_outbox_events
FOR EACH ROW
EXECUTE FUNCTION dsh_normalize_delivery_collection_actor();

CREATE OR REPLACE FUNCTION dsh_enqueue_pickup_delivery_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner_id TEXT;
BEGIN
    IF NEW.fulfillment_mode <> 'pickup'
       OR NEW.status <> 'delivered'
       OR OLD.status = 'delivered' THEN
        RETURN NEW;
    END IF;

    SELECT partner_id INTO v_partner_id
      FROM dsh_stores
     WHERE id = NEW.store_id;

    INSERT INTO dsh_wlt_outbox_events
      (event_type, tenant_id, order_id, captain_id, collector_type, collector_id,
       partner_id, checkout_intent_id)
    VALUES
      ('delivery_completed', NEW.tenant_id, NEW.id, NULL, 'partner_store', v_partner_id,
       v_partner_id, NEW.checkout_intent_id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_enqueue_pickup_delivery_completion
    ON dsh_orders;
CREATE TRIGGER trg_dsh_enqueue_pickup_delivery_completion
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_enqueue_pickup_delivery_completion();

ALTER TABLE dsh_wlt_outbox_events
    DROP CONSTRAINT IF EXISTS dsh_wlt_outbox_events_collector_type_check;
ALTER TABLE dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_collector_type_check
    CHECK (
      (event_type = 'delivery_completed'
       AND collector_type IN ('captain', 'store_courier', 'partner_store')
       AND NULLIF(collector_id, '') IS NOT NULL)
      OR
      (event_type <> 'delivery_completed'
       AND collector_type IS NULL
       AND collector_id IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_collector
    ON dsh_wlt_outbox_events(collector_type, collector_id, created_at DESC)
    WHERE event_type = 'delivery_completed';
