-- JRN-011 / FS-08: enrich every legacy and governed transition in-database.
BEGIN;

CREATE OR REPLACE FUNCTION dsh_jrn011_increment_order_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_increment_order_version ON dsh_orders;
CREATE TRIGGER trg_dsh_jrn011_increment_order_version
BEFORE UPDATE OF status ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_increment_order_version();

CREATE OR REPLACE FUNCTION dsh_jrn011_enrich_order_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  order_row RECORD;
BEGIN
  SELECT tenant_id, correlation_id, version
  INTO order_row
  FROM dsh_orders
  WHERE id=NEW.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order event references missing order'; END IF;

  NEW.tenant_id := order_row.tenant_id;
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id,''), order_row.correlation_id);
  NEW.causation_id := COALESCE(NEW.causation_id,'');
  NEW.actor_id := COALESCE(NEW.actor_id,'');
  NEW.order_version := order_row.version;
  NEW.event_type := CASE
    WHEN NULLIF(NEW.event_type,'') IS NOT NULL AND NEW.event_type <> 'order.status_changed' THEN NEW.event_type
    WHEN NEW.from_status='' AND NEW.to_status='pending' THEN 'order.created'
    ELSE 'order.status_changed'
  END;
  NEW.metadata := COALESCE(NEW.metadata,'{}'::jsonb);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_enrich_order_event ON dsh_order_status_events;
CREATE TRIGGER trg_dsh_jrn011_enrich_order_event
BEFORE INSERT ON dsh_order_status_events
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_enrich_order_event();

CREATE OR REPLACE FUNCTION dsh_jrn011_publish_order_event_to_outbox()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dsh_order_event_outbox
    (tenant_id,order_id,event_id,event_type,correlation_id,causation_id,payload)
  VALUES
    (NEW.tenant_id,NEW.order_id,NEW.id,NEW.event_type,NEW.correlation_id,NEW.causation_id,
     jsonb_build_object(
       'eventId',NEW.id,
       'eventType',NEW.event_type,
       'orderId',NEW.order_id,
       'fromStatus',NEW.from_status,
       'toStatus',NEW.to_status,
       'actorRole',NEW.actor_role,
       'correlationId',NEW.correlation_id,
       'causationId',NEW.causation_id,
       'orderVersion',NEW.order_version,
       'metadata',NEW.metadata,
       'occurredAt',NEW.created_at
     ))
  ON CONFLICT (tenant_id,event_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_order_event_outbox ON dsh_order_status_events;
CREATE TRIGGER trg_dsh_jrn011_order_event_outbox
AFTER INSERT ON dsh_order_status_events
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_publish_order_event_to_outbox();

COMMIT;
