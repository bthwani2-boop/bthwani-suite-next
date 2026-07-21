-- dsh-058_partner_team_idempotency.sql
-- Natural idempotency for partner-team mutations whose public contract predates
-- explicit Idempotency-Key headers. Retries after a network timeout must not
-- create duplicate pending invites, version churn, or duplicate audit rows.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_guard_duplicate_pending_team_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invited_identity := btrim(NEW.invited_identity);
  PERFORM pg_advisory_xact_lock(
    hashtextextended('dsh-team-invite:' || NEW.store_id || ':' || lower(NEW.invited_identity), 0)
  );
  IF EXISTS (
    SELECT 1
    FROM dsh_store_team_members
    WHERE store_id = NEW.store_id
      AND lower(btrim(invited_identity)) = lower(NEW.invited_identity)
      AND status = 'invited'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_duplicate_pending_team_invite
  ON dsh_store_team_members;
CREATE TRIGGER trg_dsh_guard_duplicate_pending_team_invite
BEFORE INSERT ON dsh_store_team_members
FOR EACH ROW
WHEN (NEW.status = 'invited')
EXECUTE FUNCTION dsh_guard_duplicate_pending_team_invite();

CREATE OR REPLACE FUNCTION dsh_guard_team_member_noop_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.version := OLD.version;
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_team_member_noop_status_update
  ON dsh_store_team_members;
CREATE TRIGGER trg_dsh_guard_team_member_noop_status_update
BEFORE UPDATE OF status ON dsh_store_team_members
FOR EACH ROW
EXECUTE FUNCTION dsh_guard_team_member_noop_status_update();

CREATE OR REPLACE FUNCTION dsh_guard_team_member_action_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.action_label NOT IN ('pause', 'activate', 'block', 'resend-invite', 'cancel-invite') THEN
    RAISE EXCEPTION 'unsupported team member action: %', NEW.action_label
      USING ERRCODE = '23514';
  END IF;
  IF NEW.from_status IS NOT DISTINCT FROM NEW.to_status THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_team_member_action_audit
  ON dsh_store_team_member_actions;
CREATE TRIGGER trg_dsh_guard_team_member_action_audit
BEFORE INSERT ON dsh_store_team_member_actions
FOR EACH ROW
EXECUTE FUNCTION dsh_guard_team_member_action_audit();

COMMIT;
