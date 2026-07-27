-- Lightweight operational core for the three workforce kinds.
-- workforce_people remains the single person record; the tables below add only
-- the progressive facts needed to activate, suspend and audit independent
-- providers. Employees keep their separate employee profile.
--
-- Terminology rule: the field kind is always "الميداني". No marketing label or
-- marketing-specific workforce kind is introduced.
-- Financial rule: the captain financial guarantee is the same funded balance
-- previously described as an opening balance. WLT remains the monetary source
-- of truth; Workforce stores only the reviewed operational projection/reference.

CREATE TABLE IF NOT EXISTS workforce_provider_operational_core (
  actor_id                       text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  referral_source_type           text NOT NULL DEFAULT 'direct'
    CHECK (referral_source_type IN ('employee','captain','field','partner','advertisement','social_media','public_referral','direct','other')),
  referral_source_actor_id       text,
  referral_partner_id            text,
  referral_channel               text,
  referral_note                  text NOT NULL DEFAULT '',
  guarantor_full_name            text NOT NULL DEFAULT '',
  guarantor_relationship         text NOT NULL DEFAULT '',
  guarantor_phone_e164           text NOT NULL DEFAULT '',
  guarantor_phone_verified_at    timestamptz,
  national_id_number             text NOT NULL DEFAULT '',
  identity_front_media_ref       text NOT NULL DEFAULT '',
  identity_back_media_ref        text NOT NULL DEFAULT '',
  identity_verification_status   text NOT NULL DEFAULT 'pending'
    CHECK (identity_verification_status IN ('pending','under_review','approved','rejected','expired','needs_resubmission')),
  identity_rejection_reason      text NOT NULL DEFAULT '',
  contract_media_ref             text NOT NULL DEFAULT '',
  contract_review_status         text NOT NULL DEFAULT 'pending'
    CHECK (contract_review_status IN ('pending','under_review','approved','rejected','needs_resubmission')),
  contract_rejection_reason      text NOT NULL DEFAULT '',
  onboarding_stage               text NOT NULL DEFAULT 'basic_profile'
    CHECK (onboarding_stage IN ('basic_profile','documents_pending','documents_review','training_pending','partnerships_review','operations_review','activation_ready','active')),
  partnerships_approved_at       timestamptz,
  reviewed_by_actor_id           text,
  updated_by_actor_id            text NOT NULL DEFAULT '',
  version                        integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_provider_operational_core_stage_idx
  ON workforce_provider_operational_core(onboarding_stage, identity_verification_status, contract_review_status);

CREATE TABLE IF NOT EXISTS workforce_captain_activation_core (
  actor_id                         text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  classification                   text NOT NULL DEFAULT 'joker'
    CHECK (classification IN ('joker','basic')),
  financial_guarantee_minor_units  bigint NOT NULL DEFAULT 0 CHECK (financial_guarantee_minor_units >= 0),
  financial_guarantee_currency     text NOT NULL DEFAULT 'YER',
  financial_guarantee_status       text NOT NULL DEFAULT 'not_funded'
    CHECK (financial_guarantee_status IN ('not_funded','pending_review','funded','released','forfeited')),
  financial_guarantee_reference    text NOT NULL DEFAULT '',
  delivery_bag_custody_status      text NOT NULL DEFAULT 'not_issued'
    CHECK (delivery_bag_custody_status IN ('not_issued','issued','returned','lost','damaged')),
  delivery_bag_custody_reference   text NOT NULL DEFAULT '',
  mandatory_purchases_status       text NOT NULL DEFAULT 'not_required'
    CHECK (mandatory_purchases_status IN ('not_required','pending_payment','paid','paid_and_delivered','cancelled')),
  mandatory_purchases_reference    text NOT NULL DEFAULT '',
  training_status                  text NOT NULL DEFAULT 'pending'
    CHECK (training_status IN ('pending','in_progress','passed','failed')),
  operations_accreditation_status  text NOT NULL DEFAULT 'pending'
    CHECK (operations_accreditation_status IN ('pending','approved','suspended','expired')),
  classification_updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_id              text NOT NULL DEFAULT '',
  version                          integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at                       timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_captain_activation_core_readiness_idx
  ON workforce_captain_activation_core(
    classification,
    financial_guarantee_status,
    training_status,
    operations_accreditation_status
  );

CREATE TABLE IF NOT EXISTS workforce_provider_availability_notices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              text NOT NULL REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  notice_type           text NOT NULL
    CHECK (notice_type IN ('planned_unavailability','immediate_unavailability','short_break','emergency','temporary_restriction')),
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  service_zone_id       text,
  reason_code           text NOT NULL DEFAULT 'personal',
  note                  text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','active','completed','cancelled')),
  created_by_actor_id   text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS workforce_provider_availability_actor_idx
  ON workforce_provider_availability_notices(actor_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS workforce_provider_availability_window_idx
  ON workforce_provider_availability_notices(starts_at, ends_at)
  WHERE status IN ('scheduled','active');

CREATE TABLE IF NOT EXISTS workforce_provider_incidents (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id                 text NOT NULL REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  incident_code            text NOT NULL,
  source_type              text NOT NULL DEFAULT 'operational',
  source_id                text NOT NULL DEFAULT '',
  description              text NOT NULL,
  evidence_media_refs      jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity                 text NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor','major','critical')),
  status                   text NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','under_review','provider_notified','appeal_window','approved','rejected','financial_action_posted','closed','reversed')),
  policy_id                text NOT NULL DEFAULT '',
  proposed_penalty_minor_units bigint NOT NULL DEFAULT 0 CHECK (proposed_penalty_minor_units >= 0),
  currency                 text NOT NULL DEFAULT 'YER',
  wlt_ledger_reference     text NOT NULL DEFAULT '',
  appeal_note              text NOT NULL DEFAULT '',
  appealed_at              timestamptz,
  resolution_note          text NOT NULL DEFAULT '',
  reported_by_actor_id     text NOT NULL,
  reviewed_by_actor_id     text,
  resolved_at              timestamptz,
  version                  integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_provider_incidents_actor_idx
  ON workforce_provider_incidents(actor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS workforce_provider_incidents_source_unique
  ON workforce_provider_incidents(actor_id, incident_code, source_type, source_id)
  WHERE source_id <> '';

-- Existing field rows must not retain an employment-style shift assignment.
UPDATE workforce_field_profiles SET shift_code = NULL WHERE shift_code IS NOT NULL;
COMMENT ON COLUMN workforce_field_profiles.shift_code IS
  'Deprecated compatibility column. The field provider is independent and has no shifts; use availability notices.';

INSERT INTO workforce_provider_operational_core (actor_id)
SELECT actor_id FROM workforce_people WHERE workforce_kind IN ('field','captain')
ON CONFLICT (actor_id) DO NOTHING;

INSERT INTO workforce_captain_activation_core (actor_id)
SELECT actor_id FROM workforce_people WHERE workforce_kind = 'captain'
ON CONFLICT (actor_id) DO NOTHING;
