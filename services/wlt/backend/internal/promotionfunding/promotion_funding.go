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

	"wlt-api/internal/shared"
)

var (
	ErrInvalid           = errors.New("invalid promotion funding input")
	ErrNotFound          = errors.New("promotion funding reservation not found")
	ErrConflict          = errors.New("promotion funding conflict")
	ErrInvalidTransition = errors.New("invalid promotion funding transition")
	ErrTenantMismatch    = errors.New("promotion funding tenant mismatch")
)

type Reservation struct {
	ID                       string  `json:"id"`
	TenantID                 string  `json:"tenantId"`
	ExternalReference        string  `json:"externalReference"`
	CheckoutIntentID         string  `json:"checkoutIntentId"`
	CouponRedemptionID       string  `json:"couponRedemptionId"`
	CouponID                 string  `json:"couponId"`
	ClientID                 string  `json:"clientId"`
	PartnerID                *string `json:"partnerId,omitempty"`
	PlatformFundedMinorUnits int64   `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits  int64   `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits  int64   `json:"totalDiscountMinorUnits"`
	Currency                 string  `json:"currency"`
	Status                   string  `json:"status"`
	OrderID                  *string `json:"orderId,omitempty"`
	IdempotencyKey           string  `json:"idempotencyKey"`
	CorrelationID            string  `json:"correlationId"`
	CommittedAt              *string `json:"committedAt,omitempty"`
	ReleasedAt               *string `json:"releasedAt,omitempty"`
	ReversedAt               *string `json:"reversedAt,omitempty"`
	ReleaseReason            string  `json:"releaseReason"`
	ReversalReason           string  `json:"reversalReason"`
	CreatedAt                string  `json:"createdAt"`
	UpdatedAt                string  `json:"updatedAt"`
}

const reservationColumns = `id,tenant_id,external_reference,checkout_intent_id,
	coupon_redemption_id,coupon_id,client_id,partner_id,
	platform_funded_minor_units,partner_funded_minor_units,total_discount_minor_units,
	currency,status,order_id,idempotency_key,correlation_id,
	committed_at::TEXT,released_at::TEXT,reversed_at::TEXT,
	release_reason,reversal_reason,created_at::TEXT,updated_at::TEXT`

func scanReservation(row interface{ Scan(dest ...any) error }) (*Reservation, error) {
	var reservation Reservation
	var partnerID, orderID, committedAt, releasedAt, reversedAt sql.NullString
	err := row.Scan(
		&reservation.ID,
		&reservation.TenantID,
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
	TenantID                 string `json:"tenantId"`
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
	input.TenantID = strings.TrimSpace(input.TenantID)
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
	if input.TenantID == "" || input.ExternalReference == "" || input.CheckoutIntentID == "" ||
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
	return existing.TenantID == input.TenantID &&
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

func getByIdempotency(ctx context.Context, db *sql.DB, tenantID, key string) (*Reservation, error) {
	reservation, err := scanReservation(db.QueryRowContext(ctx, `SELECT `+reservationColumns+`
		FROM wlt_promotion_funding_reservations
		WHERE tenant_id=$1 AND idempotency_key=$2`, tenantID, key))
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
	if existing, err := getByIdempotency(ctx, db, input.TenantID, input.IdempotencyKey); err != nil {
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
			(tenant_id,external_reference,checkout_intent_id,coupon_redemption_id,
			 coupon_id,client_id,partner_id,platform_funded_minor_units,
			 partner_funded_minor_units,total_discount_minor_units,currency,
			 status,idempotency_key,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,$9,$10,$11,'reserved',$12,$13)
		RETURNING `+reservationColumns,
		input.TenantID,
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

func Get(ctx context.Context, db *sql.DB, tenantID, reservationID string) (*Reservation, error) {
	if db == nil || strings.TrimSpace(tenantID) == "" || strings.TrimSpace(reservationID) == "" {
		return nil, ErrInvalid
	}
	return scanReservation(db.QueryRowContext(ctx, `SELECT `+reservationColumns+`
		FROM wlt_promotion_funding_reservations WHERE id=$1 AND tenant_id=$2`,
		strings.TrimSpace(reservationID), strings.TrimSpace(tenantID)))
}

type TransitionInput struct {
	TenantID       string `json:"tenantId"`
	OrderID        string `json:"orderId"`
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"-"`
	CorrelationID  string `json:"-"`
}

func transition(ctx context.Context, db *sql.DB, reservationID, target string, input TransitionInput) (*Reservation, error) {
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	reservationID = strings.TrimSpace(reservationID)
	if db == nil || reservationID == "" || input.TenantID == "" || input.IdempotencyKey == "" || input.CorrelationID == "" {
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
		FROM wlt_promotion_funding_reservations WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
		reservationID, input.TenantID))
	if err != nil {
		return nil, err
	}
	if current.Status == target {
		return current, tx.Commit()
	}
	allowed := (current.Status == "reserved" && (target == "committed" || target == "released")) ||
		(current.Status == "committed" && target == "reversed")
	if !allowed {
		return nil, ErrInvalidTransition
	}

	var updated *Reservation
	switch target {
	case "committed":
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='committed',order_id=$3,committed_at=NOW(),updated_at=NOW()
			WHERE id=$1 AND tenant_id=$2 AND status='reserved'
			RETURNING `+reservationColumns, reservationID, input.TenantID, input.OrderID))
	case "released":
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='released',released_at=NOW(),release_reason=$3,updated_at=NOW()
			WHERE id=$1 AND tenant_id=$2 AND status='reserved'
			RETURNING `+reservationColumns, reservationID, input.TenantID, input.Reason))
	case "reversed":
		if current.OrderID == nil || *current.OrderID != input.OrderID {
			return nil, ErrConflict
		}
		updated, err = scanReservation(tx.QueryRowContext(ctx, `UPDATE wlt_promotion_funding_reservations
			SET status='reversed',reversed_at=NOW(),reversal_reason=$3,updated_at=NOW()
			WHERE id=$1 AND tenant_id=$2 AND status='committed'
			RETURNING `+reservationColumns, reservationID, input.TenantID, input.Reason))
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

func tenantAssertion(w http.ResponseWriter, r *http.Request, payloadTenantID string) (string, bool) {
	payloadTenantID = strings.TrimSpace(payloadTenantID)
	assertedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if payloadTenantID == "" {
		shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "tenantId is required")
		return "", false
	}
	if assertedTenantID != "" && assertedTenantID != payloadTenantID {
		shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", ErrTenantMismatch.Error())
		return "", false
	}
	return payloadTenantID, true
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
		if _, ok := tenantAssertion(w, r, input.TenantID); !ok {
			return
		}
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
		tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		reservation, err := Get(r.Context(), db, tenantID, r.PathValue("reservationId"))
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
		if _, ok := tenantAssertion(w, r, input.TenantID); !ok {
			return
		}
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
