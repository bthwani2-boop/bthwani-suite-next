-- WLT-912: captain COD reserve/authorization from the canonical wallet.
--
-- Today a captain can be assigned unlimited COD orders regardless of their
-- wallet's financial standing -- wlt_wallets has no capacity concept for COD
-- exposure at all (held_balance_minor_units, added in wlt-011, is used
-- exclusively by the payout hold flow in internal/payout; commingling COD
-- reserves into that same column would make payout holds and COD exposure
-- indistinguishable from one number). This adds a dedicated
-- cod_reserved_balance_minor_units bucket plus a wlt_cod_reservations table
-- recording exactly one reservation per (operator_context_id, order_id), so
-- "at most one reservation per order" and "cannot overcommit available
-- balance" are both database facts, not application conventions.

ALTER TABLE wlt_wallets
    ADD COLUMN IF NOT EXISTS cod_reserved_balance_minor_units BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS wlt_cod_reservations (
    id                  TEXT PRIMARY KEY DEFAULT ('wcodres_' || gen_random_uuid()::text),
    operator_context_id TEXT NOT NULL,
    order_id            TEXT NOT NULL,
    captain_id          TEXT NOT NULL,
    amount_minor_units  BIGINT NOT NULL,
    currency            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'reserved',
    idempotency_key     TEXT NOT NULL,
    release_reason      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    CONSTRAINT wlt_cod_reservations_amount_chk CHECK (amount_minor_units > 0),
    CONSTRAINT wlt_cod_reservations_status_chk CHECK (status IN ('reserved', 'released', 'finalized')),
    CONSTRAINT wlt_cod_reservations_operator_context_chk CHECK (btrim(operator_context_id) <> '')
);

DROP INDEX IF EXISTS wlt_cod_reservations_operator_context_order_idx;
CREATE UNIQUE INDEX wlt_cod_reservations_operator_context_order_idx
    ON wlt_cod_reservations(operator_context_id, order_id);

CREATE INDEX IF NOT EXISTS wlt_cod_reservations_captain_status_idx
    ON wlt_cod_reservations(operator_context_id, captain_id, status);

COMMENT ON TABLE wlt_cod_reservations IS
  'One row per (operator_context_id, order_id): the captain COD exposure this order reserved against the captain wallet''s available balance. reserved -> released (cancellation, capacity returned) or reserved -> finalized (delivery remitted, exposure retired without returning to available since the cash was already handled through the COD collect/remit ledger flow).';

COMMENT ON COLUMN wlt_wallets.cod_reserved_balance_minor_units IS
  'Captain COD exposure currently reserved against this wallet (wlt-912). Distinct from held_balance_minor_units, which is payout-hold exposure (internal/payout) -- kept separate so the two hold types remain independently accountable.';
