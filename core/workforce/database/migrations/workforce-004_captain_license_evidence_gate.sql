BEGIN;

-- A captain licence may only become valid when Workforce holds at least one
-- supporting document and a non-expired expiry date. This is enforced in the
-- sovereign database so UI or direct API callers cannot bypass the gate.
CREATE OR REPLACE FUNCTION workforce_enforce_captain_license_evidence()
RETURNS trigger AS $$
BEGIN
  IF NEW.license_status = 'valid' THEN
    IF NEW.document_media_refs IS NULL
       OR jsonb_typeof(NEW.document_media_refs) <> 'array'
       OR jsonb_array_length(NEW.document_media_refs) = 0 THEN
      RAISE EXCEPTION 'valid captain licence requires at least one supporting document'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.license_expires_at IS NULL OR NEW.license_expires_at < CURRENT_DATE THEN
      RAISE EXCEPTION 'valid captain licence requires a non-expired expiry date'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workforce_captain_license_evidence_trg
  ON workforce_captain_profiles;

CREATE TRIGGER workforce_captain_license_evidence_trg
  BEFORE INSERT OR UPDATE OF license_status, license_expires_at, document_media_refs
  ON workforce_captain_profiles
  FOR EACH ROW
  EXECUTE FUNCTION workforce_enforce_captain_license_evidence();

COMMIT;
