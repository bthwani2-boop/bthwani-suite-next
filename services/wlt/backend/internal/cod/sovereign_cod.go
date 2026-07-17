package cod

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

// MarkCodCollectedSovereign records the moment cash enters captain custody.
// The operational status and the accounting movement commit together.
func MarkCodCollectedSovereign(ctx context.Context, db *sql.DB, codRecordID string) (*CodRecord, error) {
	if codRecordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_records
		SET status = 'collected', collected_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'pending_collection'
		RETURNING `+codCols, codRecordID)
	c, err := scanCodRecord(row)
	if err == sql.ErrNoRows {
		var status string
		getErr := tx.QueryRowContext(ctx, `SELECT status FROM wlt_cod_records WHERE id = $1`, codRecordID).Scan(&status)
		if errors.Is(getErr, sql.ErrNoRows) {
			return nil, nil
		}
		if getErr != nil {
			return nil, getErr
		}
		return nil, ErrCodStateConflict
	}
	if err != nil {
		return nil, err
	}
	if c.AmountMinorUnits <= 0 || c.Currency == "" {
		return nil, fmt.Errorf("COD record %s has invalid accounting amount/currency", c.ID)
	}

	lines := []ledger.LedgerLine{
		{AccountType: "cash_in_transit", DebitCredit: "debit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
		{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "cod_collected", "cod_record", c.ID, lines, ledger.Actor{ID: c.CaptainID, Type: "captain"}); err != nil {
		return nil, fmt.Errorf("post COD collection journal: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return c, nil
}

// MarkCodRemittedSovereign records transfer of collected cash from captain
// custody into the provider/bank clearing position.
func MarkCodRemittedSovereign(ctx context.Context, db *sql.DB, codRecordID string) (*CodRecord, error) {
	if codRecordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_records
		SET status = 'remitted', remitted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'collected'
		RETURNING `+codCols, codRecordID)
	c, err := scanCodRecord(row)
	if err == sql.ErrNoRows {
		var status string
		getErr := tx.QueryRowContext(ctx, `SELECT status FROM wlt_cod_records WHERE id = $1`, codRecordID).Scan(&status)
		if errors.Is(getErr, sql.ErrNoRows) {
			return nil, nil
		}
		if getErr != nil {
			return nil, getErr
		}
		return nil, ErrCodStateConflict
	}
	if err != nil {
		return nil, err
	}

	lines := []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
		{AccountType: "cash_in_transit", DebitCredit: "credit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "cod_remitted", "cod_record", c.ID, lines, ledger.Actor{ID: c.CaptainID, Type: "captain"}); err != nil {
		return nil, fmt.Errorf("post COD remittance journal: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return c, nil
}

func HandleCollectCodSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := MarkCodCollectedSovereign(r.Context(), db, r.PathValue("codRecordId"))
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "COD record is not pending collection")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if c == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD record not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codRecord": c})
	}
}

func HandleRemitCodSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := MarkCodRemittedSovereign(r.Context(), db, r.PathValue("codRecordId"))
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "COD record must be collected before remittance")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if c == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD record not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codRecord": c})
	}
}
