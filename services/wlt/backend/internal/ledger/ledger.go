package ledger

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"wlt-api/internal/shared"
)

// LedgerEntry is the stable API projection for a canonical wallet ledger line.
// It is populated from wlt_ledger_transactions / wlt_ledger_lines /
// wlt_ledger_accounts only. The legacy wlt_ledger_entries table is historical
// storage and is deliberately not part of current financial readback.
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

const canonicalLedgerEntryColumns = `
	l.id,
	t.transaction_type,
	COALESCE(a.actor_id, ''),
	COALESCE(a.actor_type, ''),
	t.reference_type,
	t.reference_id,
	CASE WHEN t.reference_type IN ('order', 'order_id') THEN t.reference_id ELSE NULL END,
	l.amount_minor_units,
	l.currency,
	l.debit_credit,
	CASE
	  WHEN a.account_type = 'wallet' THEN -l.running_balance_after
	  ELSE l.running_balance_after
	END,
	t.transaction_type,
	l.created_at::text`

type canonicalLedgerScanner interface {
	Scan(dest ...any) error
}

func scanCanonicalLedgerEntry(row canonicalLedgerScanner) (*LedgerEntry, error) {
	var entry LedgerEntry
	var orderID sql.NullString
	err := row.Scan(
		&entry.ID,
		&entry.EntryType,
		&entry.ActorID,
		&entry.ActorType,
		&entry.SourceType,
		&entry.SourceID,
		&orderID,
		&entry.AmountMinorUnits,
		&entry.Currency,
		&entry.DebitCredit,
		&entry.BalanceAfter,
		&entry.Description,
		&entry.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	entry.ReferenceType = entry.SourceType
	entry.ReferenceID = entry.SourceID
	if orderID.Valid {
		entry.OrderID = &orderID.String
	}
	return &entry, nil
}

func GetLedgerEntryForOperatorContext(ctx context.Context, db *sql.DB, entryID string) (*LedgerEntry, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	entryID = strings.TrimSpace(entryID)
	if entryID == "" {
		return nil, fmt.Errorf("entryId is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT `+canonicalLedgerEntryColumns+`
		FROM wlt_ledger_lines l
		JOIN wlt_ledger_transactions t
		  ON t.id = l.ledger_transaction_id
		 AND t.operator_context_id = l.operator_context_id
		JOIN wlt_ledger_accounts a
		  ON a.id = l.account_id
		 AND a.operator_context_id = l.operator_context_id
		WHERE l.operator_context_id = $1
		  AND l.id = $2
		  AND a.account_type = 'wallet'`,
		operatorContextID, entryID,
	)
	entry, err := scanCanonicalLedgerEntry(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get canonical ledger entry: %w", err)
	}
	return entry, nil
}

type ListLedgerEntriesParams struct {
	ActorID   string
	ActorType string
	OrderID   string
	EntryType string
	Limit     int
	Cursor    string
}

// ListLedgerEntries returns canonical wallet lines only. System-account
// counterpart lines remain available through FinancialSummary; exposing only
// wallet legs here preserves the actor-ledger API while eliminating the legacy
// single-entry table as current authority.
func ListLedgerEntries(ctx context.Context, db *sql.DB, params ListLedgerEntriesParams) ([]*LedgerEntry, string, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, "", err
	}
	limit := params.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	q := `
		SELECT ` + canonicalLedgerEntryColumns + `
		FROM wlt_ledger_lines l
		JOIN wlt_ledger_transactions t
		  ON t.id = l.ledger_transaction_id
		 AND t.operator_context_id = l.operator_context_id
		JOIN wlt_ledger_accounts a
		  ON a.id = l.account_id
		 AND a.operator_context_id = l.operator_context_id
		WHERE l.operator_context_id = $1
		  AND a.account_type = 'wallet'`
	args := []any{operatorContextID}
	idx := 2

	if actorID := strings.TrimSpace(params.ActorID); actorID != "" {
		q += fmt.Sprintf(" AND a.actor_id = $%d", idx)
		args = append(args, actorID)
		idx++
	}
	if actorType := strings.TrimSpace(params.ActorType); actorType != "" {
		q += fmt.Sprintf(" AND a.actor_type = $%d", idx)
		args = append(args, actorType)
		idx++
	}
	if orderID := strings.TrimSpace(params.OrderID); orderID != "" {
		q += fmt.Sprintf(" AND t.reference_id = $%d", idx)
		args = append(args, orderID)
		idx++
	}
	if entryType := strings.TrimSpace(params.EntryType); entryType != "" {
		q += fmt.Sprintf(" AND t.transaction_type = $%d", idx)
		args = append(args, entryType)
		idx++
	}
	if cursor := strings.TrimSpace(params.Cursor); cursor != "" {
		q += fmt.Sprintf(` AND (l.created_at, l.id) < (
			SELECT c.created_at, c.id
			FROM wlt_ledger_lines c
			WHERE c.operator_context_id = $1 AND c.id = $%d
		)`, idx)
		args = append(args, cursor)
		idx++
	}

	q += fmt.Sprintf(" ORDER BY l.created_at DESC, l.id DESC LIMIT $%d", idx)
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, "", fmt.Errorf("list canonical ledger entries: %w", err)
	}
	defer rows.Close()

	entries := make([]*LedgerEntry, 0, limit+1)
	for rows.Next() {
		entry, err := scanCanonicalLedgerEntry(rows)
		if err != nil {
			return nil, "", err
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if len(entries) > limit {
		entries = entries[:limit]
		nextCursor = entries[len(entries)-1].ID
	}
	return entries, nextCursor, nil
}

func HandleGetLedgerEntry(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entry, err := GetLedgerEntryForOperatorContext(r.Context(), db, r.PathValue("entryId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if entry == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "ledger entry not found")
			return
		}
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		shared.SendJSON(w, http.StatusOK, map[string]any{"ledgerEntry": entry})
	}
}

func HandleListLedgerEntries(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		limit := 50
		if raw := q.Get("limit"); raw != "" {
			if n, err := strconv.Atoi(raw); err == nil {
				limit = n
			}
		}
		entries, nextCursor, err := ListLedgerEntries(r.Context(), db, ListLedgerEntriesParams{
			ActorID:   q.Get("actorId"),
			ActorType: q.Get("actorType"),
			OrderID:   q.Get("orderId"),
			EntryType: q.Get("entryType"),
			Limit:     limit,
			Cursor:    q.Get("cursor"),
		})
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		response := map[string]any{"ledgerEntries": entries}
		if nextCursor != "" {
			response["nextCursor"] = nextCursor
		}
		shared.SendJSON(w, http.StatusOK, response)
	}
}
