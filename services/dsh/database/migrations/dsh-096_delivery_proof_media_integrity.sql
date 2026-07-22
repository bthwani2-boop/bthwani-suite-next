-- Governed proof references must resolve to uploaded media owned by the actor
-- that completed the delivery. This prevents local URIs, placeholders, and
-- arbitrary strings from becoming delivery truth.

CREATE OR REPLACE FUNCTION dsh_validate_captain_delivery_proof_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.pod_reference IS NULL OR btrim(NEW.pod_reference) = '' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_media_refs mr
        WHERE mr.media_ref = NEW.pod_reference
          AND mr.owner_actor_role = 'captain'
          AND mr.owner_actor_id = NEW.captain_id
          AND mr.purpose = 'delivery_proof'
    ) THEN
        RAISE EXCEPTION 'invalid captain delivery proof media reference'
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_deliveries_validate_pod_reference ON dsh_deliveries;
CREATE TRIGGER trg_dsh_deliveries_validate_pod_reference
BEFORE INSERT OR UPDATE OF pod_reference ON dsh_deliveries
FOR EACH ROW
EXECUTE FUNCTION dsh_validate_captain_delivery_proof_reference();

CREATE OR REPLACE FUNCTION dsh_validate_partner_delivery_proof_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.proof_reference IS NULL OR btrim(NEW.proof_reference) = '' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_media_refs mr
        JOIN dsh_stores st ON st.id = NEW.store_id
        WHERE mr.media_ref = NEW.proof_reference
          AND mr.owner_actor_role = 'partner'
          AND mr.purpose = 'partner_delivery_proof'
          AND mr.store_id = NEW.store_id
          AND mr.partner_id = st.partner_id
    ) THEN
        RAISE EXCEPTION 'invalid partner delivery proof media reference'
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_partner_delivery_validate_proof_reference ON dsh_partner_delivery_tasks;
CREATE TRIGGER trg_dsh_partner_delivery_validate_proof_reference
BEFORE INSERT OR UPDATE OF proof_reference ON dsh_partner_delivery_tasks
FOR EACH ROW
EXECUTE FUNCTION dsh_validate_partner_delivery_proof_reference();
