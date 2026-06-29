-- WLT-007: Enforce Default Currency Yemen (YER)
-- Set column defaults to YER and update any existing SAR rows to YER across all tables. -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_payment_sessions ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_payment_sessions SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_refunds ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_refunds SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_settlements ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_settlements SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_cod_records ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_cod_records SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_commissions ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_commissions SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE wlt_ledger_entries ALTER COLUMN currency SET DEFAULT 'YER';
UPDATE wlt_ledger_entries SET currency = 'YER' WHERE currency = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE
