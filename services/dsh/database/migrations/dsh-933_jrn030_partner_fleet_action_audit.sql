-- DSH-933 / JRN-030: partner-fleet lifecycle audit compatibility.
--
-- dsh-058 introduced a strict allow-list for partner team-member status actions
-- and suppressed no-op status transitions. JRN-030 writes domain lifecycle
-- events to the same sovereign audit table. Issue, revoke, and expiry events are
-- intentionally audit-worthy even when the member status itself does not
-- change, so they must not be discarded as no-op status updates.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_guard_team_member_action_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.action_label NOT IN (
    'pause',
    'activate',
    'block',
    'resend-invite',
    'cancel-invite',
    'issue_captain_connection_code',
    'redeem_captain_connection_code',
    'captain_disconnect',
    'revoke_captain_connection_code',
    'expire_captain_connection_code'
  ) THEN
    RAISE EXCEPTION 'unsupported team member action: %', NEW.action_label
      USING ERRCODE = '23514';
  END IF;

  -- Preserve the legacy suppression rule only for UI status commands.
  -- Fleet lifecycle events represent security and membership facts independently
  -- of whether the team-member status changed in that exact transaction.
  IF NEW.action_label IN (
    'pause',
    'activate',
    'block',
    'resend-invite',
    'cancel-invite'
  ) AND NEW.from_status IS NOT DISTINCT FROM NEW.to_status THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
