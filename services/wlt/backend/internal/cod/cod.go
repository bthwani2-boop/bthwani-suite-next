package cod

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

type CodRecord struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	CaptainID        string  `json:"captainId"`
	PartnerID        string  `json:"partnerId"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	CollectedAt      *string `json:"collectedAt"`
	RemittedAt       *string `json:"remittedAt"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type Commission struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	CaptainID        string  `json:"captainId"`
	PartnerID        string  `json:"partnerId"`
	CommissionType   string  `json:"commissionType"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	SettledAt        *string `json:"settledAt"`
	CreatedAt        string  `json:"createdAt"`
}

type CreateCodRecordInput struct {
	OrderID   string `json:"orderId"`
	CaptainID string `json:"captainId"`
	PartnerID string `json:"partnerId"`
	// CheckoutIntentID, when set, is the sole source of AmountMinorUnits/
	// Currency: WLT looks up its own payment session for that checkout intent
	// rather than trusting a caller-supplied amount. Any AmountMinorUnits/
	// Currency passed alongside CheckoutIntentID is ignored.
	CheckoutIntentID string `json:"checkoutIntentId"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
}

type CreateCommissionInput struct {
	OrderID          string `json:"orderId"`
	CaptainID        string `json:"captainId"`
	PartnerID        string `json:"partnerId"`
	CommissionType   string `json:"commissionType"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
}

const codCols = `id, order_id, captain_id, partner_id, amount_minor_units, currency,
	status, collected_at, remitted_at, created_at, updated_at`

const commissionCols = `id, order_id, captain_id, partner_id, commission_type,
	amount_minor_units, currency, status, settled_at, created_at`

func scanCodRecord(row *sql.Row) (*CodRecord, error) {
	var c CodRecord
	err := row.Scan(
		&c.ID, &c.OrderID, &c.CaptainID, &c.PartnerID,
		&c.AmountMinorUnits, &c.Currency, &c.Status,
		&c.CollectedAt, &c.RemittedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanCodRecordRow(rows *sql.Rows) (*CodRecord, error) {
	var c CodRecord
	err := rows.Scan(
		&c.ID, &c.OrderID, &c.CaptainID, &c.PartnerID,
		&c.AmountMinorUnits, &c.Currency, &c.Status,
		&c.CollectedAt, &c.RemittedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanCommission(row *sql.Row) (*Commission, error) {
	var c Commission
	err := row.Scan(
		&c.ID, &c.OrderID, &c.CaptainID, &c.PartnerID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanCommissionRow(rows *sql.Rows) (*Commission, error) {
	var c Commission
	err := rows.Scan(
		&c.ID, &c.OrderID, &c.CaptainID, &c.PartnerID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func CreateCodRecord(db *sql.DB, input CreateCodRecordInput) (*CodRecord, error) {
	if input.OrderID == "" || input.CaptainID == "" || input.PartnerID == "" {
		return nil, fmt.Errorf("orderId, captainId, and partnerId are required")
	}

	existing, err := getCodRecordByOrder(db, input.OrderID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	amountMinorUnits := input.AmountMinorUnits
	currency := input.Currency
	if input.CheckoutIntentID != "" {
		session, err := reference.GetPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
		if err != nil {
			return nil, err
		}
		if session == nil {
			return nil, fmt.Errorf("no WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
		}
		if session.PaymentMethod != "cod" {
			return nil, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
		}
		amountMinorUnits = session.AmountMinorUnits
		currency = session.Currency
	}
	if currency == "" {
		currency = "YER"
	}

	const q = `
		INSERT INTO wlt_cod_records (order_id, captain_id, partner_id, amount_minor_units, currency)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING ` + codCols
	row := db.QueryRow(q, input.OrderID, input.CaptainID, input.PartnerID, amountMinorUnits, currency)
	return scanCodRecord(row)
}

func getCodRecordByOrder(db *sql.DB, orderID string) (*CodRecord, error) {
	const q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE order_id = $1`
	c, err := scanCodRecord(db.QueryRow(q, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

func GetCodRecord(db *sql.DB, codRecordID string) (*CodRecord, error) {
	if codRecordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	const q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE id = $1`
	row := db.QueryRow(q, codRecordID)
	c, err := scanCodRecord(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func ListCodRecords(db *sql.DB, captainID, partnerID string) ([]*CodRecord, error) {
	var q string
	var arg string
	if captainID != "" {
		q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE captain_id = $1 ORDER BY created_at DESC`
		arg = captainID
	} else if partnerID != "" {
		q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE partner_id = $1 ORDER BY created_at DESC`
		arg = partnerID
	} else {
		return nil, fmt.Errorf("captainId or partnerId query parameter is required")
	}
	rows, err := db.Query(q, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var records []*CodRecord
	for rows.Next() {
		c, err := scanCodRecordRow(rows)
		if err != nil {
			return nil, err
		}
		records = append(records, c)
	}
	return records, rows.Err()
}

func MarkCodCollected(db *sql.DB, codRecordID string) (*CodRecord, error) {
	if codRecordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	const q = `
		UPDATE wlt_cod_records
		SET status = 'collected', collected_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING ` + codCols
	row := db.QueryRow(q, codRecordID)
	c, err := scanCodRecord(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func MarkCodRemitted(db *sql.DB, codRecordID string) (*CodRecord, error) {
	if codRecordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	const q = `
		UPDATE wlt_cod_records
		SET status = 'remitted', remitted_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING ` + codCols
	row := db.QueryRow(q, codRecordID)
	c, err := scanCodRecord(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func CreateCommission(db *sql.DB, input CreateCommissionInput) (*Commission, error) {
	if input.OrderID == "" || input.CaptainID == "" || input.PartnerID == "" {
		return nil, fmt.Errorf("orderId, captainId, and partnerId are required")
	}
	commType := input.CommissionType
	if commType == "" {
		commType = "delivery_fee"
	}
	currency := input.Currency
	if currency == "" {
		currency = "YER"
	}
	if input.AmountMinorUnits <= 0 {
		return nil, fmt.Errorf("amountMinorUnits must be a positive integer")
	}
	const q = `
		INSERT INTO wlt_commissions
			(order_id, captain_id, partner_id, commission_type, amount_minor_units, currency)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + commissionCols
	row := db.QueryRow(q, input.OrderID, input.CaptainID, input.PartnerID, commType, input.AmountMinorUnits, currency)
	return scanCommission(row)
}

func ListCommissions(db *sql.DB, orderID, captainID string) ([]*Commission, error) {
	var q string
	var arg string
	if orderID != "" {
		q = `SELECT ` + commissionCols + ` FROM wlt_commissions WHERE order_id = $1 ORDER BY created_at DESC`
		arg = orderID
	} else if captainID != "" {
		q = `SELECT ` + commissionCols + ` FROM wlt_commissions WHERE captain_id = $1 ORDER BY created_at DESC`
		arg = captainID
	} else {
		return nil, fmt.Errorf("orderId or captainId query parameter is required")
	}
	rows, err := db.Query(q, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var commissions []*Commission
	for rows.Next() {
		c, err := scanCommissionRow(rows)
		if err != nil {
			return nil, err
		}
		commissions = append(commissions, c)
	}
	return commissions, rows.Err()
}

// HTTP handlers

// requireDshServiceCaller enforces that only the DSH service -- never an
// end-user actor -- may create COD/commission mutation records.
func requireDshServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh")
}

func HandleCreateCodRecord(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreateCodRecordInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		c, err := CreateCodRecord(db, input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"codRecord": c})
	}
}

func HandleGetCodRecord(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := GetCodRecord(db, r.PathValue("codRecordId"))
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

func HandleListCodRecords(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		records, err := ListCodRecords(db, q.Get("captainId"), q.Get("partnerId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if records == nil {
			records = []*CodRecord{}
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codRecords": records})
	}
}

func HandleCollectCod(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := MarkCodCollected(db, r.PathValue("codRecordId"))
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

func HandleRemitCod(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := MarkCodRemitted(db, r.PathValue("codRecordId"))
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

func HandleCreateCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreateCommissionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		c, err := CreateCommission(db, input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"commission": c})
	}
}

func HandleListCommissions(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		commissions, err := ListCommissions(db, q.Get("orderId"), q.Get("captainId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if commissions == nil {
			commissions = []*Commission{}
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"commissions": commissions})
	}
}
