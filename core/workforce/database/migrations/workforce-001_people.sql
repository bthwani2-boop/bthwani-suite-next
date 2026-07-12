-- Workforce is the sovereign owner of service-provider profiles (field
-- agents and, later, captains). These are independent service providers, not
-- salaried employees: a field agent earns a commission per store onboarding
-- and a captain earns the delivery fee per order — compensation itself is
-- owned by WLT and never stored here. The shared key with every other
-- service is actor_id (owned by core/identity). No phone number is stored
-- here by design: Identity owns phones; Workforce resolves them via the
-- internal actors API when a view or an activation needs one.

CREATE TABLE IF NOT EXISTS workforce_cities (
  code       text PRIMARY KEY,
  name_ar    text NOT NULL,
  name_en    text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workforce_shifts (
  code       text PRIMARY KEY,
  name_ar    text NOT NULL,
  name_en    text,
  starts_at  time,
  ends_at    time,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO workforce_cities (code, name_ar, name_en) VALUES
  ('sanaa', 'صنعاء', 'Sanaa'),
  ('aden', 'عدن', 'Aden'),
  ('taiz', 'تعز', 'Taiz'),
  ('hodeidah', 'الحديدة', 'Hodeidah'),
  ('ibb', 'إب', 'Ibb')
ON CONFLICT (code) DO NOTHING;

INSERT INTO workforce_shifts (code, name_ar, name_en, starts_at, ends_at) VALUES
  ('morning', 'وردية صباحية', 'Morning shift', '08:00', '16:00'),
  ('evening', 'وردية مسائية', 'Evening shift', '16:00', '00:00'),
  ('full_day', 'وردية كاملة', 'Full day', '08:00', '20:00')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS workforce_people (
  actor_id              text PRIMARY KEY,
  full_name_ar          text NOT NULL,
  full_name_en          text,
  provider_code         text NOT NULL UNIQUE,
  engagement_type       text NOT NULL DEFAULT 'independent_contractor'
                          CHECK (engagement_type IN ('independent_contractor', 'agency_contractor')),
  engagement_start_date date,
  engagement_status     text NOT NULL DEFAULT 'pending_activation'
                          CHECK (engagement_status IN ('pending_activation', 'active', 'suspended', 'terminated')),
  photo_media_ref       text,
  version               integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_people_status_idx
  ON workforce_people(engagement_status, created_at DESC);

CREATE TABLE IF NOT EXISTS workforce_field_profiles (
  actor_id                text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  city_code               text REFERENCES workforce_cities(code),
  shift_code              text REFERENCES workforce_shifts(code),
  supervisor_actor_id     text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  preferred_language      text CHECK (preferred_language IN ('ar', 'en')),
  policy_consent_at       timestamptz,
  document_media_refs     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_field_profiles_city_idx
  ON workforce_field_profiles(city_code);

CREATE TABLE IF NOT EXISTS workforce_captain_profiles (
  actor_id              text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  vehicle_type          text,
  vehicle_identifier    text,
  license_status        text CHECK (license_status IN ('missing', 'pending_review', 'valid', 'expired', 'rejected')),
  license_expires_at    date,
  operating_city_code   text REFERENCES workforce_cities(code),
  operating_scope_code  text,
  document_media_refs   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_captain_profiles_city_idx
  ON workforce_captain_profiles(operating_city_code);

-- Audit + idempotency follow the proven dsh-001b templates.
CREATE TABLE IF NOT EXISTS workforce_action_audit (
  id              bigserial PRIMARY KEY,
  actor_id        text NOT NULL,
  actor_role      text NOT NULL,
  target_actor_id text,
  action          text NOT NULL,
  from_state      jsonb,
  to_state        jsonb,
  reason          text,
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_action_audit_target_idx
  ON workforce_action_audit(target_actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workforce_idempotency (
  actor_id        text NOT NULL,
  operation       text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash    text NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation, idempotency_key)
);
