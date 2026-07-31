-- Require structured referral evidence and a verified guarantor phone before an
-- independent provider can enter activation_ready or active. Initial creation
-- remains short and progressive.

CREATE OR REPLACE FUNCTION workforce_validate_provider_activation_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.onboarding_stage NOT IN ('activation_ready','active') THEN
    RETURN NEW;
  END IF;

  IF NEW.guarantor_phone_verified_at IS NULL THEN
    RAISE EXCEPTION 'provider activation requires a verified guarantor phone';
  END IF;

  CASE NEW.referral_source_type
    WHEN 'employee', 'captain', 'field' THEN
      IF btrim(COALESCE(NEW.referral_source_actor_id, '')) = '' THEN
        RAISE EXCEPTION 'selected referral source requires a workforce actor reference';
      END IF;
    WHEN 'partner' THEN
      IF btrim(COALESCE(NEW.referral_partner_id, '')) = '' THEN
        RAISE EXCEPTION 'partner referral requires a partner reference';
      END IF;
    WHEN 'advertisement', 'social_media' THEN
      IF btrim(COALESCE(NEW.referral_channel, '')) = '' THEN
        RAISE EXCEPTION 'campaign referral requires a channel or campaign reference';
      END IF;
    WHEN 'other' THEN
      IF btrim(NEW.referral_note) = '' THEN
        RAISE EXCEPTION 'other referral source requires a note';
      END IF;
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_validate_provider_activation_evidence
  ON workforce_provider_operational_core;
CREATE TRIGGER trg_workforce_validate_provider_activation_evidence
BEFORE INSERT OR UPDATE OF
  onboarding_stage,
  referral_source_type,
  referral_source_actor_id,
  referral_partner_id,
  referral_channel,
  referral_note,
  guarantor_phone_verified_at
ON workforce_provider_operational_core
FOR EACH ROW EXECUTE FUNCTION workforce_validate_provider_activation_evidence();

COMMENT ON FUNCTION workforce_validate_provider_activation_evidence() IS
  'Preserves short provider creation while preventing activation without structured referral evidence and a verified guarantor phone.';
