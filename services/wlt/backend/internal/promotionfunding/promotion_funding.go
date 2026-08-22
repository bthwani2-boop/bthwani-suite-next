package promotionfunding

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var (
	ErrInvalid                 = errors.New("invalid promotion funding input")
	ErrNotFound                = errors.New("promotion funding reservation not found")
	ErrConflict                = errors.New("promotion funding conflict")
	ErrInvalidTransition       = errors.New("invalid promotion funding transition")
	ErrOperatorContextMismatch = errors.New("promotion funding OperatorContext mismatch")
)

type Reservation struct {
	ID                          string  `json:"id"`
	OperatorContextID           string  `json:"operatorContextId"`
	ExternalReference           string  `json:"externalReference"`
	CheckoutIntentID            string  `json:"checkoutIntentId"`
	CouponRedemptionID          string  `json:"couponRedemptionId"`
	CouponID                    string  `json:"couponId"`
	ClientID                    string  `json:"clientId"`
	PartnerID                   *string `json:"partnerId,omitempty"`
	PlatformFundedMinorUnits    int64   `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits     int64   `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits     int64   `json:"totalDiscountMinorUnits"`
	Currency                    string  `json:"currency"`
	Status                      string  `json:"status"`
	OrderID                     *string `json:"orderId,omitempty"`
	IdempotencyKey              string  `json:"idempotencyKey"`
	CorrelationID               string  `json:"correlationId"`
	CommitLedgerTransactionID   *string `json:"commitLedgerTransactionId,omitempty"`
	ReversalLedgerTransactionID *string `json:"reversalLedgerTransactionId,omitempty"`
	CommittedAt                 *string `json:"committedAt,omitempty"`
	ReleasedAt                  *string `json:"releasedAt,omitempty"`
	ReversedAt                  *string `json:"reversedAt,omitempty"`
	ReleaseReason               string  `json:"releaseReason"`
	ReversalReason              string  `json:"reversalReason"`
	CreatedAt                   string  `json:"createdAt"`
	UpdatedAt                   string  `json:"updatedAt"`
}

const reservationColumns = `id,operator_context_id,external_reference,checkout_intent_id,
	coupon_redemption_id,coupon_id,client_id,partner_id,
	platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,
	currency,status,order_id,idempotency_key,correlation_id,
	commit_ledger_transaction_id,reversal_ledger_transaction_id,
	committed_at::TEXT,released_at::TEXT,reversed_at::TEXT,
	release_reason,reversal_reason,created_at::TEXT,updated_at::TEXT`

func scanReservation(row interface{ Scan(dest ...any) error }) (*Reservation, error) {
	var reservation Reservation
	var partnerID, orderID, commitLedgerTransactionID, reversalLedgerTransactionID, committedAt, releasedAt, reversedAt sql.NullString
	err := row.Scan(
		&reservation.ID,
		&reservation.OperatorContextID,
		&reservation.ExternalReference,
		&reservation.CheckoutIntentID,
		&reservation.CouponRedemptionID,
		&reservation.CouponID,
		&reservation.ClientID,
		&partnerID,
		&reservation.PlatformFundedMinorUnits,
		&reservation.PartnerFundedMinorUnits,
		&reservation.TotalDiscountMinorUnits,
		&reservation.Currency,
		&reservation.Status,
		&orderID,
		&reservation.IdempotencyKey,
		&reservation.CorrelationID,
		&commitLedgerTransactionID,
		&reversalLedgerTransactionID,
		&committedAt,
		&releasedAt,
		&reversedAt,
		&reservation.ReleaseReason,
		&reservation.ReversalReason,
		&reservation.CreatedAt,
		&reservation.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if partnerID.Valid {
		reservation.PartnerID = &partnerID.String
	}
	if orderID.Valid {
		reservation.OrderID = &orderID.String
	}
	if commitLedgerTransactionID.Valid {
		reservation.CommitLedgerTransactionID = &commitLedgerTransactionID.String
	}
	if reversalLedgerTransactionID.Valid {
		reservation.ReversalLedgerTransactionID = &reversalLedgerTransactionID.String
	}
	if committedAt.Valid {
		reservation.CommittedAt = &committedAt.String
	}
	if releasedAt.Valid {
		reservation.ReleasedAt = &releasedAt.String
	}
	if reversedAt.Valid {
		reservation.ReversedAt = &reversedAt.String
	}
	return &reservation, nil
}

type ReserveInput struct {
	OperatorContextID        string `json:"operatorContextId"`
	ExternalReference        string `json:"externalReference"`
	CheckoutIntentID         string `json:"checkoutIntentId"`
	CouponRedemptionID       string `json:"couponRedemptionId"`
	CouponID                 string `json:"couponId"`
	ClientID                 string `json:"clientId"`
	PartnerID                string `json:"partnerId"`
	PlatformFundedMinorUnits int64  `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits  int64  `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits  int64  `json:"totalDiscountMinorUnits"`
	Currency                 string `json:"currency"`
	IdempotencyKey           string `json:"-"`
	CorrelationID            string `json:"-"`
}

func normalizeReserve(input ReserveInput) ReserveInput {
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.ExternalReference = strings.TrimSpace(input.ExternalReference)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.CouponRedemptionID = strings.TrimSpace(input.CouponRedemptionID)
	input.CouponID = strings.TrimSpace(input.CouponID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.Currency == "" {
		input.Currency = "YER"
	}
	return input
}

func validateReserve(input ReserveInput) error {
	if input.OperatorContextID == "" || input.ExternalReference == "" || input.CheckoutIntentID == "" ||
		input.CouponRedemptionID == "" || input.CouponID == "" || input.ClientID == "" ||
		input.TotalDiscountMinorUnits <= 0 || input.PlatformFundedMinorUnits < 0 ||
		input.PartnerFundedMinorUnits < 0 || input.IdempotencyKey == "" || input.CorrelationID == "" {
		return ErrInvalid
	}
	if input.PlatformFundedMinorUnits+input.PartnerFundedMinorUnits != input.TotalDiscountMinorUnits {
		return ErrInvalid
	}
	if input.PartnerFundedMinorUnits > 0 && input.PartnerID == "" {
		return ErrInvalid
	}
	if input.PartnerFundedMinorUnits == 0 && input.PartnerID != "" {
		return ErrInvalid
	}
	return nil
}

func sameReserve(existing *Reservation, input ReserveInput) bool {
	partnerID := ""
	if existing.PartnerID != nil {
		partnerID = *existing.PartnerID
	}
	return existing.OperatorContextID == input.OperatorContextID &&
		existing.ExternalReference == input.ExternalReference &&
		existing.CheckoutIntentID == input.CheckoutIntentID &&
		existing.CouponRedemptionID == input.CouponRedemptionID &&
		existing.CouponID == input.CouponID &&
		existing.ClientID == input.ClientID &&
		partnerID == input.PartnerID &&
		existing.PlatformFundedMinorUnits == input.PlatformFundedMinorUnits &&
		existing.PartnerFundedMinorUnits == input.PartnerFundedMinorUnits &&
		existing.TotalDiscountMinorUnits == input.TotalDiscountMinorUnits &&
		existing.Currency == input.Currency
}

func getByIdempotency(ctx context.Context, db *sql.DB, operatorContextID, key string) (*Reservation, error) {
	reservation, err := scanReservation(db.QueryRowContext(ctx, `SELECT `+reservationColumns+`
		FROM wlt_promotion_funding_reservations
		WHERE operator_context_id=$1 AND idempotency_key=$2`, operatorContextID, key))
	if errors.Is(err, ErrNotFound) {
		return nil, nil
	}
	return reservation, err
}

func Reserve(ctx context.Context, db *sql.DB, input ReserveInput) (*Reservation, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	input = normalizeReserve(input)
	if err := validateReserve(input); err != nil {
		return nil, err
	}
	if existing, err := getByIdempotency(ctx, db, input.OperatorContextID, input.IdempotencyKey); err != nil {
		return nil, err
	} else if existing != nil {
		if !sameReserve(existing, input) {
			return nil, ErrConflict
		}
		return existing, nil
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	reservation, err := scanReservation(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_promotion_funding_reservations
			(operator_context_id,external_reference,checkout_intent_id,coupon_redemption_id,
			 coupon_id,client_id,partner_id,platform_funded_minor_units,
			 partner_funded_minor_units,total_discount_minor_units,currency,
			 status,idempotency_key,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,$9,$10,$11,'reserved',$12,$13)
		RETURNING `+reservationColumns,
		input.OperatorContextID,
		input.ExternalReference,
		input.CheckoutIntentID,
		input.CouponRedemptionID,
		input.CouponID,
		input.ClientID,
		input.PartnerID,
		input.PlatformFundedMinorUnits,
		input.PartnerFundedMinorUnits,
		input.TotalDiscountMinorUnits,
		input.Currency,
		input.IdempotencyKey,
		input.CorrelationID,
	))
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_promotion_funding_events
		(reservation_id,event_type,from_status,to_status,idempotency_key,correlation_id)
		VALUES ($1,'reserved',NULL,'reserved',$2,$3)`,
		reservation.ID,
		"funding-event:reserve:"+input.IdempotencyKey,
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return reservation, nil
}

func Get(ctx context.Context, db *sql.DB, operatorContextID, reservationID string) (*Reservation, error) {
	if db == nil || strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(reservationID) == "" {
		return nil, ErrInvalid
	}
	return scanReservation(db.QueryRowContext(ctx, `SELECT `+reservationColumns+`
		FROM wlt_promotion_funding_reservations WHERE id=$1 AND operator_context_id=$2`,
		strings.TrimSpace(reservationID), strings.TrimSpace(operatorContextID)))
}

type TransitionInput struct {
	OperatorContextID string `json:"operatorContextId"`
	OrderID           string `json:"orderId"`
	Reason            string `json:"reason"`
	IdempotencyKey    string `json:"-"`
	CorrelationID     string `json:"-"`
}

func completedTransitionMatches(current *Reservation, target string, input TransitionInput) bool {
	if current == nil || current.Status != target {
		return false
	}
	switch target {
	case "committed":
		return current.OrderID != nil && *current.OrderID == input.OrderID && current.CommitLedgerTransactionID != nil
	case "released":
		return current.ReleaseReason == input.Reason
	case "reversed":
		return current.OrderID != nil && *current.OrderID == input.OrderID && current.ReversalReason == input.Reason && current.CommitLedgerTransactionID != nil && current.ReversalLedgerTransactionID != nil
	default:
		return false
	}
}

func promotionCommitLedgerLines(reservation *Reservation) ([]ledger.LedgerLine, error) {
	if reservation == nil || reservation.TotalDiscountMinorUnits <= 0 || reservation.PlatformFundedMinorUnits < 0 || reservation.PartnerFundedMinorUnits < 0 || reservation.PlatformFundedMinorUnits+reservation.PartnerFundedMinorUnits != reservation.TotalDiscountMinorUnits {
		return nil, ErrInvalid
	}
	lines := make([]ledger.LedgerLine, 0, 3)
	if reservation.PlatformFundedMinorUnits > 0 {
		lines = append(lines, ledger.LedgerLine{AccountType: "promotion_funding_expense", DebitCredit: "debit", AmountMinorUnits: reservation.PlatformFundedMinorUnits, Currency: reservation.Currency})
	}
	if reservation.PartnerFundedMinorUnits > 0 {
		if reservation.PartnerID == nil || strings.TrimSpace(*reservation.PartnerID) == "" {
			return nil, ErrInvalid
		}
		lines = append(lines, ledger.LedgerLine{AccountType: "partner_promotion_receivable", DebitCredit: "debit", AmountMinorUnits: reservation.PartnerFundedMinorUnits, Currency: reservation.Currency})
	}
	lines = append(lines, ledger.LedgerLine{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: reservation.TotalDiscountMinorUnits, Currency: reservation.Currency})
	return lines, nil
}

func promotionReversalLedgerLines(reservation *Reservation) ([]ledger.LedgerLine, error) {
	commitLines, err := promotionCommitLedgerLines(reservation)
	if err != nil {
		return nil, err
	}
	for index := range commitLines {
		if commitLines[index].DebitCredit == "debit" {
			commitLines[index].DebitCredit = "credit"
		} else {
			commitLines[index].DebitCredit = "debit"
		}
	}
	return commitLines, nil
}

func transition(ctx context.Context, db *sql.DB, reservationID, target string, input TransitionInput) (*Reservation, error) {
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	reservationID = strings.TrimSpace(reservationID)
	if db == nil || reservationID == "" || input.OperatorContextID == "" || input.IdempotencyKey == "" || input.CorrelationID == "" {
		return nil, ErrInvalid
	}
	if target == "committed" && input.OrderID == "" {
		return nil, ErrInvalid
	}
	if target == "reversed" && (input.OrderID == "" || input.Reason == "") {
		return nil, ErrInvalid
	}
	if target == "released" && input.Reason == "" {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	current, err := scanReservation(tx.QueryRowContext(ctx, `SELECT `+reservationColumns+`
		FROM wlt_promotion_funding_reservations WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`,
		reservationID, input.OperatorContextID))
	if err != nil {
		return nil, err
	}
	if current.Status == target {
		if !completedTransitionMatches(current, target, input) {
			return nil, ErrConflict
		}
		return current, tx.Commit()
	}
	allowed := (current.Status == "reserved" && (target == "committed" || target == "released")) ||
		(current.Status == "committed" && target == "reversed")
	if !allowed {
		return nil, ErrInvalidTransition
	}

	postCtx := shared.WithOperatorContext(ctx, input.OperatorContextID)
	var updated *Reservation
	var ledgerTransactionID string
	switch target {
	case "committed":
		lines, linesErr := promotionCommitLedgerLines(current)
		if linesErr != nil {
			return nil, linesErr
		}
		ledgerTransactionID, err = ledger.PostLedgerTransaction(postCtx, tx, "promotion_funding_committed", "promotion_funding_reservation", current.ID, lines, ledger.Actor{ID: "dsh", Type: "service"})
		if err != nil {
			return nil, fmt.Errorf("post promotion funding commitment: %w", err)
		}
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='committed',order_id=$3,commit_ledger_transaction_id=$4,committed_at=NOW(),updated_at=NOW()
			WHERE id=$1 AND operator_context_id=$2 AND status='reserved'
			RETURNING `+reservationColumns, reservationID, input.OperatorContextID, input.OrderID, ledgerTransactionID))
	case "released":
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='released',released_at=NOW(),release_reason=$3,updated_at=NOW()
			WHERE id=$1 AND operator_context_id=$2 AND status='reserved'
			RETURNING `+reservationColumns, reservationID, input.OperatorContextID, input.Reason))
	case "reversed":
		if current.OrderID == nil || *current.OrderID != input.OrderID {
			return nil, ErrConflict
		}
		if current.CommitLedgerTransactionID == nil || strings.TrimSpace(*current.CommitLedgerTransactionID) == "" {
			return nil, ErrConflict
		}
		lines, linesErr := promotionReversalLedgerLines(current)
		if linesErr != nil {
			return nil, linesErr
		}
		ledgerTransactionID, err = ledger.PostLedgerTransaction(postCtx, tx, "promotion_funding_reversed", "promotion_funding_commit", *current.CommitLedgerTransactionID, lines, ledger.Actor{ID: "dsh", Type: "service"})
		if err != nil {
			return nil, fmt.Errorf("post promotion funding reversal: %w", err)
		}
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='reversed',reversed_at=NOW(),reversal_reason=$3,reversal_ledger_transaction_id=$4,updated_at=NOW()
			WHERE id=$1 AND operator_context_id=$2 AND status='committed'
			RETURNING `+reservationColumns, reservationID, input.OperatorContextID, input.Reason, ledgerTransactionID))
	default:
		return nil, ErrInvalid
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_promotion_funding_events
		(reservation_id,event_type,from_status,to_status,order_id,idempotency_key,correlation_id,reason)
		VALUES ($1,$2,$3,$2,NULLIF($4,''),$5,$6,$7)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		reservationID,
		target,
		current.Status,
		input.OrderID,
		input.IdempotencyKey,
		input.CorrelationID,
		input.Reason,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func Commit(ctx context.Context, db *sql.DB, reservationID string, input TransitionInput) (*Reservation, error) {
	return transition(ctx, db, reservationID, "committed", input)
}

func Release(ctx context.Context, db *sql.DB, reservationID string, input TransitionInput) (*Reservation, error) {
	return transition(ctx, db, reservationID, "released", input)
}

func Reverse(ctx context.Context, db *sql.DB, reservationID string, input TransitionInput) (*Reservation, error) {
	return transition(ctx, db, reservationID, "reversed", input)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

// resolveTrustedOperatorContext returns the financial scope from the
// authenticated service boundary, never from the request body.
//
// This previously returned the payload value as authoritative and only
// cross-checked the X-Delegated-Operator-Context header when that header happened to
// be present, so any caller who could reach the route could name the operator
// context whose promotion budget it spent. A payload value is now accepted
// only as a redundant assertion that must match the trusted scope.
func resolveTrustedOperatorContext(w http.ResponseWriter, r *http.Request, payloadOperatorContextID string) (string, bool) {
	trustedOperatorContextID, err := shared.RequireOperatorContext(r.Context())
	if err != nil {
		shared.SendError(w, http.StatusForbidden, "FINANCIAL_SCOPE_REQUIRED", err.Error())
		return "", false
	}
	if asserted := strings.TrimSpace(payloadOperatorContextID); asserted != "" && asserted != trustedOperatorContextID {
		shared.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_MISMATCH", ErrOperatorContextMismatch.Error())
		return "", false
	}
	return trustedOperatorContextID, true
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		shared.SendError(w, http.StatusBadRequest, "INVALID_PROMOTION_FUNDING", err.Error())
	case errors.Is(err, ErrNotFound):
		shared.SendError(w, http.StatusNotFound, "PROMOTION_FUNDING_NOT_FOUND", err.Error())
	case errors.Is(err, ErrConflict):
		shared.SendError(w, http.StatusConflict, "PROMOTION_FUNDING_CONFLICT", err.Error())
	case errors.Is(err, ErrInvalidTransition):
		shared.SendError(w, http.StatusConflict, "INVALID_PROMOTION_FUNDING_TRANSITION", err.Error())
	default:
		shared.SendError(w, http.StatusInternalServerError, "PROMOTION_FUNDING_FAILED", "promotion funding operation failed")
	}
}

func HandleReserve(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ReserveInput
		if !decodeJSON(w, r, &input) {
			return
		}
		trustedOperatorContextID, ok := resolveTrustedOperatorContext(w, r, input.OperatorContextID)
		if !ok {
			return
		}
		input.OperatorContextID = trustedOperatorContextID
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		reservation, err := Reserve(r.Context(), db, input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"reservation": reservation})
	}
}

func HandleGet(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := resolveTrustedOperatorContext(w, r, "")
		if !ok {
			return
		}
		reservation, err := Get(r.Context(), db, operatorContextID, r.PathValue("reservationId"))
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reservation": reservation})
	}
}

func transitionHandler(db *sql.DB, target string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input TransitionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		trustedOperatorContextID, ok := resolveTrustedOperatorContext(w, r, input.OperatorContextID)
		if !ok {
			return
		}
		input.OperatorContextID = trustedOperatorContextID
		input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		input.CorrelationID = strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		var reservation *Reservation
		var err error
		switch target {
		case "committed":
			reservation, err = Commit(r.Context(), db, r.PathValue("reservationId"), input)
		case "released":
			reservation, err = Release(r.Context(), db, r.PathValue("reservationId"), input)
		case "reversed":
			reservation, err = Reverse(r.Context(), db, r.PathValue("reservationId"), input)
		default:
			err = fmt.Errorf("%w: unsupported transition", ErrInvalid)
		}
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reservation": reservation})
	}
}

func HandleCommit(db *sql.DB) http.HandlerFunc  { return transitionHandler(db, "committed") }
func HandleRelease(db *sql.DB) http.HandlerFunc { return transitionHandler(db, "released") }
func HandleReverse(db *sql.DB) http.HandlerFunc { return transitionHandler(db, "reversed") }

var _ = time.Now
