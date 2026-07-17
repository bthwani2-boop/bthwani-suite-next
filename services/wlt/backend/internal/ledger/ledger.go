package ledger

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"wlt-api/internal/shared"
)

type LedgerEntry struct {
	ID                string  `json:"id"`
	EntryType         string  `json:"entryType"`
	ActorID           string  `json:"actorId"`
	ActorType         string  `json:"actorType"`
	SourceType        string  `json:"sourceType"`
	SourceID          string  `json:"sourceId"`
	OrderID           *string `json:"orderId"`
	VisitID           *string `json:"visitId"`
	StoreID           *string `json:"storeId"`
	PartnerID         *string `json:"partnerId"`
	CommissionEventID *string `json:"commissionEventId"`
	ReferenceID       string  `json:"referenceId"`
	ReferenceType     string  `json:"referenceType"`
	AmountMinorUnits  int64   `json:"amountMinorUnits"`
	Currency          string  `json:"currency"`
	DebitCredit       string  `json:"debitCredit"`
	BalanceAfter      int64   `json:"balanceAfter"`
	Description       string  `json:"description"`
	IdempotencyKey    *string `json:"idempotencyKey"`
	CreatedAt         string  `json:"createdAt"`
}

type CreateLedgerEntryInput struct {
	EntryType         string  `json:"entryType"`
	ActorID           string  `json:"actorId"`
	ActorType         string  `json:"actorType"`
	SourceType        string  `json:"sourceType"`
	SourceID          string  `json:"sourceId"`
	OrderID           *string `json:"orderId"`
	VisitID           *string `json:"visitId"`
	StoreID           *string `json:"storeId"`
	PartnerID         *string `json:"partnerId"`
	CommissionEventID *string `json:"commissionEventId"`
	ReferenceID       string  `json:"referenceId"`
	ReferenceType     string  `json:"referenceType"`
	AmountMinorUnits  int64   `json:"amountMinorUnits"`
	Currency          string  `json:"currency"`
	DebitCredit       string  `json:"debitCredit"`
	BalanceAfter      int64   `json:"balanceAfter"`
	Description       string  `json:"description"`
	IdempotencyKey    *string `json:"idempotencyKey"`
}

const ledgerCols = `id, entry_type, actor_id, actor_type, source_type, source_id, order_id, visit_id, store_id, partner_id, commission_event_id, reference_id,
	reference_type, amount_minor_units, currency, debit_credit, balance_after, description, idempotency_key, created_at`

func scanEntry(row *sql.Row) (*LedgerEntry, error) {
	var e LedgerEntry
	err := row.Scan(
		&e.ID, &e.EntryType, &e.ActorID, &e.ActorType, &e.SourceType, &e.SourceID, &e.OrderID, &e.VisitID, &e.StoreID, &e.PartnerID, &e.CommissionEventID,
		&e.ReferenceID, &e.ReferenceType, &e.AmountMinorUnits, &e.Currency,
		&e.DebitCredit, &e.BalanceAfter, &e.Description, &e.IdempotencyKey, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func scanEntryRow(rows *sql.Rows) (*LedgerEntry, error) {
	var e LedgerEntry
	err := rows.Scan(
		&e.ID, &e.EntryType, &e.ActorID, &e.ActorType, &e.SourceType, &e.SourceID, &e.OrderID, &e.VisitID, &e.StoreID, &e.PartnerID, &e.CommissionEventID,
		&e.ReferenceID, &e.ReferenceType, &e.AmountMinorUnits, &e.Currency,
		&e.DebitCredit, &e.BalanceAfter, &e.Description, &e.IdempotencyKey, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func AppendLedgerEntry(db *sql.DB, input CreateLedgerEntryInput) (*LedgerEntry, error) {
	if input.EntryType == "" || input.ActorID == "" || input.SourceType == "" || input.SourceID == "" {
		return nil, fmt.Errorf("entryType, actorId, sourceType, and sourceId are required")
	}
	actorType := input.ActorType
	if actorType == "" {
		actorType = "system"
	}
	currency := input.Currency
	if currency == "" {
		currency = "YER"
	}
	debitCredit := input.DebitCredit
	if debitCredit == "" {
		debitCredit = "debit"
	}
	const q = `
		INSERT INTO wlt_ledger_entries
			(entry_type, actor_id, actor_type, source_type, source_id, order_id, visit_id, store_id, partner_id, commission_event_id, reference_id, reference_type,
			 amount_minor_units, currency, debit_credit, balance_after, description, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING ` + ledgerCols
	row := db.QueryRow(q,
		input.EntryType, input.ActorID, actorType, input.SourceType, input.SourceID, input.OrderID, input.VisitID, input.StoreID, input.PartnerID, input.CommissionEventID,
		input.ReferenceID, input.ReferenceType,
		input.AmountMinorUnits, currency, debitCredit,
		input.BalanceAfter, input.Description, input.IdempotencyKey,
	)
	return scanEntry(row)
}

func GetLedgerEntry(db *sql.DB, entryID string) (*LedgerEntry, error) {
	if entryID == "" {
		return nil, fmt.Errorf("entryId is required")
	}
	const q = `SELECT ` + ledgerCols + ` FROM wlt_ledger_entries WHERE id = $1`
	row := db.QueryRow(q, entryID)
	e, err := scanEntry(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return e, err
}

type ListLedgerEntriesParams struct {
	ActorID   string
	ActorType string
	OrderID   string
	EntryType string
	Limit     int
	Cursor    string
}

func ListLedgerEntries(db *sql.DB, params ListLedgerEntriesParams) ([]*LedgerEntry, error) {
	limit := params.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	q := `SELECT ` + ledgerCols + ` FROM wlt_ledger_entries WHERE 1=1`
	args := []any{}
	idx := 1

	if params.ActorID != "" {
		q += fmt.Sprintf(" AND actor_id = $%d", idx)
		args = append(args, params.ActorID)
		idx++
	}
	if params.ActorType != "" {
		q += fmt.Sprintf(" AND actor_type = $%d", idx)
		args = append(args, params.ActorType)
		idx++
	}
	if params.OrderID != "" {
		q += fmt.Sprintf(" AND order_id = $%d", idx)
		args = append(args, params.OrderID)
		idx++
	}
	if params.EntryType != "" {
		q += fmt.Sprintf(" AND entry_type = $%d", idx)
		args = append(args, params.EntryType)
		idx++
	}
	if params.Cursor != "" {
		q += fmt.Sprintf(" AND created_at < (SELECT created_at FROM wlt_ledger_entries WHERE id = $%d)", idx)
		args = append(args, params.Cursor)
		idx++
	}

	q += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", idx)
	args = append(args, limit)

	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*LedgerEntry
	for rows.Next() {
		e, err := scanEntryRow(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// HTTP handlers

func HandleAppendLedgerEntry(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateLedgerEntryInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		e, err := AppendLedgerEntry(db, input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"ledgerEntry": e})
	}
}

func HandleGetLedgerEntry(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		e, err := GetLedgerEntry(db, r.PathValue("entryId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if e == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "ledger entry not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"ledgerEntry": e})
	}
}

func HandleListLedgerEntries(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		limit := 50
		if l := q.Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil {
				limit = n
			}
		}
		params := ListLedgerEntriesParams{
			ActorID:   q.Get("actorId"),
			ActorType: q.Get("actorType"),
			OrderID:   q.Get("orderId"),
			EntryType: q.Get("entryType"),
			Limit:     limit,
			Cursor:    q.Get("cursor"),
		}
		entries, err := ListLedgerEntries(db, params)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if entries == nil {
			entries = []*LedgerEntry{}
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"ledgerEntries": entries})
	}
}
