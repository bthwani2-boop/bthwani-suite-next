-- DSH-1084: drop dead shadow table dsh_order_wlt_adjustments.
-- All financial adjustments, refunds, and charges belong exclusively to WLT.
-- DSH order preparation handles item replacement workflows without shadow financial tables.

BEGIN;

DROP TABLE IF EXISTS dsh_order_wlt_adjustments;

COMMIT;
