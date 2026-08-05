-- WLT-115: Enforce ledger immutability for strict J082 compliance.
--
-- Ledger lines, transactions, and legacy entries must never be updated or deleted.
-- Any accounting corrections must be posted as new, balanced ledger transactions (Reversals or Adjustments).

BEGIN;

CREATE OR REPLACE FUNCTION wlt_prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger records are immutable. Post a new reversal or adjustment transaction instead of mutating.';
END;
$$ LANGUAGE plpgsql;

-- Prevent UPDATE or DELETE on wlt_ledger_transactions
DROP TRIGGER IF EXISTS wlt_ledger_transactions_immutability_trg ON wlt_ledger_transactions;
CREATE TRIGGER wlt_ledger_transactions_immutability_trg
    BEFORE UPDATE OR DELETE ON wlt_ledger_transactions
    FOR EACH ROW
    EXECUTE FUNCTION wlt_prevent_ledger_mutation();

-- Prevent UPDATE or DELETE on wlt_ledger_lines
DROP TRIGGER IF EXISTS wlt_ledger_lines_immutability_trg ON wlt_ledger_lines;
CREATE TRIGGER wlt_ledger_lines_immutability_trg
    BEFORE UPDATE OR DELETE ON wlt_ledger_lines
    FOR EACH ROW
    EXECUTE FUNCTION wlt_prevent_ledger_mutation();

-- Prevent UPDATE or DELETE on wlt_ledger_entries (legacy table)
DROP TRIGGER IF EXISTS wlt_ledger_entries_immutability_trg ON wlt_ledger_entries;
CREATE TRIGGER wlt_ledger_entries_immutability_trg
    BEFORE UPDATE OR DELETE ON wlt_ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION wlt_prevent_ledger_mutation();

COMMIT;
