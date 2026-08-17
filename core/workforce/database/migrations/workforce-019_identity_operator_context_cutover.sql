-- Workforce-019: persist Identity-owned operator context with deferred work.
-- Historical rows remain unsendable when no authoritative context exists;
-- the worker fails closed instead of reconstructing scope from process env.

ALTER TABLE workforce_provider_availability_notices
  ADD COLUMN IF NOT EXISTS operator_context_id text;

ALTER TABLE workforce_dsh_availability_outbox
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE workforce_dsh_availability_outbox outbox
SET operator_context_id = notices.operator_context_id
FROM workforce_provider_availability_notices notices
WHERE notices.id = outbox.notice_id
  AND NULLIF(BTRIM(outbox.operator_context_id), '') IS NULL
  AND NULLIF(BTRIM(notices.operator_context_id), '') IS NOT NULL;

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
    notice_id,operator_context_id,actor_type,actor_id,notice_type,starts_at,ends_at,status,
    reason,source_updated_at,delivery_status,next_retry_at,last_error,updated_at
  ) VALUES(
    NEW.id,NULLIF(BTRIM(NEW.operator_context_id),''),provider_kind,NEW.actor_id,NEW.notice_type,NEW.starts_at,NEW.ends_at,
    CASE WHEN NEW.status='cancelled' THEN 'cancelled' ELSE 'active' END,
    concat_ws(':',NEW.reason_code,NEW.note),NEW.updated_at,'pending',now(),'',now()
  )
  ON CONFLICT(notice_id) DO UPDATE SET
    operator_context_id=EXCLUDED.operator_context_id,
    actor_type=EXCLUDED.actor_type,actor_id=EXCLUDED.actor_id,
    notice_type=EXCLUDED.notice_type,starts_at=EXCLUDED.starts_at,
    ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,reason=EXCLUDED.reason,
    source_updated_at=EXCLUDED.source_updated_at,delivery_status='pending',
    next_retry_at=now(),last_error='',updated_at=now();
  RETURN NEW;
END;
$$;
