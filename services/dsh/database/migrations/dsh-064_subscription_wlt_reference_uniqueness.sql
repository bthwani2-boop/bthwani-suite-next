-- DSH-064: one DSH marketing plan per WLT financial product.
-- Empty references remain allowed only for legacy rows; active plans are
-- already blocked by the API and DSH-063 unless a WLT reference is present.

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_subscription_plan_wlt_reference
    ON dsh_subscription_plans(wlt_product_reference)
    WHERE btrim(COALESCE(wlt_product_reference, '')) <> ''
      AND archived_at IS NULL;
