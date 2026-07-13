-- Makes provider kind (field vs captain) an explicit, exclusive fact on
-- workforce_people instead of an inferred join against the two profile
-- tables, adds the columns needed to source "service zone" from DSH
-- Platform Zones instead of the local workforce_cities table, adds a
-- supervisor field to captains (mirroring the existing field-agent column),
-- and introduces per-kind sequences for server-generated provider codes.

ALTER TABLE workforce_people
  ADD COLUMN IF NOT EXISTS provider_kind text
    CHECK (provider_kind IN ('field', 'captain'));

UPDATE workforce_people p
SET provider_kind = 'field'
WHERE provider_kind IS NULL
  AND EXISTS (SELECT 1 FROM workforce_field_profiles f WHERE f.actor_id = p.actor_id);

UPDATE workforce_people p
SET provider_kind = 'captain'
WHERE provider_kind IS NULL
  AND EXISTS (SELECT 1 FROM workforce_captain_profiles c WHERE c.actor_id = p.actor_id);

-- Manual gate: if this ever returns rows, a person exists with neither
-- profile table populated and the migration must not proceed blindly —
-- investigate before forcing NOT NULL.
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count FROM workforce_people WHERE provider_kind IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'workforce-002: % workforce_people rows have no field/captain profile to backfill provider_kind from', orphan_count;
  END IF;
END $$;

ALTER TABLE workforce_people
  ALTER COLUMN provider_kind SET NOT NULL;

-- Exclusivity: a person is either a field agent or a captain, never both.
-- A cross-table CHECK isn't possible in Postgres, so this is enforced with
-- a trigger on each profile table's insert path.
CREATE OR REPLACE FUNCTION workforce_enforce_provider_exclusivity() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'workforce_field_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a captain profile; a provider cannot be both field and captain', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_captain_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field profile; a provider cannot be both field and captain', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workforce_field_profiles_exclusivity_trg ON workforce_field_profiles;
CREATE TRIGGER workforce_field_profiles_exclusivity_trg
  BEFORE INSERT ON workforce_field_profiles
  FOR EACH ROW EXECUTE FUNCTION workforce_enforce_provider_exclusivity();

DROP TRIGGER IF EXISTS workforce_captain_profiles_exclusivity_trg ON workforce_captain_profiles;
CREATE TRIGGER workforce_captain_profiles_exclusivity_trg
  BEFORE INSERT ON workforce_captain_profiles
  FOR EACH ROW EXECUTE FUNCTION workforce_enforce_provider_exclusivity();

-- Traceability pointer to the DSH Platform Zone chosen at creation time.
-- Workforce and DSH are separate services/databases, so this cannot be a
-- real foreign key; workforce_cities.city_code remains the enforced FK
-- target for city_code/operating_city_code (kept in sync by an upsert in
-- the application layer whenever a zone is chosen).
ALTER TABLE workforce_field_profiles
  ADD COLUMN IF NOT EXISTS service_zone_id text;

ALTER TABLE workforce_captain_profiles
  ADD COLUMN IF NOT EXISTS service_zone_id text;

-- Captains gain a supervisor field, mirroring workforce_field_profiles.
ALTER TABLE workforce_captain_profiles
  ADD COLUMN IF NOT EXISTS supervisor_actor_id text;

-- Server-generated provider codes going forward (FLD-000123 / CAP-000124).
-- Existing provider_code values are left untouched — only new rows draw
-- from these sequences.
CREATE SEQUENCE IF NOT EXISTS workforce_field_code_seq;
CREATE SEQUENCE IF NOT EXISTS workforce_captain_code_seq;
