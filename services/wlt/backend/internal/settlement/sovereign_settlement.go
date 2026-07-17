package settlement

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var ErrSettlementCalculationSourceRequired = errors.New("settlement must be calculated from a governed DSH order source")

// HandleCreateSettlementSovereign prevents caller-supplied gross/net values
// from becoming financial truth. Until DSH supplies a governed order-derived
// calculation contract, the live creation route fails closed rather than
// accepting editable numbers from a UI or arbitrary service request.
func HandleCreateSettlementSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = db
		_ = r
		shared.SendError(w, http.StatusConflict, "SETTLEMENT_SOURCE_REQUIRED", ErrSettlementCalculationSourceRequired.Error())
	}
}

// PostSettlementSovereign posts the approved gross settlement as a balanced
// multi-line journal: clear the platform payable, credit the partner wallet for
// net proceeds and recognize the platform fee as revenue. State and journal
// commit together.
func PostSettlementSovereign(ctx context.Context, db *sql.DB, settlementID string) (*Settlement, error) {
	if settlementID == "" {
		return nil, fmt.Errorf("settlementId is required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_settlements
		SET status = 'settled', settled_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status != 'settled'
		RETURNING `+settlementCols, settlementID)
	settlement, err := scanSettlement(row)
	if err == sql.ErrNoRows {
		var status string
		getErr := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlements WHERE id = $1`, settlementID).Scan(&status)
		if errors.Is(getErr, sql.ErrNoRows) {
			return nil, nil
		}
		if getErr != nil {
			return nil, getErr
		}
		return nil, ErrAlreadySettled
	}
	if err != nil {
		return nil, err
	}
	if settlement.GrossAmount != settlement.NetAmount+settlement.PlatformFee || settlement.GrossAmount < 0 || settlement.NetAmount < 0 || settlement.PlatformFee < 0 {
		return nil, ErrSettlementAmountsInconsistent
	}

	if settlement.GrossAmount > 0 {
		lines := []ledger.LedgerLine{
			{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: settlement.GrossAmount, Currency: settlement.Currency},
		}
		if settlement.NetAmount > 0 {
			lines = append(lines, ledger.LedgerLine{
				AccountType: "wallet", ActorType: "partner", ActorID: settlement.PartnerID,
				DebitCredit: "credit", AmountMinorUnits: settlement.NetAmount, Currency: settlement.Currency,
			})
		}
		if settlement.PlatformFee > 0 {
			lines = append(lines, ledger.LedgerLine{
				AccountType: "platform_revenue", DebitCredit: "credit",
				AmountMinorUnits: settlement.PlatformFee, Currency: settlement.Currency,
			})
		}
		if _, err := ledger.PostLedgerTransaction(ctx, tx, "settlement_posted", "settlement", settlement.ID, lines, ledger.Actor{ID: "wlt", Type: "service"}); err != nil {
			return nil, fmt.Errorf("post settlement journal: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return settlement, nil
}

func HandlePostSettlementSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		settlement, err := PostSettlementSovereign(r.Context(), db, r.PathValue("settlementId"))
		if errors.Is(err, ErrAlreadySettled) {
			shared.SendError(w, http.StatusConflict, "ALREADY_SETTLED", "settlement has already been posted")
			return
		}
		if errors.Is(err, ErrSettlementAmountsInconsistent) {
			shared.SendError(w, http.StatusConflict, "AMOUNTS_INCONSISTENT", "settlement gross, fee and net amounts are inconsistent")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if settlement == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "settlement not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlement": settlement})
	}
}
