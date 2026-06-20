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
    )
);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_city_code
  ON dsh_stores(city_code);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_service_area_code
  ON dsh_stores(service_area_code);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_status
  ON dsh_stores(status);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_is_visible
  ON dsh_stores(is_visible);
