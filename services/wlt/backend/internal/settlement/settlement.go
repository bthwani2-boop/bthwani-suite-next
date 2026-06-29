package settlement

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

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

func CreateSettlement(db *sql.DB, input CreateSettlementInput) (*Settlement, error) {
	if input.PartnerID == "" || input.PeriodStart == "" || input.PeriodEnd == "" {
		return nil, fmt.Errorf("partnerId, periodStart, and periodEnd are required")
	}
	currency := input.Currency
	if currency == "" {
		currency = "YER"
	}
	const q = `
		INSERT INTO wlt_settlements
			(partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + settlementCols
	row := db.QueryRow(q, input.PartnerID, input.PeriodStart, input.PeriodEnd,
		input.GrossAmount, input.PlatformFee, input.NetAmount, currency, input.OrderCount)
	return scanSettlement(row)
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
	if partnerID == "" {
		return nil, fmt.Errorf("partnerId query parameter is required")
	}
	const q = `SELECT ` + settlementCols + ` FROM wlt_settlements WHERE partner_id = $1 ORDER BY period_start DESC`
	rows, err := db.Query(q, partnerID)
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
	const q = `
		UPDATE wlt_settlements
		SET status = 'settled', settled_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING ` + settlementCols
	row := db.QueryRow(q, settlementID)
	s, err := scanSettlement(row)
	if err == sql.ErrNoRows {
		return nil, nil
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
