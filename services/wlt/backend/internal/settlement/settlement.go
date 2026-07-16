package settlement

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

// ErrAlreadySettled is returned when PostSettlement is called on a
// settlement that is already in the 'settled' state (double-post).
var ErrAlreadySettled = errors.New("settlement is already settled")

// ErrSettlementAmountsInconsistent is returned when the caller-supplied
// grossAmount/platformFee/netAmount don't arithmetically agree
// (netAmount must equal grossAmount - platformFee) or contain a negative
// value. This does NOT verify the amounts against the partner's actual
// orders/commissions -- that would require aggregating DSH-side order data
// that isn't present in WLT's database, and remains a known gap (see the
// comment on CreateSettlement). It only catches an internally-inconsistent
// or obviously-tampered request before it's persisted as financial truth.
var ErrSettlementAmountsInconsistent = errors.New("settlement amounts are not arithmetically consistent")

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

// CreateSettlement inserts a settlement record and, in the same
// transaction, posts a balanced ledger transaction (debit platform_revenue,
// credit the partner's wallet account) so the settlement is reflected in the
// double-entry ledger kernel rather than being an isolated row.
//
// KNOWN GAP: grossAmount/platformFee/netAmount/orderCount are still supplied
// by the caller, not derived from the partner's actual orders/commissions --
// full derivation would require aggregating DSH-side order data that is not
// present in WLT's database (WLT only has commission records, not gross
// order totals), which is a larger cross-service initiative. This function
// only rejects internally-inconsistent input (netAmount != grossAmount -
// platformFee, or any negative amount) as a narrower, achievable guard
// against obviously wrong or tampered values.
func CreateSettlement(db *sql.DB, input CreateSettlementInput) (*Settlement, error) {
	if input.PartnerID == "" || input.PeriodStart == "" || input.PeriodEnd == "" {
		return nil, fmt.Errorf("partnerId, periodStart, and periodEnd are required")
	}
	if input.GrossAmount < 0 || input.PlatformFee < 0 || input.NetAmount < 0 {
		return nil, ErrSettlementAmountsInconsistent
	}
	if input.NetAmount != input.GrossAmount-input.PlatformFee {
		return nil, ErrSettlementAmountsInconsistent
	}
	currency := input.Currency
	if currency == "" {
		currency = "YER"
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	const q = `
		INSERT INTO wlt_settlements
			(partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + settlementCols
	row := tx.QueryRow(q, input.PartnerID, input.PeriodStart, input.PeriodEnd,
		input.GrossAmount, input.PlatformFee, input.NetAmount, currency, input.OrderCount)
	s, err := scanSettlement(row)
	if err != nil {
		return nil, err
	}

	if s.NetAmount > 0 {
		lines := []ledger.LedgerLine{
			{AccountType: "platform_revenue", DebitCredit: "debit", AmountMinorUnits: s.NetAmount, Currency: currency},
			{AccountType: "wallet", ActorType: "partner", ActorID: s.PartnerID, DebitCredit: "credit", AmountMinorUnits: s.NetAmount, Currency: currency},
		}
		if _, err := ledger.PostLedgerTransaction(context.Background(), tx, "settlement_posted", "settlement", s.ID, lines, ledger.Actor{ID: "system", Type: "system"}); err != nil {
			return nil, fmt.Errorf("post settlement ledger transaction: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s, nil
}

func GetSettlement(db *sql.DB, settlementID string) (*Settlement, error) {
	if settlementID == "" {
		return nil, fmt.Errorf("settlementId is required")
	}
	const q = `SELECT ` + settlementCols + ` FROM wlt_settlements WHERE id = $1`
	row := db.QueryRow(q, settlementID)
	s, err := scanSettlement(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func ListPartnerSettlements(db *sql.DB, partnerID string) ([]*Settlement, error) {
	var q string
	var rows *sql.Rows
	var err error
	if partnerID == "" {
		q = `SELECT ` + settlementCols + ` FROM wlt_settlements ORDER BY period_start DESC LIMIT 50`
		rows, err = db.Query(q)
	} else {
		q = `SELECT ` + settlementCols + ` FROM wlt_settlements WHERE partner_id = $1 ORDER BY period_start DESC`
		rows, err = db.Query(q, partnerID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var settlements []*Settlement
	for rows.Next() {
		s, err := scanSettlementRow(rows)
		if err != nil {
			return nil, err
		}
		settlements = append(settlements, s)
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

func PostSettlement(db *sql.DB, settlementID string) (*Settlement, error) {
	if settlementID == "" {
		return nil, fmt.Errorf("settlementId is required")
	}
	existing, err := GetSettlement(db, settlementID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	const q = `
		UPDATE wlt_settlements
		SET status = 'settled', settled_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status != 'settled'
		RETURNING ` + settlementCols
	row := db.QueryRow(q, settlementID)
	s, err := scanSettlement(row)
	if err == sql.ErrNoRows {
		return nil, ErrAlreadySettled
	}
	return s, err
}

// HTTP handlers

func HandleCreateSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateSettlementInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		s, err := CreateSettlement(db, input)
		if errors.Is(err, ErrSettlementAmountsInconsistent) {
			shared.SendError(w, http.StatusBadRequest, "AMOUNTS_INCONSISTENT", "netAmount must equal grossAmount - platformFee, and no amount may be negative")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"settlement": s})
	}
}

func HandleGetSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s, err := GetSettlement(db, r.PathValue("settlementId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if s == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "settlement not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlement": s})
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
		if settlements == nil {
			settlements = []*Settlement{}
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlements": settlements})
	}
}

func HandlePostSettlement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s, err := PostSettlement(db, r.PathValue("settlementId"))
		if errors.Is(err, ErrAlreadySettled) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "settlement is already settled")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if s == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "settlement not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlement": s})
	}
}

func HandleGetSettlementSummary(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		partnerID := q.Get("partnerId")
		periodStart := q.Get("periodStart")
		periodEnd := q.Get("periodEnd")
		summary, err := ListSettlementSummary(db, partnerID, periodStart, periodEnd)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
	}
}
