package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/ledger"
	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
	"wlt-api/internal/wallet"
)

type Commission struct {
	ID                   string  `json:"id"`
	BeneficiaryActorID   string  `json:"beneficiaryActorId"`
	BeneficiaryActorType string  `json:"beneficiaryActorType"`
	SourceType           string  `json:"sourceType"`
	SourceID             string  `json:"sourceId"`
	VisitID              *string `json:"visitId"`
	StoreID              *string `json:"storeId"`
	CommissionPolicyID   *string `json:"commissionPolicyId"`
	CommissionType       string  `json:"commissionType"`
	AmountMinorUnits     int64   `json:"amountMinorUnits"`
	Currency             string  `json:"currency"`
	Status               string  `json:"status"`
	SettledAt            *string `json:"settledAt"`
	ConfirmedAt          *string `json:"confirmedAt"`
	RejectedAt           *string `json:"rejectedAt"`
	ReversedAt           *string `json:"reversedAt"`
	ResolutionNote       string  `json:"resolutionNote"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
}

type CreateCommissionInput struct {
	BeneficiaryActorID   string  `json:"beneficiaryActorId"`
	BeneficiaryActorType string  `json:"beneficiaryActorType"`
	SourceType           string  `json:"sourceType"`
	SourceID             string  `json:"sourceId"`
	VisitID              *string `json:"visitId"`
	StoreID              *string `json:"storeId"`
	CommissionType       string  `json:"commissionType"`
	AmountMinorUnits     int64   `json:"amountMinorUnits"`
	Currency             string  `json:"currency"`
	IdempotencyKey       string  `json:"idempotencyKey"`
	// CheckoutIntentID can still be passed for order commissions
	CheckoutIntentID string `json:"checkoutIntentId"`
}

const commissionCols = `id, beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, visit_id, store_id, commission_policy_id, commission_type,
	amount_minor_units, currency, status, settled_at, confirmed_at, rejected_at, reversed_at, resolution_note, created_at, updated_at`

func scanCommission(row *sql.Row) (*Commission, error) {
	var c Commission
	var resolutionNote sql.NullString
	err := row.Scan(
		&c.ID, &c.BeneficiaryActorID, &c.BeneficiaryActorType,
		&c.SourceType, &c.SourceID, &c.VisitID, &c.StoreID, &c.CommissionPolicyID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.ConfirmedAt, &c.RejectedAt, &c.ReversedAt, &resolutionNote,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.ResolutionNote = resolutionNote.String
	return &c, nil
}

func scanCommissionRow(rows *sql.Rows) (*Commission, error) {
	var c Commission
	var resolutionNote sql.NullString
	err := rows.Scan(
		&c.ID, &c.BeneficiaryActorID, &c.BeneficiaryActorType,
		&c.SourceType, &c.SourceID, &c.VisitID, &c.StoreID, &c.CommissionPolicyID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.ConfirmedAt, &c.RejectedAt, &c.ReversedAt, &resolutionNote,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.ResolutionNote = resolutionNote.String
	return &c, nil
}

// ErrNoActiveCommissionPolicy is returned when a field-visit commission is
// requested but no active 'field_visit_fee' policy exists in
// wlt_commission_policies. The HTTP handler maps this to 503 -- the caller
// (DSH's outbox worker) should retry once a policy is configured, rather
// than the amount silently falling back to caller-supplied/zero.
var ErrNoActiveCommissionPolicy = errors.New("no active commission policy found")

// ErrUnsupportedCommissionCalculation is returned when an active policy is
// found but its calculation_type isn't one we know how to apply yet (only
// 'fixed' is implemented). Guessing a percentage/tiered formula here would
// silently mis-pay a real person, so we reject instead.
var ErrUnsupportedCommissionCalculation = errors.New("commission policy calculation_type is not supported")

type commissionPolicy struct {
	ID               string
	CommissionType   string
	CalculationType  string
	AmountMinorUnits int64
	Currency         string
}

func getActiveCommissionPolicy(db interface {
	QueryRow(query string, args ...any) *sql.Row
}, commissionType string) (*commissionPolicy, error) {
	const q = `
		SELECT id, commission_type, calculation_type, amount_minor_units, currency
		FROM wlt_commission_policies
		WHERE commission_type = $1 AND status = 'active'
		ORDER BY updated_at DESC
		LIMIT 1`
	var p commissionPolicy
	err := db.QueryRow(q, commissionType).Scan(&p.ID, &p.CommissionType, &p.CalculationType, &p.AmountMinorUnits, &p.Currency)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func getCommissionByIdempotencyKeyTx(tx *sql.Tx, idempotencyKey string) (*Commission, error) {
	const q = `SELECT ` + commissionCols + ` FROM wlt_commissions WHERE idempotency_key = $1`
	c, err := scanCommission(tx.QueryRow(q, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

func CreateCommission(db *sql.DB, input CreateCommissionInput) (*Commission, error) {
	if input.BeneficiaryActorID == "" || input.BeneficiaryActorType == "" || input.SourceType == "" || input.SourceID == "" {
		return nil, fmt.Errorf("beneficiaryActorId, beneficiaryActorType, sourceType, sourceId are required")
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Idempotency check first: if a commission with this key already exists,
	// return it as-is without touching the wallet again. This is what makes
	// retries (e.g. from the DSH outbox worker) safe.
	if input.IdempotencyKey != "" {
		existing, err := getCommissionByIdempotencyKeyTx(tx, input.IdempotencyKey)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			if err := tx.Commit(); err != nil {
				return nil, fmt.Errorf("commit tx: %w", err)
			}
			return existing, nil
		}
	}

	commType := input.CommissionType
	amountMinorUnits := input.AmountMinorUnits
	currency := input.Currency
	var commissionPolicyID *string

	isFieldVisit := input.SourceType == "field_visit"

	if isFieldVisit {
		// Field-visit commissions carry NO amount from DSH's outbox event --
		// the amount MUST come from WLT's own policy lookup, never from the
		// caller. Ignore any caller-supplied amount/currency/commissionType.
		policy, err := getActiveCommissionPolicy(tx, "field_visit_fee")
		if err != nil {
			return nil, err
		}
		if policy == nil {
			return nil, ErrNoActiveCommissionPolicy
		}
		if policy.CalculationType != "fixed" {
			return nil, ErrUnsupportedCommissionCalculation
		}
		commType = policy.CommissionType
		amountMinorUnits = policy.AmountMinorUnits
		currency = policy.Currency
		commissionPolicyID = &policy.ID
	} else {
		// Existing checkout-linked / caller-supplied-amount paths, unchanged:
		// no real commission-rate policy exists yet for order/captain
		// commissions, so this remains a known, separately-tracked gap.
		if commType == "" {
			commType = "delivery_fee"
		}
		if input.CheckoutIntentID != "" {
			session, err := reference.GetPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
			if err != nil {
				return nil, err
			}
			if session == nil {
				return nil, fmt.Errorf("no WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
			}
			currency = session.Currency
			if currency == "" {
				currency = "YER"
			}
			amountMinorUnits = session.AmountMinorUnits
		}
		if currency == "" {
			currency = "YER"
		}
	}

	const q = `
		INSERT INTO wlt_commissions
			(beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, visit_id, store_id, commission_policy_id, commission_type, amount_minor_units, currency, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING ` + commissionCols
	row := tx.QueryRow(q, input.BeneficiaryActorID, input.BeneficiaryActorType, input.SourceType, input.SourceID, input.VisitID, input.StoreID, commissionPolicyID, commType, amountMinorUnits, currency, input.IdempotencyKey)
	c, err := scanCommission(row)
	if err != nil {
		return nil, err
	}

	// Only field-visit commissions post to the wallet: their amount is now
	// policy-derived and therefore trustworthy. Checkout-linked commissions
	// still don't touch the wallet -- their amount-derivation is a known,
	// separate gap (see comment above), so posting it to a balance the actor
	// can see would be premature.
	if isFieldVisit {
		if _, err := wallet.EnsureWalletTx(tx, input.BeneficiaryActorType, input.BeneficiaryActorID, currency); err != nil {
			return nil, err
		}
		// The commission row is the workflow source; the wallet projection trigger
		// materializes its pending/earned buckets. The canonical ledger remains the
		// economic source for the resulting wallet balance.
		ledgerLines := []ledger.LedgerLine{
			{AccountType: "platform_commission_receivable", DebitCredit: "debit", AmountMinorUnits: amountMinorUnits, Currency: currency},
			{AccountType: "wallet", ActorType: input.BeneficiaryActorType, ActorID: input.BeneficiaryActorID, DebitCredit: "credit", AmountMinorUnits: amountMinorUnits, Currency: currency},
		}
		if _, err := ledger.PostLedgerTransaction(context.Background(), tx, "commission_earned", "commission", c.ID, ledgerLines, ledger.Actor{ID: "system", Type: "system"}); err != nil {
			return nil, fmt.Errorf("post commission ledger transaction: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return c, nil
}

func ListCommissions(db *sql.DB, sourceID, beneficiaryActorID, beneficiaryActorType string) ([]*Commission, error) {
	var q string
	var args []any
	switch {
	case sourceID != "":
		q = `SELECT ` + commissionCols + ` FROM wlt_commissions WHERE source_id = $1 ORDER BY created_at DESC`
		args = []any{sourceID}
	case beneficiaryActorID != "" && beneficiaryActorType != "":
		q = `SELECT ` + commissionCols + ` FROM wlt_commissions WHERE beneficiary_actor_id = $1 AND beneficiary_actor_type = $2 ORDER BY created_at DESC`
		args = []any{beneficiaryActorID, beneficiaryActorType}
	case beneficiaryActorID != "" || beneficiaryActorType != "":
		return nil, fmt.Errorf("beneficiaryActorId and beneficiaryActorType must be supplied together")
	default:
		return nil, fmt.Errorf("sourceId or beneficiaryActorId+beneficiaryActorType query parameters are required")
	}
	rows, err := db.Query(q, args...)
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

// ErrCommissionNotInExpectedState is returned by the commission lifecycle
// transitions below when the commission's current status is not one of the
// caller's allowed source statuses.
var ErrCommissionNotInExpectedState = errors.New("commission is not in the expected state for this transition")

func getCommissionForUpdateTx(tx *sql.Tx, commissionID string) (*Commission, error) {
	row := tx.QueryRow(`SELECT `+commissionCols+` FROM wlt_commissions WHERE id = $1 FOR UPDATE`, commissionID)
	c, err := scanCommission(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

// ConfirmCommission moves a commission from 'pending' to 'confirmed' -- a
// pure recognition step (no wallet/ledger effect) marking that the
// underlying source event (field visit, order, etc.) has been verified.
func ConfirmCommission(db *sql.DB, commissionID string) (*Commission, error) {
	if commissionID == "" {
		return nil, fmt.Errorf("commissionId is required")
	}
	row := db.QueryRow(`
		UPDATE wlt_commissions SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING `+commissionCols, commissionID)
	c, err := scanCommission(row)
	if errors.Is(err, sql.ErrNoRows) {
		existing, getErr := GetCommission(db, commissionID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrCommissionNotInExpectedState
	}
	return c, err
}

// SettleCommission moves a confirmed commission to 'settled', reclassifying
// the beneficiary's own wallet balance from pending to available (no
// cross-account ledger transaction is posted here: this is a wallet-internal
// bucket reclassification, not money moving between accounts -- the original
// earn was already journaled in CreateCommission).
func SettleCommission(db *sql.DB, commissionID string) (*Commission, error) {
	if commissionID == "" {
		return nil, fmt.Errorf("commissionId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	c, err := getCommissionForUpdateTx(tx, commissionID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}
	if c.Status != "confirmed" {
		return nil, ErrCommissionNotInExpectedState
	}

	row := tx.QueryRow(`
		UPDATE wlt_commissions SET status = 'settled', settled_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'confirmed'
		RETURNING `+commissionCols, commissionID)
	updated, err := scanCommission(row)
	if err != nil {
		return nil, err
	}
	return updated, tx.Commit()
}

// RejectCommission moves a 'pending' commission to 'rejected', reversing any
// wallet/ledger effect from its original posting -- only field-visit
// commissions (the only source type that currently posts to the wallet in
// CreateCommission) have anything to reverse; checkout-linked commissions
// with no wallet effect simply flip status.
func RejectCommission(db *sql.DB, commissionID, note string) (*Commission, error) {
	if commissionID == "" {
		return nil, fmt.Errorf("commissionId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	c, err := getCommissionForUpdateTx(tx, commissionID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}
	if c.Status != "pending" {
		return nil, ErrCommissionNotInExpectedState
	}

	if c.SourceType == "field_visit" {
		ledgerLines := []ledger.LedgerLine{
			{AccountType: "wallet", ActorType: c.BeneficiaryActorType, ActorID: c.BeneficiaryActorID, DebitCredit: "debit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
			{AccountType: "platform_commission_receivable", DebitCredit: "credit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(context.Background(), tx, "commission_rejected", "commission", c.ID, ledgerLines, ledger.Actor{ID: "system", Type: "system"}); err != nil {
			return nil, fmt.Errorf("post commission reversal ledger transaction: %w", err)
		}
	}

	row := tx.QueryRow(`
		UPDATE wlt_commissions SET status = 'rejected', rejected_at = NOW(), resolution_note = $2, updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING `+commissionCols, commissionID, note)
	updated, err := scanCommission(row)
	if err != nil {
		return nil, err
	}
	return updated, tx.Commit()
}

// ReverseCommission moves a 'settled' commission to 'reversed' -- e.g. a
// commission discovered to be fraudulent or erroneous after settlement.
// Reverses the settled wallet effect (available_balance/settled_total) and
// posts a reversing ledger transaction.
func ReverseCommission(db *sql.DB, commissionID, note string) (*Commission, error) {
	if commissionID == "" {
		return nil, fmt.Errorf("commissionId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	c, err := getCommissionForUpdateTx(tx, commissionID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}
	if c.Status != "settled" {
		return nil, ErrCommissionNotInExpectedState
	}

	ledgerLines := []ledger.LedgerLine{
		{AccountType: "wallet", ActorType: c.BeneficiaryActorType, ActorID: c.BeneficiaryActorID, DebitCredit: "debit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
		{AccountType: "platform_commission_receivable", DebitCredit: "credit", AmountMinorUnits: c.AmountMinorUnits, Currency: c.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(context.Background(), tx, "commission_reversed", "commission", c.ID, ledgerLines, ledger.Actor{ID: "system", Type: "system"}); err != nil {
		return nil, fmt.Errorf("post commission reversal ledger transaction: %w", err)
	}

	row := tx.QueryRow(`
		UPDATE wlt_commissions SET status = 'reversed', reversed_at = NOW(), resolution_note = $2, updated_at = NOW()
		WHERE id = $1 AND status = 'settled'
		RETURNING `+commissionCols, commissionID, note)
	updated, err := scanCommission(row)
	if err != nil {
		return nil, err
	}
	return updated, tx.Commit()
}

func GetCommission(db *sql.DB, commissionID string) (*Commission, error) {
	if commissionID == "" {
		return nil, fmt.Errorf("commissionId is required")
	}
	row := db.QueryRow(`SELECT `+commissionCols+` FROM wlt_commissions WHERE id = $1`, commissionID)
	c, err := scanCommission(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

// HTTP handlers

// requireDshServiceCaller enforces that only the DSH service -- never an
// end-user actor -- may create commission mutation records.
func requireDshServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh")
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
		if errors.Is(err, ErrNoActiveCommissionPolicy) {
			shared.SendError(w, http.StatusServiceUnavailable, "NO_ACTIVE_COMMISSION_POLICY", "no active commission policy is configured for this commission type")
			return
		}
		if errors.Is(err, ErrUnsupportedCommissionCalculation) {
			shared.SendError(w, http.StatusServiceUnavailable, "UNSUPPORTED_COMMISSION_CALCULATION", "the active commission policy uses a calculation type that is not yet supported")
			return
		}
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
		commissions, err := ListCommissions(db, q.Get("sourceId"), q.Get("beneficiaryActorId"), q.Get("beneficiaryActorType"))
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

func decodeCommissionResolutionNote(w http.ResponseWriter, r *http.Request) string {
	var body struct {
		Note string `json:"resolutionNote"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4*1024)).Decode(&body)
	return body.Note
}
