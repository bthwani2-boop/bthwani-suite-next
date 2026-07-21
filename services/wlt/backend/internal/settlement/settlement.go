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

var ErrAlreadySettled = errors.New("settlement is already settled")
var ErrSettlementAmountsInconsistent = errors.New("settlement amounts are not arithmetically consistent")
var ErrSettlementCalculationSourceRequired = errors.New("settlement must be calculated from a governed DSH order source")

type Settlement struct {
	ID          string  `json:"id"`
	PartnerID   string  `json:"partnerId"`
	PeriodStart string  `json:"periodStart"`
	PeriodEnd   string  `json:"periodEnd"`
	GrossAmount int64   `json:"grossAmount"`
	PlatformFee int64   `json:"platformFee"`
	NetAmount   int64   `json:"netAmount"`
	Currency    string  `json:"currency"`
	OrderCount  int     `json:"orderCount"`
	Status      string  `json:"status"`
	SettledAt   *string `json:"settledAt"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type SettlementSummary struct {
	PartnerID       string `json:"partnerId"`
	PeriodStart     string `json:"periodStart"`
	PeriodEnd       string `json:"periodEnd"`
	TotalGross      int64  `json:"totalGross"`
	TotalFee        int64  `json:"totalFee"`
	TotalNet        int64  `json:"totalNet"`
	TotalOrders     int    `json:"totalOrders"`
	SettlementCount int    `json:"settlementCount"`
	Currency        string `json:"currency"`
}

// CreateSettlementInput remains as a compatibility contract while live
// settlement creation is fail-closed. Its monetary values must never become
// financial truth until DSH provides a governed, order-derived calculation
// contract with an immutable source reference.
type CreateSettlementInput struct {
	PartnerID   string `json:"partnerId"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	GrossAmount int64  `json:"grossAmount"`
	PlatformFee int64  `json:"platformFee"`
	NetAmount   int64  `json:"netAmount"`
	Currency    string `json:"currency"`
	OrderCount  int    `json:"orderCount"`
}

const settlementCols = `id, partner_id, period_start, period_end, gross_amount, platform_fee,
	net_amount, currency, order_count, status, settled_at, created_at, updated_at`

func scanSettlement(row *sql.Row) (*Settlement, error) {
	var s Settlement
	err := row.Scan(
		&s.ID,
		&s.PartnerID,
		&s.PeriodStart,
		&s.PeriodEnd,
		&s.GrossAmount,
		&s.PlatformFee,
		&s.NetAmount,
		&s.Currency,
		&s.OrderCount,
		&s.Status,
		&s.SettledAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func scanSettlementRow(rows *sql.Rows) (*Settlement, error) {
	var s Settlement
	err := rows.Scan(
		&s.ID,
		&s.PartnerID,
		&s.PeriodStart,
		&s.PeriodEnd,
		&s.GrossAmount,
		&s.PlatformFee,
		&s.NetAmount,
		&s.Currency,
		&s.OrderCount,
		&s.Status,
		&s.SettledAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// CreateSettlement fails closed. Caller-supplied gross, fee, net and order
// counts are not a governed financial source and therefore cannot be inserted
// into WLT as settlement truth.
func CreateSettlement(db *sql.DB, input CreateSettlementInput) (*Settlement, error) {
	_ = db
	_ = input
	return nil, ErrSettlementCalculationSourceRequired
}

func GetSettlement(db *sql.DB, settlementID string) (*Settlement, error) {
	if settlementID == "" {
		return nil, fmt.Errorf("settlementId is required")
	}
	const q = `SELECT ` + settlementCols + ` FROM wlt_settlements WHERE id = $1`
	row := db.QueryRow(q, settlementID)
	s, err := scanSettlement(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return s, err
}

func ListPartnerSettlements(db *sql.DB, partnerID string) ([]*Settlement, error) {
	var (
		rows *sql.Rows
		err  error
	)
	if partnerID == "" {
		rows, err = db.Query(`SELECT ` + settlementCols + ` FROM wlt_settlements ORDER BY period_start DESC LIMIT 50`)
	} else {
		rows, err = db.Query(`SELECT `+settlementCols+` FROM wlt_settlements WHERE partner_id = $1 ORDER BY period_start DESC`, partnerID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settlements := make([]*Settlement, 0)
	for rows.Next() {
		settlement, scanErr := scanSettlementRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		settlements = append(settlements, settlement)
	}
	return settlements, rows.Err()
}

func ListSettlementSummary(db *sql.DB, partnerID, periodStart, periodEnd string) (*SettlementSummary, error) {
	if partnerID == "" {
		return nil, fmt.Errorf("partnerId is required")
	}
	const q = `
		SELECT
			partner_id,
			MIN(period_start)::text,
			MAX(period_end)::text,
			COALESCE(SUM(gross_amount), 0),
			COALESCE(SUM(platform_fee), 0),
			COALESCE(SUM(net_amount), 0),
			COALESCE(SUM(order_count), 0),
			COUNT(*),
			MAX(currency)
		FROM wlt_settlements
		WHERE partner_id = $1
		  AND ($2 = '' OR period_start >= $2::date)
		  AND ($3 = '' OR period_end <= $3::date)`
	row := db.QueryRow(q, partnerID, periodStart, periodEnd)
	var summary SettlementSummary
	err := row.Scan(
		&summary.PartnerID,
		&summary.PeriodStart,
		&summary.PeriodEnd,
		&summary.TotalGross,
		&summary.TotalFee,
		&summary.TotalNet,
		&summary.TotalOrders,
		&summary.SettlementCount,
		&summary.Currency,
	)
	if err != nil {
		return nil, err
	}
	return &summary, nil
}

// PostSettlement moves one pending settlement to settled and posts its balanced
// journal in the same database transaction. No state transition is committed
// unless the journal succeeds.
func PostSettlement(db *sql.DB, settlementID string) (*Settlement, error) {
	return postSettlement(context.Background(), db, settlementID)
}

func postSettlement(ctx context.Context, db *sql.DB, settlementID string) (*Settlement, error) {
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
		WHERE id = $1 AND status = 'pending'
		RETURNING `+settlementCols, settlementID)
	settlement, err := scanSettlement(row)
	if errors.Is(err, sql.ErrNoRows) {
		var status string
		lookupErr := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlements WHERE id = $1`, settlementID).Scan(&status)
		if errors.Is(lookupErr, sql.ErrNoRows) {
			return nil, nil
		}
		if lookupErr != nil {
			return nil, lookupErr
		}
		if status == "settled" {
			return nil, ErrAlreadySettled
		}
		return nil, fmt.Errorf("settlement cannot be posted from status %s", status)
	}
	if err != nil {
		return nil, err
	}

	if settlement.GrossAmount < 0 || settlement.PlatformFee < 0 || settlement.NetAmount < 0 ||
		settlement.GrossAmount != settlement.NetAmount+settlement.PlatformFee || settlement.Currency == "" {
		return nil, ErrSettlementAmountsInconsistent
	}

	if settlement.GrossAmount > 0 {
		lines := []ledger.LedgerLine{
			{
				AccountType:      "platform_payable",
				DebitCredit:      "debit",
				AmountMinorUnits: settlement.GrossAmount,
				Currency:         settlement.Currency,
			},
		}
		if settlement.NetAmount > 0 {
			lines = append(lines, ledger.LedgerLine{
				AccountType:      "wallet",
				ActorType:        "partner",
				ActorID:          settlement.PartnerID,
				DebitCredit:      "credit",
				AmountMinorUnits: settlement.NetAmount,
				Currency:         settlement.Currency,
			})
		}
		if settlement.PlatformFee > 0 {
			lines = append(lines, ledger.LedgerLine{
				AccountType:      "platform_revenue",
				DebitCredit:      "credit",
				AmountMinorUnits: settlement.PlatformFee,
				Currency:         settlement.Currency,
			})
		}
		if _, err := ledger.PostLedgerTransaction(
			ctx,
			tx,
			"settlement_posted",
			"settlement",
			settlement.ID,
			lines,
			ledger.Actor{ID: "wlt", Type: "service"},
		); err != nil {
			return nil, fmt.Errorf("post settlement journal: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return settlement, nil
}

// HandleCreateSettlement intentionally ignores the submitted body and fails
// closed until a governed DSH order-derived calculation contract exists.
func HandleCreateSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = db
		_ = r
		shared.SendError(
			w,
			http.StatusConflict,
			"SETTLEMENT_SOURCE_REQUIRED",
			ErrSettlementCalculationSourceRequired.Error(),
		)
	}
}

func HandleGetSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		settlement, err := GetSettlement(db, r.PathValue("settlementId"))
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

func HandleListSettlements(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.URL.Query().Get("partnerId")
		settlements, err := ListPartnerSettlements(db, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlements": settlements})
	}
}

func HandlePostSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		settlement, err := postSettlement(r.Context(), db, r.PathValue("settlementId"))
		if errors.Is(err, ErrAlreadySettled) {
			shared.SendError(w, http.StatusConflict, "ALREADY_SETTLED", "settlement has already been posted")
			return
		}
		if errors.Is(err, ErrSettlementAmountsInconsistent) {
			shared.SendError(w, http.StatusConflict, "AMOUNTS_INCONSISTENT", "settlement gross, fee and net amounts are inconsistent")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
			return
		}
		if settlement == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "settlement not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlement": settlement})
	}
}

func HandleGetSettlementSummary(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		summary, err := ListSettlementSummary(
			db,
			query.Get("partnerId"),
			query.Get("periodStart"),
			query.Get("periodEnd"),
		)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
	}
}
