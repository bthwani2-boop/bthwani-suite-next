package cod

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// ErrInsufficientCodCapacity is returned when a captain's wallet does not
// have enough available_balance_minor_units to cover a new COD reservation.
// This is the fail-closed guard that makes overcommitment impossible: the
// reservation and the wallet debit happen in one transaction, so a race
// between two concurrent reservation attempts can never both succeed against
// the same available balance.
var ErrInsufficientCodCapacity = errors.New("captain wallet does not have sufficient available balance for this COD reservation")

// ErrCodReservationConflict is returned when a reservation already exists for
// (operatorContextId, orderId) with different captain/amount/currency than
// the caller supplied -- a genuine conflicting claim, not a replay.
var ErrCodReservationConflict = errors.New("existing COD reservation does not match the requested captain/amount/currency")

// ErrCodReservationNotReserved is returned when release is attempted on a
// reservation that is not currently in the 'reserved' state (already
// released, already finalized, or never existed).
var ErrCodReservationNotReserved = errors.New("COD reservation is not in a releasable state")

type CodReservation struct {
	ID                string  `json:"id"`
	OperatorContextID string  `json:"operatorContextId"`
	OrderID           string  `json:"orderId"`
	CaptainID         string  `json:"captainId"`
	AmountMinorUnits  int64   `json:"amountMinorUnits"`
	Currency          string  `json:"currency"`
	Status            string  `json:"status"`
	IdempotencyKey    string  `json:"idempotencyKey"`
	ReleaseReason     string  `json:"releaseReason,omitempty"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
	ResolvedAt        *string `json:"resolvedAt,omitempty"`
}

const codReservationCols = `id, operator_context_id, order_id, captain_id, amount_minor_units, currency,
	status, idempotency_key, COALESCE(release_reason,''), created_at, updated_at, resolved_at`

func scanCodReservation(row rowScanner) (*CodReservation, error) {
	var out CodReservation
	var resolvedAt sql.NullTime
	if err := row.Scan(
		&out.ID, &out.OperatorContextID, &out.OrderID, &out.CaptainID, &out.AmountMinorUnits, &out.Currency,
		&out.Status, &out.IdempotencyKey, &out.ReleaseReason, &out.CreatedAt, &out.UpdatedAt, &resolvedAt,
	); err != nil {
		return nil, err
	}
	if resolvedAt.Valid {
		value := resolvedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		out.ResolvedAt = &value
	}
	return &out, nil
}

// ReserveCodCapacity atomically reserves amountMinorUnits of captainId's
// wallet capacity against orderId. A new reservation is inserted first so
// replays can be identified without re-checking a later wallet balance. Only a
// newly-created reservation then locks the captain wallet and checks available
// capacity; the wallet buckets themselves are refreshed by the deferred source
// projection trigger at transaction close.
//
// Idempotent by (operatorContextId, orderId): a replay with the same
// captainId/amount/currency returns the existing reservation without
// re-debiting the wallet; a replay with different values is
// ErrCodReservationConflict.
func ReserveCodCapacity(ctx context.Context, db *sql.DB, orderID, captainID string, amountMinorUnits int64, currency, idempotencyKey string) (*CodReservation, bool, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, false, err
	}
	orderID = strings.TrimSpace(orderID)
	captainID = strings.TrimSpace(captainID)
	currency = strings.TrimSpace(currency)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if orderID == "" || captainID == "" {
		return nil, false, fmt.Errorf("orderId and captainId are required")
	}
	if amountMinorUnits <= 0 {
		return nil, false, fmt.Errorf("amountMinorUnits must be positive")
	}
	if currency == "" {
		return nil, false, fmt.Errorf("currency is required")
	}
	if len(idempotencyKey) < 3 {
		return nil, false, fmt.Errorf("idempotencyKey is required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback() //nolint:errcheck

	created, err := scanCodReservation(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_cod_reservations
			(operator_context_id, order_id, captain_id, amount_minor_units, currency, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (operator_context_id, order_id) DO NOTHING
		RETURNING `+codReservationCols,
		operatorContextID, orderID, captainID, amountMinorUnits, currency, idempotencyKey,
	))
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	if err == nil {
		var availableBalance int64
		if err := tx.QueryRowContext(ctx, `
			SELECT available_balance_minor_units
			FROM wlt_wallets
			WHERE operator_context_id = $1 AND actor_id = $2 AND actor_type = 'captain'
			FOR UPDATE`, operatorContextID, captainID).Scan(&availableBalance); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, false, ErrInsufficientCodCapacity
			}
			return nil, false, fmt.Errorf("load captain wallet for COD reservation: %w", err)
		}
		if availableBalance < amountMinorUnits {
			return nil, false, ErrInsufficientCodCapacity
		}
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return created, false, nil
	}

	// We lost the insert race (or this is a genuine replay): lock and compare
	// the existing row against what the caller asked for.
	existing, err := scanCodReservation(tx.QueryRowContext(ctx, `
		SELECT `+codReservationCols+` FROM wlt_cod_reservations
		WHERE operator_context_id = $1 AND order_id = $2 FOR UPDATE`,
		operatorContextID, orderID,
	))
	if err != nil {
		return nil, false, err
	}
	if existing.CaptainID != captainID || existing.AmountMinorUnits != amountMinorUnits || existing.Currency != currency {
		return nil, false, ErrCodReservationConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return existing, true, nil
}

// ReleaseCodReservation returns a 'reserved' reservation's amount to the
// captain's available balance exactly once (guarded by WHERE status =
// 'reserved'). Calling it again after release is an idempotent no-op that
// returns the already-released reservation rather than erroring, since a
// cancellation racing with a previous release request is a normal replay,
// not a conflict. Calling it on a 'finalized' reservation (delivery already
// remitted) is rejected: the exposure has already been retired through the
// COD collect/remit ledger flow, not returned to available capacity.
func ReleaseCodReservation(ctx context.Context, db *sql.DB, orderID, reason string) (*CodReservation, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	orderID = strings.TrimSpace(orderID)
	reason = strings.TrimSpace(reason)
	if orderID == "" {
		return nil, fmt.Errorf("orderId is required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	current, err := scanCodReservation(tx.QueryRowContext(ctx, `
		SELECT `+codReservationCols+` FROM wlt_cod_reservations
		WHERE operator_context_id = $1 AND order_id = $2 FOR UPDATE`,
		operatorContextID, orderID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if current.Status == "released" {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return current, nil
	}
	if current.Status != "reserved" {
		return nil, ErrCodReservationNotReserved
	}

	released, err := scanCodReservation(tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_reservations
		SET status = 'released', release_reason = $3, resolved_at = NOW(), updated_at = NOW()
		WHERE operator_context_id = $1 AND order_id = $2 AND status = 'reserved'
		RETURNING `+codReservationCols,
		operatorContextID, orderID, reason,
	))
	if err != nil {
		return nil, fmt.Errorf("release COD reservation: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return released, nil
}

// finalizeCodReservationTx retires a 'reserved' reservation exactly once
// (guarded by WHERE status = 'reserved') within an already-open transaction,
// so a caller like MarkCodRemittedSovereign can make "the COD is remitted"
// and "the captain's reserved capacity is retired" one atomic fact. Unlike
// ReleaseCodReservation, the amount is NOT returned to available_balance:
// the cash has already been handled through the COD collect/remit ledger
// entries, so returning it to available capacity here would double-count it.
//
// If no reservation exists for orderId (e.g. a store_courier/partner_store
// collector, or an order that predates wlt-912), this is a no-op returning
// (nil, nil) rather than an error -- reservations are additive capacity
// control for captain-collected COD, not a new precondition for remittance.
func finalizeCodReservationTx(ctx context.Context, tx *sql.Tx, operatorContextID, orderID string) (*CodReservation, error) {
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return nil, nil
	}
	current, err := scanCodReservation(tx.QueryRowContext(ctx, `
		SELECT `+codReservationCols+` FROM wlt_cod_reservations
		WHERE operator_context_id = $1 AND order_id = $2 FOR UPDATE`,
		operatorContextID, orderID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if current.Status != "reserved" {
		// Already finalized (replay) or already released (e.g. an operator
		// manually released it before remittance reached us): nothing to do.
		return current, nil
	}

	finalized, err := scanCodReservation(tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_reservations
		SET status = 'finalized', resolved_at = NOW(), updated_at = NOW()
		WHERE operator_context_id = $1 AND order_id = $2 AND status = 'reserved'
		RETURNING `+codReservationCols,
		operatorContextID, orderID,
	))
	if err != nil {
		return nil, fmt.Errorf("finalize COD reservation: %w", err)
	}

	return finalized, nil
}

func GetCodReservation(ctx context.Context, db *sql.DB, orderID string) (*CodReservation, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return nil, fmt.Errorf("orderId is required")
	}
	row := db.QueryRowContext(ctx, `SELECT `+codReservationCols+` FROM wlt_cod_reservations WHERE operator_context_id=$1 AND order_id=$2`, operatorContextID, orderID)
	reservation, err := scanCodReservation(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return reservation, err
}

func HandleReserveCodCapacity(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OrderID          string `json:"orderId"`
			CaptainID        string `json:"captainId"`
			AmountMinorUnits int64  `json:"amountMinorUnits"`
			Currency         string `json:"currency"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		idempotencyKey := r.Header.Get("Idempotency-Key")
		reservation, replayed, err := ReserveCodCapacity(r.Context(), db, input.OrderID, input.CaptainID, input.AmountMinorUnits, input.Currency, idempotencyKey)
		switch {
		case errors.Is(err, ErrInsufficientCodCapacity):
			shared.SendError(w, http.StatusConflict, "INSUFFICIENT_COD_CAPACITY", err.Error())
			return
		case errors.Is(err, ErrCodReservationConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReservation": reservation, "replayed": replayed})
	}
}

func HandleReleaseCodReservation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OrderID string `json:"orderId"`
			Reason  string `json:"reason"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		reservation, err := ReleaseCodReservation(r.Context(), db, input.OrderID, input.Reason)
		if errors.Is(err, ErrCodReservationNotReserved) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if reservation == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD reservation not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReservation": reservation})
	}
}

func HandleGetCodReservation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reservation, err := GetCodReservation(r.Context(), db, r.PathValue("orderId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if reservation == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD reservation not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReservation": reservation})
	}
}

func FinalizeCodReservation(ctx context.Context, db *sql.DB, orderID string) (*CodReservation, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return nil, fmt.Errorf("orderId is required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	finalized, err := finalizeCodReservationTx(ctx, tx, operatorContextID, orderID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return finalized, nil
}

func HandleFinalizeCodReservation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OrderID string `json:"orderId"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		reservation, err := FinalizeCodReservation(r.Context(), db, input.OrderID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if reservation == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD reservation not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReservation": reservation})
	}
}
