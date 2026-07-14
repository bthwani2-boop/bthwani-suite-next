-- Migration to transition workforce definitions to a generic human model.
-- 1. Convert 'agency_contractor' to 'independent_contractor'.
-- 2. Drop constraints on 'engagement_type' and 'provider_kind'.
-- 3. Rename provider columns to workforce columns on workforce_people.
-- 4. Re-apply constraints to include 'employee' as an engagement type and workforce kind.
-- 5. Create workforce_employee_profiles table for salaried workforce members.
-- 6. Update provider exclusivity triggers to cover employee profiles.

-- Convert any existing agency_contractor rows to independent_contractor
UPDATE workforce_people
SET engagement_type = 'independent_contractor'
WHERE engagement_type = 'agency_contractor';

-- Drop old check constraints
ALTER TABLE workforce_people DROP CONSTRAINT IF EXISTS workforce_people_engagement_type_check;
ALTER TABLE workforce_people DROP CONSTRAINT IF EXISTS workforce_people_provider_kind_check;

-- Rename columns
ALTER TABLE workforce_people RENAME COLUMN provider_kind TO workforce_kind;
ALTER TABLE workforce_people RENAME COLUMN provider_code TO workforce_code;

-- Re-add check constraints with employee expansions
ALTER TABLE workforce_people ADD CONSTRAINT workforce_people_engagement_type_check
  CHECK (engagement_type IN ('independent_contractor', 'employee'));

ALTER TABLE workforce_people ADD CONSTRAINT workforce_people_workforce_kind_check
  CHECK (workforce_kind IN ('field', 'captain', 'employee'));

-- Create new employee profile table
CREATE TABLE IF NOT EXISTS workforce_employee_profiles (
  actor_id                text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  department              text,
  role                    text,
  supervisor_actor_id     text,
  office_location         text,
  document_media_refs     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Exclusivity function updated for employee profile
CREATE OR REPLACE FUNCTION workforce_enforce_provider_exclusivity() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'workforce_field_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_employee_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a captain or employee profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_captain_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_employee_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field or employee profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_employee_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field or captain profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to employee profiles
DROP TRIGGER IF EXISTS workforce_employee_profiles_exclusivity_trg ON workforce_employee_profiles;
CREATE TRIGGER workforce_employee_profiles_exclusivity_trg
  BEFORE INSERT ON workforce_employee_profiles
  FOR EACH ROW EXECUTE FUNCTION workforce_enforce_provider_exclusivity();

-- Sequence for employee workforce code generation
CREATE SEQUENCE IF NOT EXISTS workforce_employee_code_seq;
