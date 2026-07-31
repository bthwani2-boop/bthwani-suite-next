-- Workforce-008: durable Workforce -> DSH availability projection outbox.
-- The outbox row is written by trigger in the same transaction as the notice.

CREATE TABLE IF NOT EXISTS workforce_dsh_availability_outbox (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id          uuid NOT NULL UNIQUE REFERENCES workforce_provider_availability_notices(id) ON DELETE CASCADE,
  actor_type         text NOT NULL CHECK (actor_type IN ('captain','field')),
  actor_id           text NOT NULL,
  notice_type        text NOT NULL,
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz NOT NULL,
  status             text NOT NULL CHECK (status IN ('active','cancelled')),
  reason             text NOT NULL DEFAULT '',
  source_updated_at  timestamptz NOT NULL,
  delivery_status    text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent')),
  attempt_count      integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at      timestamptz NOT NULL DEFAULT now(),
  last_error         text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_dsh_availability_outbox_pending_idx
  ON workforce_dsh_availability_outbox(next_retry_at,created_at)
  WHERE delivery_status='pending';

CREATE OR REPLACE FUNCTION workforce_enqueue_dsh_availability_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  provider_kind text;
BEGIN
  SELECT workforce_kind INTO provider_kind
  FROM workforce_people
  WHERE actor_id=NEW.actor_id;
  IF provider_kind NOT IN ('captain','field') THEN
    RETURN NEW;
  END IF;
  INSERT INTO workforce_dsh_availability_outbox(
    notice_id,actor_type,actor_id,notice_type,starts_at,ends_at,status,
    reason,source_updated_at,delivery_status,next_retry_at,last_error,updated_at
  ) VALUES(
    NEW.id,provider_kind,NEW.actor_id,NEW.notice_type,NEW.starts_at,NEW.ends_at,
    CASE WHEN NEW.status='cancelled' THEN 'cancelled' ELSE 'active' END,
    concat_ws(':',NEW.reason_code,NEW.note),NEW.updated_at,'pending',now(),'',now()
  )
  ON CONFLICT(notice_id) DO UPDATE SET
    actor_type=EXCLUDED.actor_type,actor_id=EXCLUDED.actor_id,
    notice_type=EXCLUDED.notice_type,starts_at=EXCLUDED.starts_at,
    ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,reason=EXCLUDED.reason,
    source_updated_at=EXCLUDED.source_updated_at,delivery_status='pending',
    next_retry_at=now(),last_error='',updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_enqueue_dsh_availability_projection
  ON workforce_provider_availability_notices;
CREATE TRIGGER trg_workforce_enqueue_dsh_availability_projection
AFTER INSERT OR UPDATE OF notice_type,starts_at,ends_at,status,reason_code,note,updated_at
ON workforce_provider_availability_notices
FOR EACH ROW EXECUTE FUNCTION workforce_enqueue_dsh_availability_projection();
