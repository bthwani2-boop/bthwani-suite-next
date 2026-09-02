-- DSH is the sole owner of operational geography. Workforce keeps only the
-- service-area code and zone id returned by DSH as immutable reference data;
-- it does not own labels, activation, or a local city catalogue.

ALTER TABLE workforce_field_profiles
  DROP CONSTRAINT IF EXISTS workforce_field_profiles_city_code_fkey;

ALTER TABLE workforce_captain_profiles
  DROP CONSTRAINT IF EXISTS workforce_captain_profiles_operating_city_code_fkey;

DROP INDEX IF EXISTS workforce_field_profiles_city_idx;
DROP INDEX IF EXISTS workforce_captain_profiles_city_idx;

ALTER TABLE workforce_field_profiles
  RENAME COLUMN city_code TO service_area_code;

ALTER TABLE workforce_captain_profiles
  RENAME COLUMN operating_city_code TO operating_service_area_code;

CREATE INDEX IF NOT EXISTS workforce_field_profiles_service_area_idx
  ON workforce_field_profiles(service_area_code);

CREATE INDEX IF NOT EXISTS workforce_captain_profiles_service_area_idx
  ON workforce_captain_profiles(operating_service_area_code);

DROP TABLE IF EXISTS workforce_cities;
