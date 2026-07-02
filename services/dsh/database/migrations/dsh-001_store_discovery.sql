-- LEGACY_FILENAME_ONLY — not a slice reference
CREATE TABLE IF NOT EXISTS dsh_stores (
  id                   text        PRIMARY KEY,
  slug                 text        NOT NULL UNIQUE,
  display_name         text        NOT NULL,
  status               text        NOT NULL,
  city_code            text        NOT NULL,
  service_area_code    text        NOT NULL,
  serviceability_status text       NOT NULL,
  rating_average       numeric(3,2),
  rating_count         integer     NOT NULL DEFAULT 0,
  delivery_eta_min     integer,
  delivery_eta_max     integer,
  is_visible           boolean     NOT NULL DEFAULT true,
  hero_image_url       text,
  logo_url             text,
  category             text        NOT NULL DEFAULT 'default',
  delivery_modes       text[]      NOT NULL DEFAULT ARRAY['delivery']::text[],
  is_free_delivery     boolean     NOT NULL DEFAULT false,
  distance_km          numeric(6,2),
  follower_count       integer     NOT NULL DEFAULT 0,
  has_pro_badge        boolean     NOT NULL DEFAULT false,
  has_coupon_badge     boolean     NOT NULL DEFAULT false,
  points_multiplier    integer,
  is_popular           boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dsh_stores_status_chk
    CHECK (status IN ('active','inactive','temporarily_closed','unavailable')),
  CONSTRAINT dsh_stores_serviceability_chk
    CHECK (serviceability_status IN ('serviceable','limited','out_of_area','unavailable')),
  CONSTRAINT dsh_stores_rating_average_chk
    CHECK (rating_average IS NULL OR (rating_average >= 0 AND rating_average <= 5)),
  CONSTRAINT dsh_stores_rating_count_chk
    CHECK (rating_count >= 0),
  CONSTRAINT dsh_stores_eta_chk
    CHECK (
      delivery_eta_min IS NULL OR
      delivery_eta_max IS NULL OR
      delivery_eta_min <= delivery_eta_max
    ),
  CONSTRAINT dsh_stores_category_chk
    CHECK (category IN ('restaurant','grocery','pharmacy','bakery','default')),
  CONSTRAINT dsh_stores_delivery_modes_chk
    CHECK (delivery_modes <@ ARRAY['delivery','pickup','express']::text[]),
  CONSTRAINT dsh_stores_distance_chk
    CHECK (distance_km IS NULL OR distance_km >= 0),
  CONSTRAINT dsh_stores_follower_count_chk
    CHECK (follower_count >= 0),
  CONSTRAINT dsh_stores_points_multiplier_chk
    CHECK (points_multiplier IS NULL OR points_multiplier >= 1)
);

ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'default';
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS delivery_modes text[] NOT NULL DEFAULT ARRAY['delivery']::text[];
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS is_free_delivery boolean NOT NULL DEFAULT false;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS distance_km numeric(6,2);
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS has_pro_badge boolean NOT NULL DEFAULT false;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS has_coupon_badge boolean NOT NULL DEFAULT false;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS points_multiplier integer;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_city_code
  ON dsh_stores(city_code);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_service_area_code
  ON dsh_stores(service_area_code);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_status
  ON dsh_stores(status);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_is_visible
  ON dsh_stores(is_visible);

ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

