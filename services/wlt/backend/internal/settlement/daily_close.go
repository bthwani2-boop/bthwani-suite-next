package settlement

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

type ExecuteDailyCloseInput struct {
	BusinessDate string `json:"businessDate"`
	OperatorID   string `json:"operatorId"`
}

type DailyFinanceClose struct {
	BusinessDate             string    `json:"businessDate"`
	OperatorContextID        string    `json:"operatorContextId"`
	TotalPayoutsMinorUnits   int64     `json:"totalPayoutsMinorUnits"`
	TotalCashinMinorUnits    int64     `json:"totalCashinMinorUnits"`
	ClosingBalanceMinorUnits int64     `json:"closingBalanceMinorUnits"`
	ClosedByOperatorID       string    `json:"closedByOperatorId"`
	ClosedAt                 time.Time `json:"closedAt"`
}

func ExecuteDailyFinanceClose(ctx context.Context, db *sql.DB, input ExecuteDailyCloseInput, correlationID string) (*DailyFinanceClose, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input.BusinessDate = strings.TrimSpace(input.BusinessDate)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	correlationID = strings.TrimSpace(correlationID)

	if input.BusinessDate == "" || input.OperatorID == "" || correlationID == "" {
		return nil, fmt.Errorf("businessDate, operatorId, and correlationId are required")
	}

	date, err := time.Parse("2006-01-02", input.BusinessDate)
	if err != nil {
		return nil, fmt.Errorf("businessDate must be YYYY-MM-DD")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	// Check if already closed
	var existing string
	if err := tx.QueryRowContext(ctx, `SELECT business_date FROM wlt_daily_finance_close WHERE business_date = $1 AND operator_context_id = $2`, date.Format("2006-01-02"), operatorContextID).Scan(&existing); err == nil {
		return nil, fmt.Errorf("business date %s is already closed", input.BusinessDate)
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	// Calculate totals for the day from the ledger
	var totalPayouts int64
	var totalCashin int64
	var closingBalance int64

	// Day totals come from the canonical double-entry kernel
	// (wlt_ledger_transactions/wlt_ledger_lines/wlt_ledger_accounts). They
	// previously came from wlt_ledger_entries, a retired compatibility table
	// that no current write path fills, so both totals were persisted as zero
	// into a signed financial close record.
	if err := tx.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(l.amount_minor_units) FILTER (WHERE t.transaction_type = 'payout_completed' AND l.debit_credit = 'debit' AND a.account_type = 'wallet'), 0),
			COALESCE(SUM(l.amount_minor_units) FILTER (WHERE t.transaction_type = 'cash_in_topup' AND l.debit_credit = 'credit' AND a.account_type = 'wallet'), 0)
		FROM wlt_ledger_transactions t
		JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
		JOIN wlt_ledger_accounts a ON a.id = l.account_id
		WHERE t.operator_context_id = $1 AND DATE(t.created_at AT TIME ZONE 'UTC') = $2
	`, operatorContextID, date.Format("2006-01-02")).Scan(&totalPayouts, &totalCashin); err != nil {
		return nil, err
	}

	// Calculate overall closing balance for the operator context
	// wlt_ledger_accounts.balance_minor_units is stored debit-positive /
	// credit-negative (see ledger.PostLedgerTransaction). A wallet is a
	// credit-normal liability, so the raw sum is the negation of what BThwani
	// still owes its actors; negating it reports the closing liability in the
	// same positive orientation as the payout and cash-in totals.
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(-SUM(balance_minor_units), 0)
		FROM wlt_ledger_accounts
		WHERE operator_context_id = $1 AND account_type = 'wallet'
	`, operatorContextID).Scan(&closingBalance); err != nil {
		return nil, err
	}

	// Check for frozen batches that lack full evidence (blocking gate)
	var incompleteBatches int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM wlt_settlement_batches b
		WHERE b.operator_context_id = $1
		  AND b.status IN ('frozen', 'execution_in_progress', 'awaiting_verification')
		  AND b.row_count > (
			  SELECT COUNT(*) FROM wlt_manual_transfer_evidence e WHERE e.batch_id = b.id
		  )
	`, operatorContextID).Scan(&incompleteBatches); err != nil {
		return nil, err
	}
	if incompleteBatches > 0 {
		return nil, fmt.Errorf("cannot close day: %d settlement batches have incomplete manual transfer evidence", incompleteBatches)
	}

	// Check for externally executed transfers that no independent operator has
	// verified yet (blocking gate). This predicate is verified_at IS NULL, not
	// an operator-id emptiness test: evidence used to be stamped with its own
	// submitter at insert time, which made the previous version of this gate
	// unable to fire at all.
	var unverifiedEvidence int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM wlt_manual_transfer_evidence e
		JOIN wlt_settlement_batches b ON b.id = e.batch_id
		WHERE b.operator_context_id = $1
		  AND b.status IN ('frozen', 'execution_in_progress', 'awaiting_verification')
		  AND e.verified_at IS NULL
	`, operatorContextID).Scan(&unverifiedEvidence); err != nil {
		return nil, err
	}
	if unverifiedEvidence > 0 {
		return nil, fmt.Errorf("cannot close day: %d manual transfers are executed but not independently verified", unverifiedEvidence)
	}

	// Verified execution that has not been carried into the ledger is money
	// that left an official wallet without a completed payout behind it.
	var verifiedButIncomplete int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM wlt_manual_transfer_evidence e
		JOIN wlt_approved_payout_snapshots s ON s.id = e.approved_snapshot_id
		JOIN wlt_payout_requests p ON p.id = s.payout_request_id AND p.operator_context_id = s.operator_context_id
		WHERE e.operator_context_id = $1
		  AND e.verified_at IS NOT NULL
		  AND p.status <> 'completed'
	`, operatorContextID).Scan(&verifiedButIncomplete); err != nil {
		return nil, err
	}
	if verifiedButIncomplete > 0 {
		return nil, fmt.Errorf("cannot close day: %d verified external transfers have no completed payout", verifiedButIncomplete)
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_daily_finance_close
		(business_date, operator_context_id, total_payouts_minor_units, total_cashin_minor_units, closing_balance_minor_units, closed_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING business_date, operator_context_id, total_payouts_minor_units, total_cashin_minor_units, closing_balance_minor_units, closed_by_operator_id, closed_at
	`, date.Format("2006-01-02"), operatorContextID, totalPayouts, totalCashin, closingBalance, input.OperatorID)

	var closeRecord DailyFinanceClose
	var bDate time.Time
	if err := row.Scan(
		&bDate,
		&closeRecord.OperatorContextID,
		&closeRecord.TotalPayoutsMinorUnits,
		&closeRecord.TotalCashinMinorUnits,
		&closeRecord.ClosingBalanceMinorUnits,
		&closeRecord.ClosedByOperatorID,
		&closeRecord.ClosedAt,
	); err != nil {
		return nil, err
	}
	closeRecord.BusinessDate = bDate.Format("2006-01-02")

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_finance_audit_events
		(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, correlation_id, metadata)
		VALUES ($1, 'daily_close', $2, 'finance_day_closed', $3, 'operator', $4,
		jsonb_build_object('totalPayouts', $5::bigint, 'totalCashin', $6::bigint, 'closingBalance', $7::bigint))
	`, operatorContextID, closeRecord.BusinessDate, input.OperatorID, correlationID, totalPayouts, totalCashin, closingBalance); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &closeRecord, nil
}

func HandleExecuteDailyFinanceClose(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ExecuteDailyCloseInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		closeRec, err := ExecuteDailyFinanceClose(r.Context(), db, input, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			shared.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"financeClose": closeRec})
	}
}
